import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';

export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'creators');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const res = await queryDb(`
      SELECT c.id, c.name, c.email, c.phone, c.institution, c.country, c.city, c.address,
             c.institution AS bio, c.is_active, c.email_verified AS is_verified,
             (CASE WHEN c.two_factor_code IS NOT NULL THEN true ELSE false END) AS two_factor_enabled,
             c.last_login_at, c.created_at,
             COUNT(DISTINCT w.id)::int AS websites_count,
             p.name AS current_package,
             pu.status AS subscription_status
      FROM creators c
      LEFT JOIN websites w ON w.creator_id = c.id
      LEFT JOIN LATERAL (
        SELECT psub.package_id, psub.status 
        FROM purchases psub 
        WHERE psub.creator_id = c.id 
        ORDER BY psub.id DESC LIMIT 1
      ) pu ON true
      LEFT JOIN packages p ON p.id = pu.package_id
      GROUP BY c.id, p.name, pu.status
      ORDER BY c.id DESC
    `).catch(() => ({ rows: [] }));

    return NextResponse.json({ success: true, creators: res.rows, records: res.rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// CREATE CREATOR
export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'creators');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Access denied' }, { status: auth.status || 403 });
    }

    const body = await request.json();
    const data = body.data || body;
    const keys = Object.keys(data).filter((k) => k !== 'id' && k !== 'action' && k !== 'role');
    const values = keys.map((k) => (typeof data[k] === 'object' && data[k] !== null ? JSON.stringify(data[k]) : data[k]));
    const placeholders = keys.map((_, i) => '$' + (i + 1));
    const res = await queryDb(
      `INSERT INTO creators (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      values
    );
    return NextResponse.json({ success: true, record: res.rows[0], creator: res.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// UPDATE CREATOR
export async function PUT(request) {
  try {
    const auth = await hasModulePermission(request, 'creators');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Access denied' }, { status: auth.status || 403 });
    }

    const body = await request.json();
    const id = body.creatorId || body.id || body.data?.id;
    if (!id) return NextResponse.json({ success: false, error: 'Creator ID is required' }, { status: 400 });

    if (body.toggle_active !== undefined) {
      const res = await queryDb('UPDATE creators SET is_active = NOT is_active WHERE id = $1 RETURNING *', [id]);
      return NextResponse.json({ success: true, creator: res.rows[0], record: res.rows[0] });
    }

    const data = body.data || body;
    const keys = Object.keys(data).filter((k) => k !== 'id' && k !== 'creatorId' && k !== 'action' && k !== 'role' && k !== 'password');
    if (keys.length === 0) return NextResponse.json({ success: true });
    const values = keys.map((k) => (typeof data[k] === 'object' && data[k] !== null ? JSON.stringify(data[k]) : data[k]));
    const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`);
    values.push(id);
    const res = await queryDb(
      `UPDATE creators SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return NextResponse.json({ success: true, creator: res.rows[0], record: res.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// DELETE CREATOR
export async function DELETE(request) {
  try {
    const auth = await hasModulePermission(request, 'creators');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Access denied' }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id') || searchParams.get('creatorId');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id || body.creatorId;
    }
    if (!id) return NextResponse.json({ success: false, error: 'Creator ID is required' }, { status: 400 });
    await queryDb('DELETE FROM creators WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
