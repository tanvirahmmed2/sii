import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { hasModulePermission } from '@/lib/middleware/developer';

export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'subscriptions');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const res = await queryDb('SELECT * FROM subscription ORDER BY id DESC').catch(() => ({ rows: [] }));
    return NextResponse.json({ success: true, table: 'subscription', records: res.rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// CREATE SUBSCRIPTION
export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'subscriptions');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const body = await request.json();
    const data = body.data || body;
    const keys = Object.keys(data).filter((k) => k !== 'id' && k !== 'action');
    const values = keys.map((k) => (typeof data[k] === 'object' && data[k] !== null ? JSON.stringify(data[k]) : data[k]));
    const placeholders = keys.map((_, i) => '$' + (i + 1));
    const res = await queryDb(
      `INSERT INTO subscription (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      values
    );
    return NextResponse.json({ success: true, record: res.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// UPDATE SUBSCRIPTION
export async function PUT(request) {
  try {
    const auth = await hasModulePermission(request, 'subscriptions');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const body = await request.json();
    const id = body.id || body.data?.id;
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    const data = body.data || body;
    const keys = Object.keys(data).filter((k) => k !== 'id' && k !== 'action');
    if (keys.length === 0) return NextResponse.json({ success: true });
    const values = keys.map((k) => (typeof data[k] === 'object' && data[k] !== null ? JSON.stringify(data[k]) : data[k]));
    const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`);
    values.push(id);
    const res = await queryDb(
      `UPDATE subscription SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return NextResponse.json({ success: true, record: res.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// DELETE SUBSCRIPTION
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
    await queryDb('DELETE FROM subscription WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
