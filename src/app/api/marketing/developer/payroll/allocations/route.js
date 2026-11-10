import { NextResponse } from 'next/server';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { queryDb } from 'src/lib/database/db';

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
        dp.id,
        dp.payroll_id,
        dp.developer_id,
        dp.base_salary,
        dp.bonus,
        dp.deductions,
        dp.net_salary,
        dp.payment_status,
        dp.payment_method,
        dp.notes,
        dp.created_at,
        dp.updated_at,
        p.title AS payroll_title,
        p.pay_period_start,
        p.pay_period_end,
        p.status AS payroll_status,
        d.name AS developer_name,
        d.email AS developer_email,
        d.phone AS developer_phone,
        COALESCE(r.name, 'Developer') AS developer_role_name,
        pp.id AS payment_id,
        pp.amount AS paid_amount,
        pp.payment_date,
        pp.transaction_reference
      FROM developer_payrolls dp
      JOIN payrolls p ON dp.payroll_id = p.id
      JOIN developers d ON dp.developer_id = d.id
      LEFT JOIN developer_roles r ON d.role_id = r.id
      LEFT JOIN payroll_payments pp ON dp.id = pp.developer_payroll_id AND pp.status = 'COMPLETED'
      WHERE 1=1
    `;

    const values = [];
    let idx = 1;

    if (payrollId) {
      query += ` AND dp.payroll_id = $${idx++}`;
      values.push(payrollId);
    }
    if (developerId) {
      query += ` AND dp.developer_id = $${idx++}`;
      values.push(developerId);
    }
    if (status) {
      query += ` AND dp.payment_status = $${idx++}`;
      values.push(status);
    }

    query += ` ORDER BY p.pay_period_start DESC, dp.id DESC`;

    const allocationsRes = await queryDb(query, values);

    const statsRes = await queryDb(`
      SELECT 
        COALESCE(SUM(net_salary), 0)::numeric(12,2) AS total_allocated,
        COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN net_salary ELSE 0 END), 0)::numeric(12,2) AS total_paid,
        COALESCE(SUM(CASE WHEN payment_status != 'PAID' THEN net_salary ELSE 0 END), 0)::numeric(12,2) AS total_pending,
        COUNT(DISTINCT developer_id)::int AS assigned_developers_count,
        COUNT(*)::int AS total_allocations
      FROM developer_payrolls
    `);

    const payrollsListRes = await queryDb(`
      SELECT id, title, pay_period_start, pay_period_end, status 
      FROM payrolls 
      ORDER BY pay_period_start DESC, id DESC
    `);

    const developersListRes = await queryDb(`
      SELECT d.id, d.name, d.email, d.role_id, COALESCE(r.name, 'Developer') AS role_name 
      FROM developers d 
      LEFT JOIN developer_roles r ON d.role_id = r.id 
      WHERE d.is_active = TRUE 
      ORDER BY d.name ASC
    `);

    return NextResponse.json({
      success: true,
      allocations: allocationsRes.rows,
      stats: statsRes.rows[0] || {
        total_allocated: 0,
        total_paid: 0,
        total_pending: 0,
        assigned_developers_count: 0,
        total_allocations: 0,
      },
      payrolls: payrollsListRes.rows,
      developers: developersListRes.rows,
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
    const { payroll_id, developer_id, base_salary, bonus = 0, deductions = 0, payment_method = 'BANK_TRANSFER', notes = '' } = body;

    if (!payroll_id || !developer_id) {
      return NextResponse.json(
        { success: false, error: 'Payroll cycle and Developer are required.' },
        { status: 400 }
      );
    }

    const base = Math.max(0, parseFloat(base_salary) || 0);
    const bon = Math.max(0, parseFloat(bonus) || 0);
    const ded = Math.max(0, parseFloat(deductions) || 0);
    const net = Math.max(0, base + bon - ded);

    const insertRes = await queryDb(
      `INSERT INTO developer_payrolls 
       (payroll_id, developer_id, base_salary, bonus, deductions, net_salary, payment_status, payment_method, notes)
       VALUES ($1, $2, $3, $4, $5, $6, 'UNPAID', $7, $8)
       ON CONFLICT (payroll_id, developer_id) 
       DO UPDATE SET 
         base_salary = EXCLUDED.base_salary, 
         bonus = EXCLUDED.bonus, 
         deductions = EXCLUDED.deductions, 
         net_salary = EXCLUDED.net_salary,
         payment_method = EXCLUDED.payment_method,
         notes = EXCLUDED.notes,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [payroll_id, developer_id, base, bon, ded, net, payment_method || 'BANK_TRANSFER', notes || null]
    );

    await queryDb(
      `UPDATE payrolls 
       SET total_amount = (SELECT COALESCE(SUM(net_salary), 0) FROM developer_payrolls WHERE payroll_id = $1)
       WHERE id = $1`,
      [payroll_id]
    );

    return NextResponse.json({
      success: true,
      allocation: insertRes.rows[0],
      message: 'Developer payroll assigned successfully.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const auth = await hasModulePermission(request, 'payroll');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message },
        { status: auth.status || 403 }
      );
    }

    const body = await request.json();
    const { id, base_salary, bonus, deductions, payment_status, payment_method, notes } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Allocation ID is required.' },
        { status: 400 }
      );
    }

    const currentRes = await queryDb('SELECT * FROM developer_payrolls WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Allocation not found.' }, { status: 404 });
    }

    const current = currentRes.rows[0];
    const base = base_salary !== undefined ? Math.max(0, parseFloat(base_salary) || 0) : parseFloat(current.base_salary);
    const bon = bonus !== undefined ? Math.max(0, parseFloat(bonus) || 0) : parseFloat(current.bonus);
    const ded = deductions !== undefined ? Math.max(0, parseFloat(deductions) || 0) : parseFloat(current.deductions);
    const net = Math.max(0, base + bon - ded);

    const updateRes = await queryDb(
      `UPDATE developer_payrolls 
       SET base_salary = $1, bonus = $2, deductions = $3, net_salary = $4,
           payment_status = COALESCE($5, payment_status),
           payment_method = COALESCE($6, payment_method),
           notes = COALESCE($7, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [base, bon, ded, net, payment_status || null, payment_method || null, notes !== undefined ? notes : null, id]
    );

    await queryDb(
      `UPDATE payrolls 
       SET total_amount = (SELECT COALESCE(SUM(net_salary), 0) FROM developer_payrolls WHERE payroll_id = $1)
       WHERE id = $1`,
      [current.payroll_id]
    );

    return NextResponse.json({
      success: true,
      allocation: updateRes.rows[0],
      message: 'Allocation updated successfully.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const PATCH = PUT;

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
      return NextResponse.json({ success: false, error: 'Allocation ID is required.' }, { status: 400 });
    }

    const itemRes = await queryDb('SELECT payroll_id FROM developer_payrolls WHERE id = $1', [id]);
    if (itemRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Allocation not found.' }, { status: 404 });
    }

    const payrollId = itemRes.rows[0].payroll_id;

    await queryDb('DELETE FROM developer_payrolls WHERE id = $1', [id]);

    await queryDb(
      `UPDATE payrolls 
       SET total_amount = (SELECT COALESCE(SUM(net_salary), 0) FROM developer_payrolls WHERE payroll_id = $1)
       WHERE id = $1`,
      [payrollId]
    );

    return NextResponse.json({
      success: true,
      message: 'Developer payroll allocation removed successfully.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

