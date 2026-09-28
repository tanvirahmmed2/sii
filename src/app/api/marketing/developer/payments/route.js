import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { hasModulePermission } from '@/lib/middleware/developer';

export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'payments');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const singleRes = await queryDb(
        `SELECT pay.*, 
                c.name AS creator_name, 
                c.email AS creator_email,
                p.name AS package_name, 
                p.billing_interval,
                s.status AS subscription_status,
                s.current_period_end,
                pu.status AS purchase_status,
                pu.notes AS purchase_notes
         FROM payment pay
         LEFT JOIN creators c ON pay.creator_id = c.id
         LEFT JOIN packages p ON pay.package_id = p.id
         LEFT JOIN subscription s ON pay.subscription_id = s.id
         LEFT JOIN purchases pu ON pay.purchase_id = pu.id
         WHERE pay.id = $1
         LIMIT 1`,
        [Number(id)]
      );

      const txRes = await queryDb(
        `SELECT * FROM payment_transactions WHERE payment_id = $1 ORDER BY id DESC`,
        [Number(id)]
      ).catch(() => ({ rows: [] }));

      return NextResponse.json({
        success: true,
        record: singleRes.rows[0] || null,
        transactions: txRes.rows,
      });
    }

    const res = await queryDb(
      `SELECT pay.*, 
              c.name AS creator_name, 
              c.email AS creator_email,
              p.name AS package_name, 
              p.billing_interval,
              s.status AS subscription_status,
              s.current_period_end,
              pu.status AS purchase_status
       FROM payment pay
       LEFT JOIN creators c ON pay.creator_id = c.id
       LEFT JOIN packages p ON pay.package_id = p.id
       LEFT JOIN subscription s ON pay.subscription_id = s.id
       LEFT JOIN purchases pu ON pay.purchase_id = pu.id
       ORDER BY pay.id DESC`
    ).catch(() => ({ rows: [] }));

    return NextResponse.json({ success: true, table: 'payment', records: res.rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// CREATE PAYMENT
export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'payments');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }
    const body = await request.json();
    const data = body.data || body;
    const keys = Object.keys(data).filter((k) => k !== 'id' && k !== 'action');
    const values = keys.map((k) => (typeof data[k] === 'object' && data[k] !== null ? JSON.stringify(data[k]) : data[k]));
    const placeholders = keys.map((_, i) => '$' + (i + 1));
    const res = await queryDb(
      `INSERT INTO payment (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      values
    );
    return NextResponse.json({ success: true, record: res.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// UPDATE PAYMENT & AUTO-PROVISION SUBSCRIPTION IF MARKED PAID
export async function PUT(request) {
  try {
    const auth = await hasModulePermission(request, 'payments');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const body = await request.json();
    const id = Number(body.id || body.data?.id);
    if (!id) return NextResponse.json({ success: false, error: 'Payment ID is required' }, { status: 400 });

    const data = body.data || body;
    const requestedStatus = (data.status || '').toUpperCase();

    // Fetch existing payment record
    const existingRes = await queryDb('SELECT * FROM payment WHERE id = $1 LIMIT 1', [id]);
    const existing = existingRes.rows[0];
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Payment record not found' }, { status: 404 });
    }

    let createdSubscription = null;
    let subscriptionId = existing.subscription_id;

    // If changing status to COMPLETED or PAID and unpaid
    const isBecomingPaid = (requestedStatus === 'COMPLETED' || requestedStatus === 'PAID') && existing.status !== 'COMPLETED';

    if (isBecomingPaid) {
      // 1. Check or create subscription
      if (!subscriptionId && existing.creator_id && existing.package_id) {
        // Fetch package to determine billing interval
        const pkgRes = await queryDb('SELECT * FROM packages WHERE id = $1 LIMIT 1', [existing.package_id]);
        const pkg = pkgRes.rows[0];
        const isYearly = String(pkg?.billing_interval || '').toUpperCase() === 'YEARLY';
        const durationInterval = isYearly ? "INTERVAL '365 days'" : "INTERVAL '30 days'";

        const subRes = await queryDb(
          `INSERT INTO subscription (creator_id, package_id, status, current_period_start, current_period_end)
           VALUES ($1, $2, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ${durationInterval})
           RETURNING *`,
          [existing.creator_id, existing.package_id]
        );
        createdSubscription = subRes.rows[0];
        subscriptionId = createdSubscription.id;
      }

      // 2. Mark linked purchase as COMPLETED
      if (existing.purchase_id) {
        await queryDb(
          `UPDATE purchases SET status = 'COMPLETED', payment_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [existing.id, existing.purchase_id]
        );
      }

      // 3. Log into payment_transactions
      await queryDb(
        `INSERT INTO payment_transactions (payment_id, creator_id, purchase_id, transaction_id, gateway, amount_in_cents, currency, status, gateway_response, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'SUCCESS', $8, $9)`,
        [
          existing.id,
          existing.creator_id,
          existing.purchase_id,
          existing.transaction_id || `MANUAL_${Date.now()}`,
          existing.payment_method || 'MANUAL',
          existing.amount_in_cents || 0,
          existing.currency || 'USD',
          JSON.stringify({ note: 'Marked as paid by staff', updated_by: auth.staff?.name || 'Staff' }),
          JSON.stringify({ staff_id: auth.staff?.id, updated_at: new Date().toISOString(), subscription_id: subscriptionId }),
        ]
      ).catch((err) => console.warn('Payment transaction log warning:', err.message));
    }

    // Build update clauses
    const updateData = { ...data };
    delete updateData.id;
    delete updateData.action;

    if (isBecomingPaid) {
      updateData.status = 'COMPLETED';
      if (subscriptionId) updateData.subscription_id = subscriptionId;
    }

    const keys = Object.keys(updateData);
    if (keys.length === 0) {
      return NextResponse.json({ success: true, record: existing, subscription: createdSubscription });
    }

    const values = keys.map((k) =>
      typeof updateData[k] === 'object' && updateData[k] !== null ? JSON.stringify(updateData[k]) : updateData[k]
    );
    const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`);
    values.push(id);

    const res = await queryDb(
      `UPDATE payment SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
      values
    );

    return NextResponse.json({
      success: true,
      message: isBecomingPaid ? 'Payment marked as paid and subscription activated successfully!' : 'Payment updated successfully.',
      record: res.rows[0],
      subscription: createdSubscription,
    });
  } catch (error) {
    console.error('Developer payment update error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// DELETE PAYMENT
export async function DELETE(request) {
  try {
    const auth = await hasModulePermission(request, 'payments');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    await queryDb('DELETE FROM payment WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
