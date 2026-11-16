import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyStaffModuleAccess } from 'src/lib/middleware/staff.js';

async function verifyStaffAccess(request, context, action = 'view') {
  return verifyStaffModuleAccess(request, context, 'routine', action);
}

export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context, 'view');
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();

    let query = `
      SELECT s.*,
             COALESCE((SELECT COUNT(*) FROM website_students st WHERE st.session_id = s.id), 0)::int AS student_count,
             0::int AS class_count
      FROM website_sessions s
      WHERE s.website_id = $1
    `;
    const params = [auth.website.id];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND s.name ILIKE $${params.length}`;
    }

    query += ` ORDER BY s.name ASC, s.id DESC`;

    const result = await queryDb(query, params);

    return NextResponse.json({
      success: true,
      sessions: result.rows,
      payload: { sessions: result.rows }
    });
  } catch (error) {
    console.error('Error in GET sessions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context, 'create');
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { name, status = 'active' } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, error: 'Session Name is required (e.g., 2026-2027).' }, { status: 400 });
    }

    const trimmedName = String(name).trim();

    const insertRes = await queryDb(
      `INSERT INTO website_sessions (website_id, name, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [
        auth.website.id,
        trimmedName,
        status || 'active'
      ]
    );

    const savedRow = insertRes.rows[0];

    return NextResponse.json({
      success: true,
      session: { ...savedRow, class_count: 0 },
      message: 'Academic session created successfully.'
    });
  } catch (error) {
    console.error('Error in POST session:', error);
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'An academic session with this name already exists.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context, 'edit');
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { id, name, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Session ID is required.' }, { status: 400 });
    }

    const updateRes = await queryDb(
      `UPDATE website_sessions
       SET name = COALESCE($1, name),
           status = COALESCE($2, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND website_id = $4
       RETURNING *`,
      [
        name ? String(name).trim() : null,
        status || null,
        id,
        auth.website.id
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Session not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      session: { ...updateRes.rows[0], class_count: 0 },
      message: 'Academic session updated successfully.'
    });
  } catch (error) {
    console.error('Error in PUT session:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context, 'delete');
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Session ID is required.' }, { status: 400 });
    }

    const delRes = await queryDb(
      `DELETE FROM website_sessions WHERE id = $1 AND website_id = $2 RETURNING id, name`,
      [id, auth.website.id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Session not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Academic session "${delRes.rows[0].name}" deleted successfully.`
    });
  } catch (error) {
    console.error('Error in DELETE session:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
