import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { hasModulePermission } from '@/lib/middleware/developer';

export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'creators');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const res = await queryDb(`
      SELECT c.id, c.name, c.email, c.phone, c.bio, c.is_active, c.is_verified, c.two_factor_enabled, c.created_at,
             COUNT(DISTINCT w.id)::int AS websites_count,
             p.name AS current_package,
             s.status AS subscription_status
      FROM creators c
      LEFT JOIN websites w ON w.creator_id = c.id
      LEFT JOIN LATERAL (
        SELECT sub.package_id, sub.status 
        FROM subscription sub 
        WHERE sub.creator_id = c.id 
        ORDER BY sub.id DESC LIMIT 1
      ) s ON true
      LEFT JOIN packages p ON p.id = s.package_id
      GROUP BY c.id, p.name, s.status
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
