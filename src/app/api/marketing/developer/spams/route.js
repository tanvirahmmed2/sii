import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { hasModulePermission } from '@/lib/middleware/developer';

export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'spams');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const res = await queryDb('SELECT * FROM spams ORDER BY id DESC').catch(() => ({ rows: [] }));
    return NextResponse.json({ success: true, spams: res.rows, records: res.rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// CREATE SPAM LOG
export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'spams');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const body = await request.json();
    const data = body.data || body;
    const keys = Object.keys(data).filter((k) => k !== 'id' && k !== 'action');
    const values = keys.map((k) => (typeof data[k] === 'object' && data[k] !== null ? JSON.stringify(data[k]) : data[k]));
    const placeholders = keys.map((_, i) => '$' + (i + 1));
    const res = await queryDb(
      `INSERT INTO spams (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      values
    );
    return NextResponse.json({ success: true, record: res.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// UPDATE SPAM STATUS
export async function PUT(request) {
  try {
    const auth = await hasModulePermission(request, 'spams');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const body = await request.json();
    const targetId = body.spamId || body.id || body.data?.id;
    if (!targetId) return NextResponse.json({ success: false, error: 'Spam ID is required' }, { status: 400 });

    const status = body.status || (body.action === 'block_spam' ? 'BLOCKED' : 'RESOLVED');
    const res = await queryDb('UPDATE spams SET status = $1 WHERE id = $2 RETURNING *', [status, targetId])
      .catch(() => ({ rows: [{ id: targetId, status }] }));

    return NextResponse.json({ success: true, spam: res.rows[0], record: res.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// DELETE SPAM
export async function DELETE(request) {
  try {
    const auth = await hasModulePermission(request, 'spams');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id') || searchParams.get('spamId');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.spamId || body.id;
    }
    if (!id) return NextResponse.json({ success: false, error: 'Spam ID is required' }, { status: 400 });

    await queryDb('DELETE FROM spams WHERE id = $1', [id]).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
