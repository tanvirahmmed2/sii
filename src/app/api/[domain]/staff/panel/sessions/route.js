import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { getStaffSession } from 'src/lib/middleware/staff';
import { isAdmin } from 'src/lib/middleware/developer';

async function verifyStaffAccess(request, context) {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }
  const devAdmin = await isAdmin();
  const staffSession = await getStaffSession(request);

  if (!staffSession && !devAdmin) {
    return { error: 'Unauthorized: Staff access required.', status: 401 };
  }

  if (!devAdmin && staffSession && String(staffSession.website_id) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
  }

  return { website, staffSession, devAdmin };
}

// GET: List all academic sessions
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const result = await queryDb(
      `SELECT * FROM website_sessions 
       WHERE website_id = $1 
       ORDER BY is_current DESC, start_date DESC NULLS LAST, id DESC`,
      [auth.website.id]
    );

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

// POST: Create academic session
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { name, start_date, end_date, is_current, status = 'active' } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, error: 'Session name is required (e.g. 2025-2026).' }, { status: 400 });
    }

    const trimmedName = String(name).trim();

    if (is_current) {
      await queryDb(
        `UPDATE website_sessions SET is_current = FALSE WHERE website_id = $1`,
        [auth.website.id]
      );
    }

    const insertRes = await queryDb(
      `INSERT INTO website_sessions (website_id, name, start_date, end_date, is_current, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        auth.website.id,
        trimmedName,
        start_date || null,
        end_date || null,
        Boolean(is_current),
        status || 'active'
      ]
    );

    return NextResponse.json({
      success: true,
      session: insertRes.rows[0],
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

// PUT: Update academic session
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { id, name, start_date, end_date, is_current, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Session ID is required.' }, { status: 400 });
    }

    if (is_current) {
      await queryDb(
        `UPDATE website_sessions SET is_current = FALSE WHERE website_id = $1 AND id != $2`,
        [auth.website.id, id]
      );
    }

    const updateRes = await queryDb(
      `UPDATE website_sessions
       SET name = COALESCE($1, name),
           start_date = COALESCE($2, start_date),
           end_date = COALESCE($3, end_date),
           is_current = COALESCE($4, is_current),
           status = COALESCE($5, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND website_id = $7
       RETURNING *`,
      [
        name !== undefined ? String(name).trim() : null,
        start_date !== undefined ? start_date : null,
        end_date !== undefined ? end_date : null,
        is_current !== undefined ? Boolean(is_current) : null,
        status !== undefined ? status : null,
        id,
        auth.website.id
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Session not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      session: updateRes.rows[0],
      message: 'Academic session updated successfully.'
    });
  } catch (error) {
    console.error('Error in PUT session:', error);
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'Another academic session already uses this name.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove academic session
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Session ID query parameter required.' }, { status: 400 });
    }

    const delRes = await queryDb(
      `DELETE FROM website_sessions WHERE id = $1 AND website_id = $2 RETURNING id`,
      [id, auth.website.id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Academic session not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Academic session deleted successfully.'
    });
  } catch (error) {
    console.error('Error in DELETE session:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
