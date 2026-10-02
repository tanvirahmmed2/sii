import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';

export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, ['purchases', 'payments']);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const singleRes = await queryDb(
        `SELECT pu.*, 
                c.name AS creator_name, 
                c.email AS creator_email,
                p.name AS package_name, 
                p.slug AS package_slug,
                pay.status AS payment_status,
                pay.transaction_id,
                pay.payment_method,
                (COALESCE(pay.amount, pu.total_amount, 0) * 100)::bigint AS payment_amount,
                pay.amount AS payment_amount_usd
         FROM purchases pu
         LEFT JOIN creators c ON pu.creator_id = c.id
         LEFT JOIN packages p ON pu.package_id = p.id
         LEFT JOIN payments pay ON pay.purchase_id = pu.id
         WHERE pu.id = $1
         LIMIT 1`,
        [Number(id)]
      );

      return NextResponse.json({ success: true, record: singleRes.rows[0] || null });
    }

    const res = await queryDb(
      `SELECT pu.*, 
              c.name AS creator_name, 
              c.email AS creator_email,
              p.name AS package_name, 
              p.slug AS package_slug,
              pay.status AS payment_status,
              pay.transaction_id,
              pay.payment_method,
              (COALESCE(pay.amount, pu.total_amount, 0) * 100)::bigint AS payment_amount,
              pay.amount AS payment_amount_usd
       FROM purchases pu
       LEFT JOIN creators c ON pu.creator_id = c.id
       LEFT JOIN packages p ON pu.package_id = p.id
       LEFT JOIN payments pay ON pay.purchase_id = pu.id
       ORDER BY pu.id DESC`
    ).catch(() => ({ rows: [] }));

    return NextResponse.json({ success: true, table: 'purchases', records: res.rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, ['purchases', 'payments']);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }
    const body = await request.json();
    const data = body.data || body;
    const keys = Object.keys(data).filter((k) => k !== 'id' && k !== 'action');
    const values = keys.map((k) => (typeof data[k] === 'object' && data[k] !== null ? JSON.stringify(data[k]) : data[k]));
    const placeholders = keys.map((_, i) => '$' + (i + 1));
    const res = await queryDb(
      `INSERT INTO purchases (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      values
    );
    return NextResponse.json({ success: true, record: res.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(request) {
  try {
    const auth = await hasModulePermission(request, ['purchases', 'payments']);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }
    const body = await request.json();
    const id = body.id || body.data?.id;
    if (!id) return NextResponse.json({ success: false, error: 'Purchase ID is required' }, { status: 400 });
    const data = body.data || body;
    const keys = Object.keys(data).filter((k) => k !== 'id' && k !== 'action');
    if (keys.length === 0) return NextResponse.json({ success: true });
    const values = keys.map((k) => (typeof data[k] === 'object' && data[k] !== null ? JSON.stringify(data[k]) : data[k]));
    const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`);
    values.push(id);
    const res = await queryDb(
      `UPDATE purchases SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
      values
    );
    return NextResponse.json({ success: true, record: res.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request) {
  try {
    const auth = await hasModulePermission(request, ['purchases', 'payments']);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }
    if (!id) return NextResponse.json({ success: false, error: 'Purchase ID is required' }, { status: 400 });
    await queryDb('DELETE FROM purchases WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
