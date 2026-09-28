import { NextResponse } from 'next/server';
import { hasModulePermission } from '@/lib/middleware/developer';
import { queryDb } from '@/lib/db/pg';

// ============================================================================
// GET: List all payrolls and summary statistics
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

    // 1. Fetch Payroll Runs with developer count & paid count
    const payrollsRes = await queryDb(`
      SELECT 
        p.id,
        p.title,
        p.pay_period_start,
        p.pay_period_end,
        p.status,
        p.total_amount,
        p.notes,
        p.created_at,
        p.updated_at,
        d.name AS created_by_name,
        COUNT(dp.id)::int AS developer_count,
        COUNT(CASE WHEN dp.payment_status = 'PAID' THEN 1 END)::int AS paid_count
      FROM payrolls p
      LEFT JOIN developers d ON p.created_by_developer_id = d.id
      LEFT JOIN developer_payrolls dp ON p.id = dp.payroll_id
      GROUP BY p.id, d.name
      ORDER BY p.pay_period_start DESC, p.id DESC
    `);

    // 2. Aggregate metrics
    const statsRes = await queryDb(`
      SELECT 
        COALESCE(SUM(amount), 0)::numeric(12,2) AS total_disbursed,
        (SELECT COALESCE(SUM(net_salary), 0)::numeric(12,2) FROM developer_payrolls WHERE payment_status != 'PAID') AS pending_payouts,
        (SELECT COUNT(*)::int FROM payrolls) AS total_runs,
        (SELECT COUNT(*)::int FROM developers WHERE is_active = TRUE) AS active_developers
      FROM payroll_payments
      WHERE status = 'COMPLETED'
    `);

    // 3. List active developers for new payroll creation modal
    const devsRes = await queryDb(`
      SELECT d.id, d.name, d.email, COALESCE(r.slug, 'developer') AS role, COALESCE(r.name, 'Developer') AS role_name
      FROM developers d
      LEFT JOIN roles r ON d.role_id = r.id
      WHERE d.is_active = TRUE 
      ORDER BY d.name ASC
    `);

    return NextResponse.json({
      success: true,
      payrolls: payrollsRes.rows,
      stats: statsRes.rows[0] || {
        total_disbursed: 0,
        pending_payouts: 0,
        total_runs: 0,
        active_developers: 0,
      },
      developers: devsRes.rows,
    });
  } catch (error) {
    console.error('Payroll GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// POST: Create a new payroll run with developer salary allocations (ADMIN ONLY)
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
    const { title, pay_period_start, pay_period_end, notes, items = [] } = body;

    if (!title || !pay_period_start || !pay_period_end) {
      return NextResponse.json(
        { success: false, error: 'Title, Pay Period Start, and Pay Period End are required.' },
        { status: 400 }
      );
    }

    // Calculate total net amount across allocations
    let totalAmount = 0;
    const sanitizedItems = items.map((item) => {
      const base = parseFloat(item.base_salary) || 0;
      const bonus = parseFloat(item.bonus) || 0;
      const deductions = parseFloat(item.deductions) || 0;
      const net = Math.max(0, base + bonus - deductions);
      totalAmount += net;
      return {
        developer_id: item.developer_id,
        base_salary: base,
        bonus,
        deductions,
        net_salary: net,
        payment_method: item.payment_method || 'BANK_TRANSFER',
        notes: item.notes || '',
      };
    });

    // Insert payroll record
    const payrollRes = await queryDb(
      `INSERT INTO payrolls (title, pay_period_start, pay_period_end, status, total_amount, notes, created_by_developer_id)
       VALUES ($1, $2, $3, 'DRAFT', $4, $5, $6)
       RETURNING *`,
      [title.trim(), pay_period_start, pay_period_end, totalAmount.toFixed(2), notes || null, auth.staff.id]
    );

    const newPayroll = payrollRes.rows[0];

    // Insert developer payroll line items
    for (const itm of sanitizedItems) {
      if (!itm.developer_id) continue;
      await queryDb(
        `INSERT INTO developer_payrolls 
         (payroll_id, developer_id, base_salary, bonus, deductions, net_salary, payment_status, payment_method, notes)
         VALUES ($1, $2, $3, $4, $5, $6, 'UNPAID', $7, $8)
         ON CONFLICT (payroll_id, developer_id) 
         DO UPDATE SET base_salary = EXCLUDED.base_salary, bonus = EXCLUDED.bonus, 
                       deductions = EXCLUDED.deductions, net_salary = EXCLUDED.net_salary`,
        [
          newPayroll.id,
          itm.developer_id,
          itm.base_salary,
          itm.bonus,
          itm.deductions,
          itm.net_salary,
          itm.payment_method,
          itm.notes,
        ]
      );
    }

    return NextResponse.json({
      success: true,
      payroll: newPayroll,
      message: 'Payroll run created successfully with developer salary allocations.',
    });
  } catch (error) {
    console.error('Payroll POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
