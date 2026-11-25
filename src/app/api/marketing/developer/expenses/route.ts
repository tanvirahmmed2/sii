import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { generateToken } from 'src/lib/utils/random';

const PERMISSIONS = ['expenses', 'payroll', 'cashflow'];

export async function GET(request: any) {
  try {
    const auth = await hasModulePermission(request, PERMISSIONS);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const currency = searchParams.get('currency');
    const month = searchParams.get('month');

    let query = `
      SELECT e.*,
             COALESCE((SELECT SUM(et.amount) FROM expense_transactions et WHERE et.expense_id = e.id), 0) AS paid_amount,
             d.name AS developer_name,
             cb.name AS created_by_name
      FROM expenses e
      LEFT JOIN developers d ON e.developer_id = d.id
      LEFT JOIN developers cb ON e.created_by_developer_id = cb.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (category && category !== 'ALL') {
      query += ` AND e.category = $${idx++}`;
      params.push(category);
    }
    if (status && status !== 'ALL') {
      query += ` AND e.status = $${idx++}`;
      params.push(status);
    }
    if (currency && currency !== 'ALL') {
      query += ` AND e.currency = $${idx++}`;
      params.push(currency.toUpperCase());
    }
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      query += ` AND TO_CHAR(e.expense_date, 'YYYY-MM') = $${idx++}`;
      params.push(month);
    }

    query += ` ORDER BY e.expense_date DESC, e.id DESC LIMIT 200`;

    const [expensesRes, txRes, balRes, statsRes] = await Promise.all([
      queryDb(query, params),
      queryDb(`
        SELECT et.*,
               e.title AS expense_title,
               e.expense_code,
               e.category AS expense_category,
               e.payee_name,
               d.name AS paid_by_name
        FROM expense_transactions et
        JOIN expenses e ON et.expense_id = e.id
        LEFT JOIN developers d ON et.paid_by_developer_id = d.id
        ORDER BY et.transaction_date DESC, et.id DESC
        LIMIT 200
      `),
      queryDb(`SELECT * FROM platform_balances ORDER BY currency ASC`),
      queryDb(`
        SELECT 
          COUNT(*)::int AS total_count,
          COALESCE(SUM(amount), 0)::numeric(15,2) AS total_recorded,
          COALESCE(SUM(CASE WHEN category = 'salary' THEN amount ELSE 0 END), 0)::numeric(15,2) AS salary_total,
          COALESCE(SUM(CASE WHEN category != 'salary' THEN amount ELSE 0 END), 0)::numeric(15,2) AS custom_total,
          COALESCE(SUM(CASE WHEN TO_CHAR(expense_date, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM') THEN amount ELSE 0 END), 0)::numeric(15,2) AS current_month_total
        FROM expenses
        WHERE status != 'cancelled'
      `),
    ]);

    const txTotalRes = await queryDb(`SELECT COALESCE(SUM(amount), 0)::numeric(15,2) AS total_paid_out FROM expense_transactions`);

    return NextResponse.json({
      success: true,
      expenses: expensesRes.rows || [],
      transactions: txRes.rows || [],
      balances: balRes.rows || [],
      stats: {
        ...(statsRes.rows[0] || {}),
        total_paid_out: Number(txTotalRes.rows[0]?.total_paid_out || 0),
      },
    });
  } catch (error: any) {
    console.error('Expenses GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: any) {
  try {
    const auth = await hasModulePermission(request, PERMISSIONS, 'create');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const devId = auth.developer?.id || auth.user?.id || null;
    const body = await request.json().catch(() => ({}));

    const title = String(body.title || '').trim();
    const category = String(body.category || 'operational').trim();
    const amount = Number(body.amount || 0);
    const currency = String(body.currency || 'BDT').toUpperCase();
    const expenseDate = body.expense_date || new Date().toISOString().split('T')[0];
    const payeeName = String(body.payee_name || 'Vendor').trim();
    const payeeType = String(body.payee_type || 'vendor').trim();
    const developerId = body.developer_id ? Number(body.developer_id) : null;
    const receiptUrl = body.receipt_url ? String(body.receipt_url).trim() : null;
    const notes = body.notes ? String(body.notes).trim() : null;
    const payImmediately = Boolean(body.pay_immediately);
    const paymentMethod = String(body.payment_method || 'bank_transfer').trim();
    const paymentReference = body.payment_reference ? String(body.payment_reference).trim() : null;

    if (!title || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Title and positive amount are required.' }, { status: 400 });
    }

    const expenseCode = `EXP-${new Date().getFullYear()}-${generateToken(6).toUpperCase()}`;

    await queryDb('BEGIN');
    try {
      const initialStatus = payImmediately ? 'paid' : 'recorded';

      const expRes = await queryDb(`
        INSERT INTO expenses (
          expense_code, title, category, amount, currency, expense_date,
          status, payee_name, payee_type, developer_id, created_by_developer_id,
          receipt_url, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, [
        expenseCode,
        title,
        category,
        amount,
        currency,
        expenseDate,
        initialStatus,
        payeeName,
        payeeType,
        developerId,
        devId,
        receiptUrl,
        notes,
      ]);

      const expense = expRes.rows[0];
      let transactionRecord = null;

      if (payImmediately) {
        const balRes = await queryDb('SELECT available_balance FROM platform_balances WHERE currency = $1 LIMIT 1', [currency]);
        const currentBal = balRes.rows.length > 0 ? Number(balRes.rows[0].available_balance) : 0;
        const newBalance = currentBal - amount;

        await queryDb(`
          INSERT INTO platform_balances (currency, total_revenue, available_balance, pending_balance, total_withdrawn)
          VALUES ($1, 0.00, $2, 0.00, 0.00)
          ON CONFLICT (currency) DO UPDATE 
          SET available_balance = platform_balances.available_balance - $3,
              updated_at = CURRENT_TIMESTAMP
        `, [currency, newBalance, amount]);

        const cfRes = await queryDb(`
          INSERT INTO cashflows (
            title, category, flow_type, amount, currency, balance_after,
            reference_type, reference_id, developer_id, payment_method, metadata
          ) VALUES ($1, 'expense', 'outflow', $2, $3, $4, 'expense', $5, $6, $7, $8)
          RETURNING *
        `, [
          `Expense Payment: ${title} (${expenseCode})`,
          amount,
          currency,
          newBalance,
          expense.id,
          devId,
          paymentMethod,
          JSON.stringify({ expense_code: expenseCode, category, payee_name: payeeName, reference: paymentReference }),
        ]);

        const txNumber = `EXPTXN-${Date.now()}-${Math.floor(100 + Math.random() * 899)}`;
        const txRes = await queryDb(`
          INSERT INTO expense_transactions (
            expense_id, transaction_number, amount, currency, payment_method,
            payment_reference, paid_by_developer_id, cashflow_id, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `, [
          expense.id,
          txNumber,
          amount,
          currency,
          paymentMethod,
          paymentReference || txNumber,
          devId,
          cfRes.rows[0].id,
          notes,
        ]);

        transactionRecord = txRes.rows[0];
      }

      await queryDb('COMMIT');
      return NextResponse.json({
        success: true,
        message: payImmediately ? 'Expense recorded and disbursed successfully.' : 'Expense recorded successfully.',
        expense,
        transaction: transactionRecord,
      }, { status: 201 });
    } catch (err: any) {
      await queryDb('ROLLBACK');
      throw err;
    }
  } catch (error: any) {
    console.error('Expenses POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: any) {
  try {
    const auth = await hasModulePermission(request, PERMISSIONS, 'edit');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const body = await request.json().catch(() => ({}));
    const id = Number(body.id);
    if (!id) {
      return NextResponse.json({ success: false, error: 'Expense ID is required.' }, { status: 400 });
    }

    const existingRes = await queryDb('SELECT * FROM expenses WHERE id = $1 LIMIT 1', [id]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Expense not found.' }, { status: 404 });
    }

    const curr = existingRes.rows[0];
    const title = body.title !== undefined ? String(body.title).trim() : curr.title;
    const category = body.category !== undefined ? String(body.category).trim() : curr.category;
    const amount = body.amount !== undefined ? Number(body.amount) : Number(curr.amount);
    const expenseDate = body.expense_date !== undefined ? body.expense_date : curr.expense_date;
    const payeeName = body.payee_name !== undefined ? String(body.payee_name).trim() : curr.payee_name;
    const status = body.status !== undefined ? String(body.status).trim() : curr.status;
    const notes = body.notes !== undefined ? String(body.notes).trim() : curr.notes;

    const updatedRes = await queryDb(`
      UPDATE expenses
      SET title = $1, category = $2, amount = $3, expense_date = $4,
          payee_name = $5, status = $6, notes = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [title, category, amount, expenseDate, payeeName, status, notes, id]);

    return NextResponse.json({
      success: true,
      message: 'Expense updated successfully.',
      expense: updatedRes.rows[0],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: any) {
  try {
    const auth = await hasModulePermission(request, PERMISSIONS, 'delete');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ success: false, error: 'Expense ID is required.' }, { status: 400 });
    }

    const txCheck = await queryDb('SELECT COUNT(*)::int AS cnt FROM expense_transactions WHERE expense_id = $1', [id]);
    if (txCheck.rows[0].cnt > 0) {
      await queryDb("UPDATE expenses SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);
      return NextResponse.json({
        success: true,
        message: 'Expense marked as cancelled because payment transactions already exist.',
      });
    }

    await queryDb('DELETE FROM expenses WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'Expense deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
