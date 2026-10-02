import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';

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
                (pay.amount * 100)::bigint AS amount_in_cents,
                c.name AS creator_name, 
                c.email AS creator_email,
                p.name AS package_name, 
                pu.billing_cycle AS billing_interval,
                pu.status AS subscription_status,
                pu.period_end AS current_period_end,
                pu.status AS purchase_status,
                pu.notes AS purchase_notes
         FROM payments pay
         LEFT JOIN creators c ON pay.creator_id = c.id
         LEFT JOIN purchases pu ON pay.purchase_id = pu.id
         LEFT JOIN packages p ON pu.package_id = p.id
         WHERE pay.id = $1
         LIMIT 1`,
        [Number(id)]
      );

      return NextResponse.json({
        success: true,
        record: singleRes.rows[0] || null,
        transactions: [],
      });
    }

    const res = await queryDb(
      `SELECT pay.*, 
              (pay.amount * 100)::bigint AS amount_in_cents,
              c.name AS creator_name, 
              c.email AS creator_email,
              p.name AS package_name, 
              pu.billing_cycle AS billing_interval,
              pu.status AS subscription_status,
              pu.period_end AS current_period_end,
              pu.status AS purchase_status
       FROM payments pay
       LEFT JOIN creators c ON pay.creator_id = c.id
       LEFT JOIN purchases pu ON pay.purchase_id = pu.id
       LEFT JOIN packages p ON pu.package_id = p.id
       ORDER BY pay.id DESC`
    ).catch(() => ({ rows: [] }));

    return NextResponse.json({ success: true, table: 'payments', records: res.rows });
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
    const keys = Object.keys(data).filter((k) => k !== 'id' && k !== 'action' && k !== 'creator_name' && k !== 'package_name');
    const values = keys.map((k) => (typeof data[k] === 'object' && data[k] !== null ? JSON.stringify(data[k]) : data[k]));
    const placeholders = keys.map((_, i) => '$' + (i + 1));
    const res = await queryDb(
      `INSERT INTO payments (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
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
    const requestedStatus = (data.status || '').toLowerCase();

    // Fetch existing payment record
    const existingRes = await queryDb('SELECT * FROM payments WHERE id = $1 LIMIT 1', [id]);
    const existing = existingRes.rows[0];
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Payment record not found' }, { status: 404 });
    }

    let completedPurchase = null;
    const isBecomingPaid = (requestedStatus === 'successful' || requestedStatus === 'completed' || requestedStatus === 'paid') && existing.status !== 'successful';

    if (isBecomingPaid && existing.purchase_id) {
      // Fetch purchase to determine duration
      const puRes = await queryDb('SELECT * FROM purchases WHERE id = $1', [existing.purchase_id]);
      const pu = puRes.rows[0];
      const isYearly = String(pu?.billing_cycle || '').toLowerCase() === 'yearly';
      const durationInterval = isYearly ? "INTERVAL '365 days'" : "INTERVAL '30 days'";

      const updatedPuRes = await queryDb(
        `UPDATE purchases 
         SET status = 'completed', 
             period_start = CURRENT_TIMESTAMP, 
             period_end = CURRENT_TIMESTAMP + ${durationInterval}, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1 
         RETURNING *`,
        [existing.purchase_id]
      );
      completedPurchase = updatedPuRes.rows[0];
    }

    // Build update clauses
    const updateData = { ...data };
    delete updateData.id;
    delete updateData.action;
    delete updateData.creator_name;
    delete updateData.package_name;
    delete updateData.amount_in_cents;

    if (isBecomingPaid) {
      updateData.status = 'successful';
    }

    const keys = Object.keys(updateData);
    if (keys.length === 0) {
      return NextResponse.json({ success: true, record: existing, purchase: completedPurchase });
    }

    const values = keys.map((k) =>
      typeof updateData[k] === 'object' && updateData[k] !== null ? JSON.stringify(updateData[k]) : updateData[k]
    );
    const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`);
    values.push(id);

    const res = await queryDb(
      `UPDATE payments SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
      values
    );

    return NextResponse.json({
      success: true,
      message: isBecomingPaid ? 'Payment marked as successful and purchase activated!' : 'Payment updated successfully.',
      record: res.rows[0],
      purchase: completedPurchase,
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
    await queryDb('DELETE FROM payments WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
