import { NextResponse } from 'next/server';
import { authenticateStaff } from '@/lib/middleware/developer';
import { queryDb } from '@/lib/db/pg';

// ============================================================================
// GET: Fetch personal salary records & payouts for the logged-in developer
// Accessible to ALL developer roles
// ============================================================================
export async function GET(request) {
  try {
    const auth = await authenticateStaff(request);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const currentDevId = auth.staff.id;

    // 1. Fetch developer salary periods
    const salariesRes = await queryDb(`
      SELECT 
        dp.id,
        dp.payroll_id,
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
        -- Attached payment details if paid
        pp.id AS payment_id,
        pp.amount AS paid_amount,
        pp.payment_date,
        pp.payment_method AS disbursement_method,
        pp.transaction_reference,
        proc.name AS processed_by_name
      FROM developer_payrolls dp
      JOIN payrolls p ON dp.payroll_id = p.id
      LEFT JOIN payroll_payments pp ON dp.id = pp.developer_payroll_id AND pp.status = 'COMPLETED'
      LEFT JOIN developers proc ON pp.processed_by_developer_id = proc.id
      WHERE dp.developer_id = $1
      ORDER BY p.pay_period_start DESC, dp.id DESC
    `, [currentDevId]);

    // 2. Compute aggregate metrics for this developer
    const statsRes = await queryDb(`
      SELECT 
        COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN net_salary ELSE 0 END), 0)::numeric(12,2) AS total_paid,
        COALESCE(SUM(CASE WHEN payment_status != 'PAID' THEN net_salary ELSE 0 END), 0)::numeric(12,2) AS pending_payout,
        COALESCE(SUM(net_salary), 0)::numeric(12,2) AS total_earned,
        COUNT(*)::int AS total_cycles
      FROM developer_payrolls
      WHERE developer_id = $1
    `, [currentDevId]);

    return NextResponse.json({
      success: true,
      salaries: salariesRes.rows,
      stats: statsRes.rows[0] || {
        total_paid: 0,
        pending_payout: 0,
        total_earned: 0,
        total_cycles: 0,
      },
    });
  } catch (error) {
    console.error('My Salaries GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
