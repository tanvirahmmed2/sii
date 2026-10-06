import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { generateToken } from 'src/lib/utils/random';

export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'subscriptions');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const res = await queryDb(`
      SELECT pu.*,
             pu.id,
             pu.creator_id,
             pu.package_id,
             pu.status,
             pu.billing_cycle,
             pu.total_amount,
             pu.period_start AS current_period_start,
             pu.period_end AS current_period_end,
             c.name AS creator_name,
             c.email AS creator_email,
             p.name AS package_name,
             w.name AS website_name
      FROM purchases pu
      LEFT JOIN creators c ON pu.creator_id = c.id
      LEFT JOIN packages p ON pu.package_id = p.id
      LEFT JOIN websites w ON pu.website_id = w.id
      ORDER BY pu.id DESC
    `).catch(() => ({ rows: [] }));
    return NextResponse.json({ success: true, table: 'purchases', records: res.rows, subscriptions: res.rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// CREATE SUBSCRIPTION (INSERT INTO PURCHASES)
export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'subscriptions');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const body = await request.json();
    const rawData = body.data || body;
    const data = { ...rawData };

    if (data.current_period_end && !data.period_end) {
      data.period_end = data.current_period_end;
      delete data.current_period_end;
    }
    if (data.current_period_start && !data.period_start) {
      data.period_start = data.current_period_start;
      delete data.current_period_start;
    }
    delete data.cancel_at_period_end;

    if (data.status) {
      const s = String(data.status).toLowerCase();
      data.status = (s === 'active' || s === 'completed') ? 'completed' : (s === 'cancelled' ? 'cancelled' : 'pending');
    } else {
      data.status = 'completed';
    }

    if (!data.purchase_code) {
      data.purchase_code = generateToken(12);
    }
    if (data.total_amount === undefined) {
      data.total_amount = data.amount || 0;
    }
    if (data.billing_cycle === undefined) {
      data.billing_cycle = data.billing_interval || 'monthly';
    }

    const allowedKeys = [
      'creator_id', 'website_id', 'package_id', 'purchase_code', 'billing_cycle',
      'base_amount', 'discount_amount', 'tax_amount', 'total_amount', 'status',
      'period_start', 'period_end', 'invoice_pdf_url', 'notes'
    ];

    const keys = Object.keys(data).filter((k) => allowedKeys.includes(k));
    const values = keys.map((k) => (typeof data[k] === 'object' && data[k] !== null ? JSON.stringify(data[k]) : data[k]));
    const placeholders = keys.map((_, i) => '$' + (i + 1));
    const res = await queryDb(
      `INSERT INTO purchases (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      values
    );
    return NextResponse.json({ success: true, record: res.rows[0], subscription: res.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// UPDATE SUBSCRIPTION (UPDATE PURCHASES)
export async function PUT(request) {
  try {
    const auth = await hasModulePermission(request, 'subscriptions');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const body = await request.json();
    const id = body.id || body.data?.id;
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    
    const rawData = body.data || body;
    const data = { ...rawData };

    if (data.current_period_end && !data.period_end) {
      data.period_end = data.current_period_end;
      delete data.current_period_end;
    }
    if (data.current_period_start && !data.period_start) {
      data.period_start = data.current_period_start;
      delete data.current_period_start;
    }
    delete data.cancel_at_period_end;

    if (data.status) {
      const s = String(data.status).toLowerCase();
      data.status = (s === 'active' || s === 'completed') ? 'completed' : (s === 'cancelled' ? 'cancelled' : 'pending');
    }

    const allowedKeys = [
      'website_id', 'package_id', 'billing_cycle', 'base_amount', 'discount_amount',
      'tax_amount', 'total_amount', 'status', 'period_start', 'period_end',
      'invoice_pdf_url', 'notes'
    ];

    const keys = Object.keys(data).filter((k) => allowedKeys.includes(k));
    if (keys.length === 0) return NextResponse.json({ success: true });
    const values = keys.map((k) => (typeof data[k] === 'object' && data[k] !== null ? JSON.stringify(data[k]) : data[k]));
    const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`);
    values.push(id);
    const res = await queryDb(
      `UPDATE purchases SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
      values
    );
    return NextResponse.json({ success: true, record: res.rows[0], subscription: res.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// DELETE SUBSCRIPTION (DELETE FROM PURCHASES)
export async function DELETE(request) {
  try {
    const auth = await hasModulePermission(request, 'subscriptions');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    await queryDb('DELETE FROM purchases WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
