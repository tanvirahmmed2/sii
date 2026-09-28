import { NextResponse } from 'next/server';
import { hasModulePermission } from '@/lib/middleware/developer';
import { queryDb } from '@/lib/db/pg';

// ============================================================================
// GET: List recent payroll payments
// ============================================================================
export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'payroll');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message },
        { status: auth.status || 403 }
      );
    }

    const paymentsRes = await queryDb(`
      SELECT 
        pp.*,
        p.title AS payroll_title,
        p.pay_period_start,
        p.pay_period_end,
        d.name AS developer_name,
        d.email AS developer_email,
        COALESCE(r.slug, 'developer') AS developer_role,
        COALESCE(r.name, 'Developer') AS developer_role_name,
        proc.name AS processed_by_name
      FROM payroll_payments pp
      JOIN payrolls p ON pp.payroll_id = p.id
      JOIN developers d ON pp.developer_id = d.id
      LEFT JOIN roles r ON d.role_id = r.id
      LEFT JOIN developers proc ON pp.processed_by_developer_id = proc.id
      ORDER BY pp.payment_date DESC
      LIMIT 100
    `);

    return NextResponse.json({
      success: true,
      payments: paymentsRes.rows,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// POST: Record a payment for a developer salary allocation (ADMIN ONLY)
// ============================================================================
export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'payroll');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message },
        { status: auth.status || 403 }
      );
    }

    const body = await request.json();
    const { developer_payroll_id, amount, payment_method, transaction_reference, notes } = body;

    if (!developer_payroll_id || amount === undefined || amount === null) {
      return NextResponse.json(
        { success: false, error: 'Developer Payroll ID and Payment Amount are required.' },
        { status: 400 }
      );
    }

    // Fetch the developer_payroll record to get payroll_id and developer_id
    const itemRes = await queryDb(
      'SELECT id, payroll_id, developer_id, net_salary, payment_status FROM developer_payrolls WHERE id = $1',
      [developer_payroll_id]
    );

    if (itemRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Developer payroll allocation record not found.' }, { status: 404 });
    }

    const item = itemRes.rows[0];
    const payAmount = parseFloat(amount) || item.net_salary;

    const paymentRes = await queryDb(
      `INSERT INTO payroll_payments 
       (developer_payroll_id, payroll_id, developer_id, amount, payment_method, transaction_reference, status, processed_by_developer_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, 'COMPLETED', $7, $8)
       RETURNING *`,
      [
        item.id,
        item.payroll_id,
        item.developer_id,
        payAmount,
        payment_method || 'BANK_TRANSFER',
        transaction_reference || `TXN-${Date.now()}`,
        auth.staff.id,
        notes || null,
      ]
    );

    // Update developer_payroll payment status to PAID
    await queryDb(
      "UPDATE developer_payrolls SET payment_status = 'PAID' WHERE id = $1",
      [item.id]
    );

    // Check if all items in this payroll run are now PAID
    const unpaidCheck = await queryDb(
      "SELECT COUNT(*)::int AS count FROM developer_payrolls WHERE payroll_id = $1 AND payment_status != 'PAID'",
      [item.payroll_id]
    );

    if (unpaidCheck.rows[0].count === 0) {
      await queryDb("UPDATE payrolls SET status = 'PAID' WHERE id = $1", [item.payroll_id]);
    } else {
      await queryDb("UPDATE payrolls SET status = 'APPROVED' WHERE id = $1 AND status = 'DRAFT'", [item.payroll_id]);
    }

    return NextResponse.json({
      success: true,
      payment: paymentRes.rows[0],
      message: 'Salary payment recorded successfully.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
