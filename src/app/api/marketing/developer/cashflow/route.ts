import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';

async function syncPackageSalesToCashflow() {
  try {
    await queryDb(`
      INSERT INTO cashflows (
        title, category, flow_type, amount, currency, balance_after,
        reference_type, reference_id, creator_id, payment_method, metadata, created_at
      )
      SELECT 
        COALESCE('Subscription Package Sale #' || p.invoice_no, 'Creator Package Subscription'),
        'package_sale',
        'inflow',
        p.amount,
        COALESCE(p.currency, 'BDT'),
        0,
        'payment',
        p.id,
        p.creator_id,
        COALESCE(p.payment_method, p.payment_gateway, 'gateway'),
        jsonb_build_object(
          'payment_id', p.id,
          'invoice_no', p.invoice_no,
          'package_id', p.package_id,
          'transaction_id', p.transaction_id,
          'billing_cycle', p.billing_cycle
        ),
        COALESCE(p.payment_date, p.created_at, CURRENT_TIMESTAMP)
      FROM payments p
      WHERE p.status IN ('paid', 'success', 'completed')
        AND NOT EXISTS (
          SELECT 1 FROM cashflows cf 
          WHERE cf.reference_type = 'payment' AND cf.reference_id = p.id
        )
    `);

    await queryDb(`
      INSERT INTO platform_balances (currency, total_revenue, available_balance, pending_balance, total_withdrawn)
      SELECT 
        cf.currency,
        SUM(CASE WHEN cf.flow_type = 'inflow' THEN cf.amount ELSE 0 END),
        SUM(CASE WHEN cf.flow_type = 'inflow' THEN cf.amount ELSE -cf.amount END),
        0,
        0
      FROM cashflows cf
      WHERE NOT EXISTS (SELECT 1 FROM platform_balances pb WHERE pb.currency = cf.currency)
      GROUP BY cf.currency
    `);

    await queryDb(`
      UPDATE platform_balances pb
      SET total_revenue = COALESCE((SELECT SUM(amount) FROM cashflows WHERE flow_type = 'inflow' AND currency = pb.currency), 0),
          available_balance = COALESCE((SELECT SUM(CASE WHEN flow_type = 'inflow' THEN amount ELSE -amount END) FROM cashflows WHERE currency = pb.currency), 0),
          updated_at = CURRENT_TIMESTAMP
    `);
  } catch (err: any) {
    console.error('Error syncing package sales to cashflow:', err.message);
  }
}

export async function GET(request: any) {
  try {
    const auth = await hasModulePermission(request, ['cashflow', 'withdraws', 'roles', 'payroll']);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    await syncPackageSalesToCashflow();

    const { searchParams } = new URL(request.url);
    const flowType = searchParams.get('flow_type') || searchParams.get('type');
    const category = searchParams.get('category');
    const currency = searchParams.get('currency') || 'BDT';
    const searchTerm = (searchParams.get('search') || searchParams.get('q') || '').trim();
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

    if (searchTerm) {
      params.push(`%${searchTerm}%`);
      conditions.push(`(
        cf.title ILIKE $${params.length} OR
        c.name ILIKE $${params.length} OR
        c.email ILIKE $${params.length} OR
        cf.payment_method ILIKE $${params.length} OR
        cf.metadata->>'invoice_no' ILIKE $${params.length} OR
        cf.metadata->>'transaction_id' ILIKE $${params.length}
      )`);
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
        COALESCE(SUM(CASE WHEN category = 'package_sale' THEN amount ELSE 0 END), 0) AS package_sales_revenue,
        COUNT(id) AS total_transactions
      FROM cashflows
      ${currency !== 'ALL' ? `WHERE currency = '${currency.toUpperCase()}'` : ''}
    `);

    const stats = statsRes.rows[0] || {
      total_inflow: 0,
      total_outflow: 0,
      package_sales_revenue: 0,
      total_transactions: 0,
    };
    const netCashflow = Number(stats.total_inflow) - Number(stats.total_outflow);

    const balRes = await queryDb(`SELECT * FROM platform_balances ORDER BY currency ASC`);

    return NextResponse.json({
      success: true,
      records: recordsRes.rows,
      balances: balRes.rows,
      stats: {
        totalInflow: Number(stats.total_inflow),
        totalOutflow: Number(stats.total_outflow),
        packageSalesRevenue: Number(stats.package_sales_revenue),
        netCashflow,
        totalTransactions: Number(stats.total_transactions),
        currency: currency.toUpperCase(),
      },
    });
  } catch (error: any) {
    console.error('Cashflow GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: any) {
  try {
    const auth = await hasModulePermission(request, ['cashflow', 'withdraws', 'roles', 'payroll'], 'create');
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
           VALUES ($1, $2, $2, 0, 0)
           ON CONFLICT (currency) DO UPDATE SET
             total_revenue = platform_balances.total_revenue + $2,
             available_balance = platform_balances.available_balance + $2,
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
          developer_id, payment_method, metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9
        ) RETURNING *`,
        [
          title,
          category,
          flowType,
          amount,
          currency,
          newAvail,
          developerId,
          paymentMethod,
          JSON.stringify({ notes }),
        ]
      );

      await queryDb('COMMIT');
      return NextResponse.json({
        success: true,
        message: 'Transaction successfully recorded in platform cashflow',
        record: insertRes.rows[0],
      }, { status: 201 });
    } catch (err: any) {
      await queryDb('ROLLBACK');
      throw err;
    }
  } catch (error: any) {
    console.error('Cashflow POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
