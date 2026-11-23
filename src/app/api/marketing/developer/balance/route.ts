import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';

export async function GET(request: any) {
  try {
    const auth = await hasModulePermission(request, 'cashflow');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const balancesRes = await queryDb(`SELECT * FROM platform_balances ORDER BY currency ASC`);

    const paymentsStatsRes = await queryDb(`
      SELECT 
        currency,
        status,
        COUNT(id) AS count,
        COALESCE(SUM(amount), 0) AS total_amount
      FROM payments
      GROUP BY currency, status
    `);

    const withdrawStatsRes = await queryDb(`
      SELECT 
        currency,
        status,
        COUNT(id) AS count,
        COALESCE(SUM(amount), 0) AS total_amount
      FROM withdraws
      GROUP BY currency, status
    `);

    return NextResponse.json({
      success: true,
      balances: balancesRes.rows,
      paymentBreakdown: paymentsStatsRes.rows,
      withdrawBreakdown: withdrawStatsRes.rows,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: any) {
  try {
    const auth = await hasModulePermission(request, 'cashflow');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action || 'reconcile';

    if (action === 'reconcile') {
      const currencies = ['BDT', 'USD'];
      const results: any[] = [];

      for (const cur of currencies) {
        const paySum = await queryDb(
          `SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE currency = $1 AND status = 'successful'`,
          [cur]
        );
        const withSum = await queryDb(
          `SELECT COALESCE(SUM(amount), 0) AS total FROM withdraws WHERE currency = $1 AND status IN ('approved', 'processed')`,
          [cur]
        );
        const adjInflow = await queryDb(
          `SELECT COALESCE(SUM(amount), 0) AS total FROM cashflows WHERE currency = $1 AND flow_type = 'inflow' AND reference_type = 'manual_adjustment'`,
          [cur]
        );
        const adjOutflow = await queryDb(
          `SELECT COALESCE(SUM(amount), 0) AS total FROM cashflows WHERE currency = $1 AND flow_type = 'outflow' AND reference_type = 'manual_adjustment'`,
          [cur]
        );

        const totalRev = Number(paySum.rows[0].total) + Number(adjInflow.rows[0].total);
        const totalWith = Number(withSum.rows[0].total);
        const totalOut = totalWith + Number(adjOutflow.rows[0].total);
        const available = Math.max(0, totalRev - totalOut);

        const updateRes = await queryDb(
          `INSERT INTO platform_balances (currency, total_revenue, available_balance, pending_balance, total_withdrawn)
           VALUES ($1, $2, $3, 0.00, $4)
           ON CONFLICT (currency) DO UPDATE 
           SET total_revenue = EXCLUDED.total_revenue,
               available_balance = EXCLUDED.available_balance,
               total_withdrawn = EXCLUDED.total_withdrawn,
               updated_at = CURRENT_TIMESTAMP
           RETURNING *`,
          [cur, totalRev, available, totalWith]
        );
        results.push(updateRes.rows[0]);
      }

      return NextResponse.json({
        success: true,
        message: 'Balances reconciled successfully from financial ledger',
        balances: results,
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
