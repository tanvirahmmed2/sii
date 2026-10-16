import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/websiteResolver.js';
import { getStaffSession } from 'src/lib/middleware/staff';

async function verifyStaffAccess(request, context) {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }
  const staffSession = await getStaffSession(request);

  if (!staffSession) {
    return { error: 'Unauthorized: Staff access required.', status: 401 };
  }

  const staffWebsiteId =
    staffSession?.website_id ||
    staffSession?.websiteId ||
    staffSession?.staff?.websiteId ||
    staffSession?.staff?.website_id;

  if (staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
  }

  return { website, staffSession };
}

// GET: List all academic sessions (independent entity)
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
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

    query += ` ORDER BY s.is_current DESC, s.id DESC`;

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

// POST: Create academic session
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { name, is_current = false, status = 'active' } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, error: 'Session Name is required (e.g., 2026-2027).' }, { status: 400 });
    }

    const trimmedName = String(name).trim();

    // If marked as current, reset other sessions' is_current to false
    if (is_current) {
      await queryDb(
        `UPDATE website_sessions SET is_current = FALSE WHERE website_id = $1`,
        [auth.website.id]
      );
    }

    const insertRes = await queryDb(
      `INSERT INTO website_sessions (website_id, name, is_current, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        auth.website.id,
        trimmedName,
        Boolean(is_current),
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

// PUT: Update academic session
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { id, name, is_current, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Session ID is required.' }, { status: 400 });
    }

    // If marked current, clear other current sessions first
    if (is_current) {
      await queryDb(
        `UPDATE website_sessions SET is_current = FALSE WHERE website_id = $1 AND id != $2`,
        [auth.website.id, id]
      );
    }

    const updateRes = await queryDb(
      `UPDATE website_sessions
       SET name = COALESCE($1, name),
           is_current = COALESCE($2, is_current),
           status = COALESCE($3, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND website_id = $5
       RETURNING *`,
      [
        name ? String(name).trim() : null,
        is_current !== undefined ? Boolean(is_current) : null,
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

// DELETE: Delete academic session
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
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
