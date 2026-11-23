import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';

export async function GET(request: any) {
  try {
    const auth = await hasModulePermission(request, 'cashflow');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    const flowType = searchParams.get('flow_type') || searchParams.get('type');
    const category = searchParams.get('category');
    const currency = searchParams.get('currency') || 'BDT';
    const limit = Math.min(Number(searchParams.get('limit') || 100), 500);
    const offset = Math.max(Number(searchParams.get('offset') || 0), 0);

    const conditions: string[] = [];
    const params: any[] = [];

    if (flowType && flowType !== 'ALL') {
      params.push(flowType.toLowerCase());
      conditions.push(`cf.flow_type = $${params.length}`);
    }

    if (category && category !== 'ALL') {
      params.push(category.toLowerCase());
      conditions.push(`cf.category = $${params.length}`);
    }

    if (currency && currency !== 'ALL') {
      params.push(currency.toUpperCase());
      conditions.push(`cf.currency = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const listQuery = `
      SELECT cf.*,
             c.name AS creator_name,
             c.email AS creator_email,
             d.name AS developer_name,
             d.email AS developer_email
      FROM cashflows cf
      LEFT JOIN creators c ON cf.creator_id = c.id
      LEFT JOIN developers d ON cf.developer_id = d.id
      ${whereClause}
      ORDER BY cf.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const recordsRes = await queryDb(listQuery, [...params, limit, offset]);

    const statsRes = await queryDb(`
      SELECT 
        COALESCE(SUM(CASE WHEN flow_type = 'inflow' THEN amount ELSE 0 END), 0) AS total_inflow,
        COALESCE(SUM(CASE WHEN flow_type = 'outflow' THEN amount ELSE 0 END), 0) AS total_outflow,
        COUNT(id) AS total_transactions
      FROM cashflows
      ${currency !== 'ALL' ? `WHERE currency = '${currency.toUpperCase()}'` : ''}
    `);

    const stats = statsRes.rows[0] || { total_inflow: 0, total_outflow: 0, total_transactions: 0 };
    const netCashflow = Number(stats.total_inflow) - Number(stats.total_outflow);

    const balRes = await queryDb(`SELECT * FROM platform_balances ORDER BY currency ASC`);

    return NextResponse.json({
      success: true,
      records: recordsRes.rows,
      balances: balRes.rows,
      stats: {
        totalInflow: Number(stats.total_inflow),
        totalOutflow: Number(stats.total_outflow),
        netCashflow,
        totalTransactions: Number(stats.total_transactions),
        currency: currency.toUpperCase(),
      },
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

    const developerId = auth.developer?.id || auth.user?.id || null;
    const body = await request.json().catch(() => ({}));
    const title = String(body.title || '').trim();
    const category = String(body.category || 'adjustment').toLowerCase();
    const flowType = String(body.flow_type || body.type || 'inflow').toLowerCase();
    const amount = Number(body.amount);
    const currency = String(body.currency || 'BDT').toUpperCase();
    const paymentMethod = String(body.payment_method || 'manual');
    const notes = String(body.notes || '');

    if (!title || !amount || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Title and positive amount are required' }, { status: 400 });
    }

    if (flowType !== 'inflow' && flowType !== 'outflow') {
      return NextResponse.json({ success: false, error: 'flow_type must be inflow or outflow' }, { status: 400 });
    }

    await queryDb('BEGIN');
    try {
      const balRes = await queryDb(
        `SELECT available_balance, total_revenue FROM platform_balances WHERE currency = $1 LIMIT 1`,
        [currency]
      );
      const prevAvail = balRes.rows.length > 0 ? Number(balRes.rows[0].available_balance) : 0;
      const newAvail = flowType === 'inflow' ? prevAvail + amount : prevAvail - amount;

      if (flowType === 'inflow') {
        await queryDb(
          `INSERT INTO platform_balances (currency, total_revenue, available_balance, pending_balance, total_withdrawn)
           VALUES ($1, $2, $2, 0.00, 0.00)
           ON CONFLICT (currency) DO UPDATE 
           SET total_revenue = platform_balances.total_revenue + EXCLUDED.total_revenue,
               available_balance = platform_balances.available_balance + EXCLUDED.available_balance,
               updated_at = CURRENT_TIMESTAMP`,
          [currency, amount]
        );
      } else {
        await queryDb(
          `UPDATE platform_balances
           SET available_balance = available_balance - $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE currency = $2`,
          [amount, currency]
        );
      }

      const insertRes = await queryDb(
        `INSERT INTO cashflows (
          title, category, flow_type, amount, currency, balance_after,
          reference_type, developer_id, payment_method, metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          'manual_adjustment', $7, $8, $9
        ) RETURNING *`,
        [title, category, flowType, amount, currency, newAvail, developerId, paymentMethod, JSON.stringify({ notes })]
      );

      await queryDb('COMMIT');
      return NextResponse.json({
        success: true,
        message: 'Cashflow entry recorded successfully',
        record: insertRes.rows[0],
      });
    } catch (err: any) {
      await queryDb('ROLLBACK');
      throw err;
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
