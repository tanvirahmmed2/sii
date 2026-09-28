import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { hasModulePermission } from '@/lib/middleware/developer';

// GET ALL SUBSCRIBERS
export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'subscribers');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const res = await queryDb('SELECT * FROM subscribers WHERE id = $1 LIMIT 1', [Number(id)]);
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Subscriber not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, record: res.rows[0] });
    }

    const res = await queryDb('SELECT * FROM subscribers ORDER BY id DESC').catch(() => ({ rows: [] }));
    return NextResponse.json({ success: true, table: 'subscribers', records: res.rows });
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: MANUAL CREATION DISABLED
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Manual subscriber creation in the developer panel is disabled. Subscribers are registered via the public website footer.',
    },
    { status: 403 }
  );
}

// PUT: UPDATE STATUS
export async function PUT(request) {
  try {
    const auth = await hasModulePermission(request, 'subscribers');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const body = await request.json().catch(() => ({}));
    const id = body.id || body.data?.id;
    const status = body.status || body.data?.status;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'Subscriber ID and status are required.' }, { status: 400 });
    }

    const res = await queryDb(
      'UPDATE subscribers SET status = $1 WHERE id = $2 RETURNING *',
      [status, Number(id)]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Subscriber not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, record: res.rows[0], message: 'Subscriber status updated.' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE SUBSCRIBER
export async function DELETE(request) {
  try {
    const auth = await hasModulePermission(request, 'subscribers');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Subscriber ID is required.' }, { status: 400 });
    }

    const res = await queryDb('DELETE FROM subscribers WHERE id = $1 RETURNING id', [Number(id)]);
    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Subscriber not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Subscriber removed successfully.' });
  } catch (error) {
    console.error('Error deleting subscriber:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
