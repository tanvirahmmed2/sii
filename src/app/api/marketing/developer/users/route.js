import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { hasModulePermission } from '@/lib/middleware/developer';

export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'users');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const res = await queryDb('SELECT * FROM users ORDER BY id DESC').catch(() => ({ rows: [] }));
    return NextResponse.json({ success: true, users: res.rows, records: res.rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// CREATE USER
export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'users');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const body = await request.json();
    const data = body.data || body;
    const keys = Object.keys(data).filter((k) => k !== 'id' && k !== 'action');
    if (keys.length === 0) return NextResponse.json({ success: true });
    const values = keys.map((k) => (typeof data[k] === 'object' && data[k] !== null ? JSON.stringify(data[k]) : data[k]));
    const placeholders = keys.map((_, i) => '$' + (i + 1));
    const res = await queryDb(
      `INSERT INTO users (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      values
    );
    return NextResponse.json({ success: true, user: res.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// UPDATE USER STATUS / BAN
export async function PATCH(request) {
  try {
    const auth = await hasModulePermission(request, 'users');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const body = await request.json();
    const id = body.userId || body.id;
    if (!id) return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });

    if (body.isBanned !== undefined) {
      const res = await queryDb('UPDATE users SET is_banned = $1 WHERE id = $2 RETURNING *', [Boolean(body.isBanned), id]);
      return NextResponse.json({ success: true, user: res.rows[0] });
    }

    if (body.toggleActive) {
      const res = await queryDb('UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING *', [id]);
      return NextResponse.json({ success: true, user: res.rows[0] });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE USER
export async function DELETE(request) {
  try {
    const auth = await hasModulePermission(request, 'users');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id') || searchParams.get('userId');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.userId || body.id;
    }
    if (!id) return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });

    const res = await queryDb('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    return NextResponse.json({ success: true, deleted: res.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
