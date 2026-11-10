import { NextResponse } from 'next/server';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { queryDb } from 'src/lib/database/db';
import { generateToken } from 'src/lib/utils/random';

export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'payroll');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message },
        { status: auth.status || 403 }
      );
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
        proc.name AS processed_by_name
      FROM payroll_payments pp
      JOIN payrolls p ON pp.payroll_id = p.id
      JOIN developers d ON pp.developer_id = d.id
      LEFT JOIN developer_roles r ON d.role_id = r.id
      LEFT JOIN developers proc ON pp.processed_by_developer_id = proc.id
      WHERE 1=1
    `;

    const values = [];
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
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

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
    const { developer_payroll_id, amount, payment_method, transaction_reference, notes, receipt_url } = body;

    if (!developer_payroll_id || amount === undefined || amount === null) {
      return NextResponse.json(
        { success: false, error: 'Developer Payroll ID and Payment Amount are required.' },
        { status: 400 }
      );
    }

    const itemRes = await queryDb(
      'SELECT id, payroll_id, developer_id, net_salary, payment_status FROM developer_payrolls WHERE id = $1',
      [developer_payroll_id]
    );

    if (itemRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Developer payroll allocation record not found.' }, { status: 404 });
    }

    const item = itemRes.rows[0];
    const payAmount = parseFloat(amount) || item.net_salary;
    const devUserId = auth.staff?.id || auth.developer?.id || auth.user?.id || null;

    const paymentRes = await queryDb(
      `INSERT INTO payroll_payments 
       (developer_payroll_id, payroll_id, developer_id, amount, payment_method, transaction_reference, status, processed_by_developer_id, receipt_url, notes)
       VALUES ($1, $2, $3, $4, $5, $6, 'COMPLETED', $7, $8, $9)
       RETURNING *`,
      [
        item.id,
        item.payroll_id,
        item.developer_id,
        payAmount,
        payment_method || 'BANK_TRANSFER',
        transaction_reference || `PAY-${generateToken(8).toUpperCase()}`,
        devUserId,
        receipt_url || null,
        notes || null,
      ]
    );

    await queryDb(
      "UPDATE developer_payrolls SET payment_status = 'PAID' WHERE id = $1",
      [item.id]
    );

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

export async function DELETE(request) {
  try {
    const auth = await hasModulePermission(request, 'payroll');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message },
        { status: auth.status || 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Payment ID is required.' }, { status: 400 });
    }

    const payRes = await queryDb('SELECT developer_payroll_id, payroll_id FROM payroll_payments WHERE id = $1', [id]);
    if (payRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Payment record not found.' }, { status: 404 });
    }

    const { developer_payroll_id, payroll_id } = payRes.rows[0];

    await queryDb('DELETE FROM payroll_payments WHERE id = $1', [id]);

    await queryDb("UPDATE developer_payrolls SET payment_status = 'UNPAID' WHERE id = $1", [developer_payroll_id]);
    await queryDb("UPDATE payrolls SET status = 'APPROVED' WHERE id = $1 AND status = 'PAID'", [payroll_id]);

    return NextResponse.json({
      success: true,
      message: 'Payment record cancelled and reversed successfully.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
