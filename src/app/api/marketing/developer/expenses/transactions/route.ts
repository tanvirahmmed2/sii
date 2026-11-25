import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';

const PERMISSIONS = ['expenses', 'payroll', 'cashflow'];

export async function GET(request: any) {
  try {
    const auth = await hasModulePermission(request, PERMISSIONS);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    const expenseId = searchParams.get('expense_id');

    let query = `
      SELECT et.*,
             e.title AS expense_title,
             e.expense_code,
             e.category AS expense_category,
             e.payee_name,
             d.name AS paid_by_name
      FROM expense_transactions et
      JOIN expenses e ON et.expense_id = e.id
      LEFT JOIN developers d ON et.paid_by_developer_id = d.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (expenseId) {
      query += ` AND et.expense_id = $1`;
      params.push(Number(expenseId));
    }

    query += ` ORDER BY et.transaction_date DESC, et.id DESC LIMIT 200`;
    const res = await queryDb(query, params);

    return NextResponse.json({
      success: true,
      transactions: res.rows || [],
    });
  } catch (error: any) {
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

    const expenseId = Number(body.expense_id);
    const amount = Number(body.amount || 0);
    const paymentMethod = String(body.payment_method || 'bank_transfer').trim();
    const paymentReference = body.payment_reference ? String(body.payment_reference).trim() : null;
    const notes = body.notes ? String(body.notes).trim() : null;

    if (!expenseId || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Expense ID and positive payment amount are required.' }, { status: 400 });
    }

    const expRes = await queryDb('SELECT * FROM expenses WHERE id = $1 LIMIT 1', [expenseId]);
    if (expRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Expense record not found.' }, { status: 404 });
    }

    const expense = expRes.rows[0];
    const currency = (body.currency || expense.currency || 'BDT').toUpperCase();

    await queryDb('BEGIN');
    try {
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
        `Expense Disbursement: ${expense.title} (${expense.expense_code})`,
        amount,
        currency,
        newBalance,
        expense.id,
        devId,
        paymentMethod,
        JSON.stringify({
          expense_code: expense.expense_code,
          category: expense.category,
          payee_name: expense.payee_name,
          reference: paymentReference,
        }),
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

      const paidSumRes = await queryDb('SELECT COALESCE(SUM(amount), 0) AS paid_sum FROM expense_transactions WHERE expense_id = $1', [expense.id]);
      const paidSum = Number(paidSumRes.rows[0]?.paid_sum || 0);
      const newStatus = paidSum >= Number(expense.amount) ? 'paid' : 'partially_paid';

      await queryDb(`
        UPDATE expenses SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2
      `, [newStatus, expense.id]);

      await queryDb('COMMIT');
      return NextResponse.json({
        success: true,
        message: 'Expense transaction recorded and platform balance updated.',
        transaction: txRes.rows[0],
        newStatus,
      }, { status: 201 });
    } catch (err: any) {
      await queryDb('ROLLBACK');
      throw err;
    }
  } catch (error: any) {
    console.error('Expense Transaction POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
