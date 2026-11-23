import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';

export async function GET(request: any) {
  try {
    const auth = await hasModulePermission(request, 'withdraws');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const currency = searchParams.get('currency');

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

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT w.*,
             req.name AS requester_name,
             req.email AS requester_email,
             proc.name AS processor_name,
             proc.email AS processor_email
      FROM withdraws w
      LEFT JOIN developers req ON w.requested_by_id = req.id
      LEFT JOIN developers proc ON w.processed_by_developer_id = proc.id
      ${whereClause}
      ORDER BY w.id DESC
    `;

    const recordsRes = await queryDb(query, params);

    const balRes = await queryDb(`SELECT * FROM platform_balances ORDER BY currency ASC`);

    return NextResponse.json({
      success: true,
      records: recordsRes.rows,
      balances: balRes.rows,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: any) {
  try {
    const auth = await hasModulePermission(request, 'withdraws');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const developerId = auth.developer?.id || auth.user?.id;
    if (!developerId) {
      return NextResponse.json({ success: false, error: 'Developer ID missing' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const amount = Number(body.amount);
    const currency = String(body.currency || 'BDT').toUpperCase();
    const method = String(body.method || 'bank_transfer');
    const fee = Number(body.fee || 0);
    const netAmount = Math.max(0, amount - fee);
    const notes = String(body.notes || '');
    const accountDetails = body.account_details || {
      bank_name: body.bank_name || '',
      account_number: body.account_number || '',
      account_holder: body.account_holder || '',
      branch: body.branch || '',
      routing_number: body.routing_number || '',
      phone: body.phone || '',
    };

    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Valid amount greater than zero is required' }, { status: 400 });
    }

    const balRes = await queryDb(`SELECT available_balance FROM platform_balances WHERE currency = $1 LIMIT 1`, [currency]);
    const available = balRes.rows.length > 0 ? Number(balRes.rows[0].available_balance) : 0;

    if (amount > available) {
      return NextResponse.json({
        success: false,
        error: `Insufficient available balance (${available.toLocaleString()} ${currency}) for withdrawal request`,
      }, { status: 400 });
    }

    const insertRes = await queryDb(
      `INSERT INTO withdraws (
        requested_by_id, amount, currency, fee, net_amount, method,
        account_details, status, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, 'pending', $8
      ) RETURNING *`,
      [developerId, amount, currency, fee, netAmount, method, JSON.stringify(accountDetails), notes]
    );

    return NextResponse.json({
      success: true,
      message: 'Withdrawal request created successfully in pending state',
      record: insertRes.rows[0],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: any) {
  try {
    const auth = await hasModulePermission(request, 'withdraws');
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

        await queryDb(
          `INSERT INTO cashflows (
            title, category, flow_type, amount, currency, balance_after,
            reference_type, reference_id, developer_id, payment_method, metadata
          ) VALUES (
            $1, 'withdrawal', 'outflow', $2, $3, $4,
            'withdrawal', $5, $6, $7, $8
          )`,
          [
            `Disbursement for Withdrawal #${id}`,
            withdrawAmount,
            cur,
            newBal,
            id,
            developerId,
            currentRecord.method,
            JSON.stringify({
              withdraw_id: id,
              requested_by_id: currentRecord.requested_by_id,
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
