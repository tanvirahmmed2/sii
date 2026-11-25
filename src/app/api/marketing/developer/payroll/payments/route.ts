import { NextResponse } from 'next/server';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { queryDb } from 'src/lib/database/db';
import { generateToken } from 'src/lib/utils/random';

export async function GET(request: any) {
    try {
        const auth = await hasModulePermission(request, 'payroll');
        if (!auth.success) {
            return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
        }
        const { searchParams } = new URL(request.url);
        const payrollId = searchParams.get('payroll_id');
        const developerId = searchParams.get('developer_id');
        const status = searchParams.get('status');
        let query = `
      SELECT 
        pp.id,
        pp.developer_payroll_id,
        pp.payroll_id,
        pp.developer_id,
        pp.amount,
        pp.payment_method,
        pp.transaction_reference,
        pp.payment_date,
        pp.status,
        pp.receipt_url,
        pp.notes,
        pp.created_at,
        p.title AS payroll_title,
        p.pay_period_start,
        p.pay_period_end,
        d.name AS developer_name,
        d.email AS developer_email,
        d.phone AS developer_phone,
        COALESCE(r.name, 'Developer') AS developer_role_name,
        proc.name AS processed_by_name,
        e.expense_code AS linked_expense_code
      FROM payroll_payments pp
      JOIN payrolls p ON pp.payroll_id = p.id
      JOIN developers d ON pp.developer_id = d.id
      LEFT JOIN developer_roles r ON d.role_id = r.id
      LEFT JOIN developers proc ON pp.processed_by_developer_id = proc.id
      LEFT JOIN expenses e ON e.payroll_payment_id = pp.id
      WHERE 1=1
    `;
        const values: any[] = [];
        let idx = 1;
        if (payrollId) {
            query += ` AND pp.payroll_id = $${idx++}`;
            values.push(payrollId);
        }
        if (developerId) {
            query += ` AND pp.developer_id = $${idx++}`;
            values.push(developerId);
        }
        if (status) {
            query += ` AND pp.status = $${idx++}`;
            values.push(status);
        }
        query += ` ORDER BY pp.payment_date DESC, pp.id DESC LIMIT 100`;
        const paymentsRes = await queryDb(query, values);
        const statsRes = await queryDb(`
      SELECT 
        COALESCE(SUM(amount), 0)::numeric(12,2) AS total_disbursed,
        COUNT(DISTINCT developer_id)::int AS paid_developers_count,
        COUNT(*)::int AS total_payment_records
      FROM payroll_payments 
      WHERE status = 'COMPLETED'
    `);
        const pendingAllocationsRes = await queryDb(`
      SELECT 
        dp.id,
        dp.payroll_id,
        dp.developer_id,
        dp.net_salary,
        dp.payment_method,
        p.title AS payroll_title,
        d.name AS developer_name,
        d.email AS developer_email
      FROM developer_payrolls dp
      JOIN payrolls p ON dp.payroll_id = p.id
      JOIN developers d ON dp.developer_id = d.id
      WHERE dp.payment_status != 'PAID'
      ORDER BY p.pay_period_start DESC, d.name ASC
    `);
        return NextResponse.json({
            success: true,
            payments: paymentsRes.rows,
            stats: statsRes.rows[0] || {
                total_disbursed: 0,
                paid_developers_count: 0,
                total_payment_records: 0,
            },
            pendingAllocations: pendingAllocationsRes.rows,
        });
    }
    catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: any) {
    try {
        const auth = await hasModulePermission(request, 'payroll');
        if (!auth.success) {
            return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
        }
        const body = await request.json();
        const { developer_payroll_id, amount, payment_method, transaction_reference, notes, receipt_url } = body;
        if (!developer_payroll_id || amount === undefined || amount === null) {
            return NextResponse.json({ success: false, error: 'Developer Payroll ID and Payment Amount are required.' }, { status: 400 });
        }
        const itemRes = await queryDb(`
          SELECT dp.id, dp.payroll_id, dp.developer_id, dp.net_salary, dp.payment_status,
                 d.name AS developer_name, p.title AS payroll_title
          FROM developer_payrolls dp
          JOIN developers d ON dp.developer_id = d.id
          JOIN payrolls p ON dp.payroll_id = p.id
          WHERE dp.id = $1
        `, [developer_payroll_id]);
        if (itemRes.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Developer payroll allocation record not found.' }, { status: 404 });
        }
        const item = itemRes.rows[0];
        const payAmount = parseFloat(amount) || Number(item.net_salary);
        const currency = 'BDT';
        const method = payment_method || 'BANK_TRANSFER';
        const txnRef = transaction_reference || `PAY-${generateToken(8).toUpperCase()}`;
        const devUserId = auth.staff?.id || auth.developer?.id || auth.user?.id || null;

        await queryDb('BEGIN');
        try {
            const paymentRes = await queryDb(`INSERT INTO payroll_payments 
           (developer_payroll_id, payroll_id, developer_id, amount, payment_method, transaction_reference, status, processed_by_developer_id, receipt_url, notes)
           VALUES ($1, $2, $3, $4, $5, $6, 'COMPLETED', $7, $8, $9)
           RETURNING *`, [
                item.id,
                item.payroll_id,
                item.developer_id,
                payAmount,
                method,
                txnRef,
                devUserId,
                receipt_url || null,
                notes || null,
            ]);

            const payrollPayment = paymentRes.rows[0];

            await queryDb("UPDATE developer_payrolls SET payment_status = 'PAID' WHERE id = $1", [item.id]);
            const unpaidCheck = await queryDb("SELECT COUNT(*)::int AS count FROM developer_payrolls WHERE payroll_id = $1 AND payment_status != 'PAID'", [item.payroll_id]);
            if (unpaidCheck.rows[0].count === 0) {
                await queryDb("UPDATE payrolls SET status = 'PAID' WHERE id = $1", [item.payroll_id]);
            }
            else {
                await queryDb("UPDATE payrolls SET status = 'APPROVED' WHERE id = $1 AND status = 'DRAFT'", [item.payroll_id]);
            }

            const expenseCode = `EXP-SAL-${payrollPayment.id}-${generateToken(4).toUpperCase()}`;
            const expenseTitle = `Developer Salary: ${item.developer_name} (${item.payroll_title})`;

            const expRes = await queryDb(`
              INSERT INTO expenses (
                expense_code, title, category, amount, currency, expense_date,
                status, payee_name, payee_type, developer_id, payroll_payment_id,
                created_by_developer_id, receipt_url, notes
              ) VALUES ($1, $2, 'salary', $3, $4, CURRENT_DATE, 'paid', $5, 'developer', $6, $7, $8, $9, $10)
              RETURNING *
            `, [
                expenseCode,
                expenseTitle,
                payAmount,
                currency,
                item.developer_name,
                item.developer_id,
                payrollPayment.id,
                devUserId,
                receipt_url || null,
                notes || `Salary payment disbursement ref ${txnRef}`,
            ]);

            const expense = expRes.rows[0];

            const balRes = await queryDb('SELECT available_balance FROM platform_balances WHERE currency = $1 LIMIT 1', [currency]);
            const currentBal = balRes.rows.length > 0 ? Number(balRes.rows[0].available_balance) : 0;
            const newBalance = currentBal - payAmount;

            await queryDb(`
              INSERT INTO platform_balances (currency, total_revenue, available_balance, pending_balance, total_withdrawn)
              VALUES ($1, 0.00, $2, 0.00, 0.00)
              ON CONFLICT (currency) DO UPDATE 
              SET available_balance = platform_balances.available_balance - $3,
                  updated_at = CURRENT_TIMESTAMP
            `, [currency, newBalance, payAmount]);

            const cfRes = await queryDb(`
              INSERT INTO cashflows (
                title, category, flow_type, amount, currency, balance_after,
                reference_type, reference_id, developer_id, payment_method, metadata
              ) VALUES ($1, 'expense', 'outflow', $2, $3, $4, 'expense', $5, $6, $7, $8)
              RETURNING *
            `, [
                expenseTitle,
                payAmount,
                currency,
                newBalance,
                expense.id,
                item.developer_id,
                method,
                JSON.stringify({
                    expense_code: expenseCode,
                    payroll_payment_id: payrollPayment.id,
                    transaction_reference: txnRef,
                }),
            ]);

            const expTxNumber = `EXPTXN-SAL-${payrollPayment.id}-${Date.now().toString().slice(-4)}`;
            await queryDb(`
              INSERT INTO expense_transactions (
                expense_id, transaction_number, amount, currency, payment_method,
                payment_reference, paid_by_developer_id, cashflow_id, notes
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                expense.id,
                expTxNumber,
                payAmount,
                currency,
                method,
                txnRef,
                devUserId,
                cfRes.rows[0].id,
                notes || `Auto-logged from Payroll Payment #${payrollPayment.id}`,
            ]);

            await queryDb('COMMIT');
            return NextResponse.json({
                success: true,
                payment: payrollPayment,
                expense,
                message: 'Salary payment recorded, expense transaction created, and platform balance updated.',
            });
        } catch (err: any) {
            await queryDb('ROLLBACK');
            throw err;
        }
    }
    catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: any) {
    try {
        const auth = await hasModulePermission(request, 'payroll');
        if (!auth.success) {
            return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
        }
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ success: false, error: 'Payment ID is required.' }, { status: 400 });
        }
        const payRes = await queryDb('SELECT developer_payroll_id, payroll_id, amount FROM payroll_payments WHERE id = $1', [id]);
        if (payRes.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Payment record not found.' }, { status: 404 });
        }
        const { developer_payroll_id, payroll_id, amount } = payRes.rows[0];

        await queryDb('BEGIN');
        try {
            const expRes = await queryDb('SELECT id, currency FROM expenses WHERE payroll_payment_id = $1 LIMIT 1', [id]);
            if (expRes.rows.length > 0) {
                const exp = expRes.rows[0];
                const curr = exp.currency || 'BDT';
                const payAmt = Number(amount || 0);
                await queryDb(`
                  UPDATE platform_balances
                  SET available_balance = available_balance + $1, updated_at = CURRENT_TIMESTAMP
                  WHERE currency = $2
                `, [payAmt, curr]);

                await queryDb('DELETE FROM expense_transactions WHERE expense_id = $1', [exp.id]);
                await queryDb('DELETE FROM cashflows WHERE reference_type = $1 AND reference_id = $2', ['expense', exp.id]);
                await queryDb('DELETE FROM expenses WHERE id = $1', [exp.id]);
            }

            await queryDb('DELETE FROM payroll_payments WHERE id = $1', [id]);
            await queryDb("UPDATE developer_payrolls SET payment_status = 'UNPAID' WHERE id = $1", [developer_payroll_id]);
            await queryDb("UPDATE payrolls SET status = 'APPROVED' WHERE id = $1 AND status = 'PAID'", [payroll_id]);

            await queryDb('COMMIT');
            return NextResponse.json({
                success: true,
                message: 'Payment record and associated expense transaction reversed successfully.',
            });
        } catch (err: any) {
            await queryDb('ROLLBACK');
            throw err;
        }
    }
    catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
