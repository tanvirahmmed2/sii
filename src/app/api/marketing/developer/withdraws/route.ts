import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';

const PERMISSIONS = ['withdraws', 'cashflow', 'roles', 'payroll'];

export async function GET(request: any) {
  try {
    const auth = await hasModulePermission(request, PERMISSIONS);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const currency = searchParams.get('currency') || 'BDT';
    const type = searchParams.get('type');
    const searchTerm = (searchParams.get('search') || searchParams.get('q') || '').trim();
    const limit = Math.min(Number(searchParams.get('limit') || 100), 500);
    const offset = Math.max(Number(searchParams.get('offset') || 0), 0);

    const conditions: string[] = [];
    const params: any[] = [];

    if (status && status !== 'ALL') {
      params.push(status.toLowerCase());
      conditions.push(`w.status = $${params.length}`);
    }

    if (currency && currency !== 'ALL') {
      params.push(currency.toUpperCase());
      conditions.push(`w.currency = $${params.length}`);
    }

    if (type && type !== 'ALL') {
      params.push(type.toLowerCase());
      conditions.push(`w.withdraw_type = $${params.length}`);
    }

    if (searchTerm) {
      params.push(`%${searchTerm}%`);
      conditions.push(`(
        d.name ILIKE $${params.length} OR
        d.email ILIKE $${params.length} OR
        s.name ILIKE $${params.length} OR
        s.email ILIKE $${params.length} OR
        w.transaction_reference ILIKE $${params.length} OR
        w.notes ILIKE $${params.length}
      )`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const listQuery = `
      SELECT w.*,
             d.name AS requested_by_name,
             d.email AS requested_by_email,
             d.phone AS requested_by_phone,
             proc.name AS processed_by_name,
             s.name AS shareholder_name,
             s.email AS shareholder_email,
             s.role_title AS shareholder_role,
             s.share_percentage AS shareholder_share_percentage
      FROM withdraws w
      LEFT JOIN developers d ON w.requested_by_id = d.id
      LEFT JOIN developers proc ON w.processed_by_developer_id = proc.id
      LEFT JOIN shareholders s ON w.shareholder_id = s.id
      ${whereClause}
      ORDER BY w.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const recordsRes = await queryDb(listQuery, [...params, limit, offset]);

    const statsRes = await queryDb(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pending_amount,
        COALESCE(SUM(CASE WHEN status = 'processed' THEN amount ELSE 0 END), 0) AS processed_amount,
        COALESCE(SUM(CASE WHEN status = 'rejected' THEN amount ELSE 0 END), 0) AS rejected_amount,
        COALESCE(SUM(CASE WHEN withdraw_type = 'dividend' AND status = 'processed' THEN amount ELSE 0 END), 0) AS dividend_disbursed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_count,
        COUNT(id) AS total_count
      FROM withdraws
      ${currency !== 'ALL' ? `WHERE currency = '${currency.toUpperCase()}'` : ''}
    `);

    const stats = statsRes.rows[0] || {};
    const balRes = await queryDb(`SELECT * FROM platform_balances ORDER BY currency ASC`);
    const shareholdersRes = await queryDb(`SELECT id, name, email, share_percentage, total_withdrawn FROM shareholders WHERE is_active = true ORDER BY share_percentage DESC`);

    return NextResponse.json({
      success: true,
      records: recordsRes.rows,
      balances: balRes.rows,
      shareholders: shareholdersRes.rows,
      stats: {
        pendingAmount: Number(stats.pending_amount || 0),
        processedAmount: Number(stats.processed_amount || 0),
        rejectedAmount: Number(stats.rejected_amount || 0),
        dividendDisbursed: Number(stats.dividend_disbursed || 0),
        pendingCount: Number(stats.pending_count || 0),
        totalCount: Number(stats.total_count || 0),
        currency: currency.toUpperCase(),
      },
    });
  } catch (error: any) {
    console.error('Withdraws GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: any) {
  try {
    const auth = await hasModulePermission(request, PERMISSIONS, 'create');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const developerId = auth.developer?.id || auth.user?.id || null;
    const body = await request.json().catch(() => ({}));
    const amount = Number(body.amount);
    const currency = String(body.currency || 'BDT').toUpperCase();
    const fee = Math.max(0, Number(body.fee || 0));
    const netAmount = Math.max(0, amount - fee);
    const method = String(body.method || 'bank_transfer');
    const accountDetails = body.account_details || {};
    const notes = String(body.notes || '');
    const shareholderId = body.shareholder_id ? Number(body.shareholder_id) : null;
    const withdrawType = shareholderId ? 'dividend' : String(body.withdraw_type || 'payout').toLowerCase();

    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Valid positive withdrawal amount is required' }, { status: 400 });
    }

    const balRes = await queryDb(`SELECT available_balance FROM platform_balances WHERE currency = $1 LIMIT 1`, [currency]);
    const available = balRes.rows.length > 0 ? Number(balRes.rows[0].available_balance) : 0;

    if (amount > available) {
      return NextResponse.json({
        success: false,
        error: `Insufficient platform balance (${available.toLocaleString()} ${currency}) for withdrawal request`,
      }, { status: 400 });
    }

    if (shareholderId) {
      const shRes = await queryDb('SELECT * FROM shareholders WHERE id = $1 LIMIT 1', [shareholderId]);
      if (shRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Selected shareholder not found' }, { status: 404 });
      }
    }

    const insertRes = await queryDb(
      `INSERT INTO withdraws (
        requested_by_id, shareholder_id, withdraw_type, amount, currency, fee, net_amount, method,
        account_details, status, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, 'pending', $10
      ) RETURNING *`,
      [
        developerId,
        shareholderId,
        withdrawType,
        amount,
        currency,
        fee,
        netAmount,
        method,
        JSON.stringify(accountDetails),
        notes,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Withdrawal request created successfully in pending state',
      record: insertRes.rows[0],
    }, { status: 201 });
  } catch (error: any) {
    console.error('Withdraws POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: any) {
  try {
    const auth = await hasModulePermission(request, PERMISSIONS, 'edit');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const developerId = auth.developer?.id || auth.user?.id || null;
    const body = await request.json().catch(() => ({}));
    const id = Number(body.id);
    const newStatus = String(body.status || '').toLowerCase();
    const notes = body.notes;
    const transactionRef = body.transaction_reference || body.transactionReference;

    if (!id || !newStatus) {
      return NextResponse.json({ success: false, error: 'id and status are required' }, { status: 400 });
    }

    const withRes = await queryDb(`SELECT * FROM withdraws WHERE id = $1 LIMIT 1`, [id]);
    if (withRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Withdrawal record not found' }, { status: 404 });
    }

    const currentRecord = withRes.rows[0];
    const prevStatus = currentRecord.status;

    if (prevStatus === 'processed' && newStatus === 'processed') {
      return NextResponse.json({ success: true, message: 'Already processed', record: currentRecord });
    }

    await queryDb('BEGIN');
    try {
      if (newStatus === 'processed' && prevStatus !== 'processed') {
        const withdrawAmount = Number(currentRecord.amount);
        const netDisbursed = Number(currentRecord.net_amount || withdrawAmount);
        const cur = currentRecord.currency;

        const balRes = await queryDb(`SELECT available_balance FROM platform_balances WHERE currency = $1 LIMIT 1`, [cur]);
        const prevBal = balRes.rows.length > 0 ? Number(balRes.rows[0].available_balance) : 0;
        const newBal = Math.max(0, prevBal - withdrawAmount);

        await queryDb(
          `UPDATE platform_balances 
           SET available_balance = available_balance - $1,
               total_withdrawn = total_withdrawn + $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE currency = $2`,
          [withdrawAmount, cur]
        );

        if (currentRecord.shareholder_id) {
          await queryDb(
            `UPDATE shareholders
             SET total_withdrawn = total_withdrawn + $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [netDisbursed, currentRecord.shareholder_id]
          );
        }

        const category = currentRecord.withdraw_type === 'dividend' ? 'dividend_payout' : 'withdrawal';
        const title = currentRecord.withdraw_type === 'dividend'
          ? `Shareholder Dividend Payout #${id}`
          : `Disbursement for Withdrawal #${id}`;

        await queryDb(
          `INSERT INTO cashflows (
            title, category, flow_type, amount, currency, balance_after,
            reference_type, reference_id, developer_id, payment_method, metadata
          ) VALUES (
            $1, $2, 'outflow', $3, $4, $5,
            'withdrawal', $6, $7, $8, $9
          )`,
          [
            title,
            category,
            withdrawAmount,
            cur,
            newBal,
            id,
            developerId,
            currentRecord.method,
            JSON.stringify({
              withdraw_id: id,
              requested_by_id: currentRecord.requested_by_id,
              shareholder_id: currentRecord.shareholder_id,
              withdraw_type: currentRecord.withdraw_type,
              transaction_reference: transactionRef,
              account_details: currentRecord.account_details,
            }),
          ]
        );
      }

      const updateRes = await queryDb(
        `UPDATE withdraws
         SET status = $1,
             processed_by_developer_id = COALESCE($2, processed_by_developer_id),
             notes = COALESCE($3, notes),
             transaction_reference = COALESCE($4, transaction_reference),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING *`,
        [newStatus, developerId, notes, transactionRef, id]
      );

      await queryDb('COMMIT');
      return NextResponse.json({
        success: true,
        message: `Withdrawal #${id} status updated to ${newStatus}`,
        record: updateRes.rows[0],
      });
    } catch (err: any) {
      await queryDb('ROLLBACK');
      throw err;
    }
  } catch (error: any) {
    console.error('Withdraws PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
