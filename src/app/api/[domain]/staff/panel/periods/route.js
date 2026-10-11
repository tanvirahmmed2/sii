import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
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

  const staffWebsiteId = staffSession?.website_id || staffSession?.websiteId || staffSession?.staff?.websiteId || staffSession?.staff?.website_id;
  if (staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
  }

  return { website, staffSession };
}

// GET: List periods (filter optionally by day_id)
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const dayId = searchParams.get('day_id');

    let queryText = `
      SELECT p.*,
             d.name AS day_name,
             d.day_order,
             d.status AS day_status,
             COALESCE((SELECT COUNT(*) FROM website_period_class_subjects pcs WHERE pcs.period_id = p.id), 0)::int AS routine_count
      FROM website_periods p
      JOIN website_days d ON d.id = p.day_id
      WHERE p.website_id = $1
    `;
    const params = [auth.website.id];

    if (dayId) {
      params.push(dayId);
      queryText += ` AND p.day_id = $2`;
    }

    queryText += ` ORDER BY d.day_order ASC, p.start_time ASC, p.id ASC`;

    const result = await queryDb(queryText, params);

    return NextResponse.json({
      success: true,
      periods: result.rows,
      payload: { periods: result.rows }
    });
  } catch (error) {
    console.error('Error in GET periods:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create period
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { day_id, name, start_time, end_time, is_break = false } = body;

    if (!day_id || !name || !start_time || !end_time) {
      return NextResponse.json({ success: false, error: 'Day, Period Name, Start Time, and End Time are required.' }, { status: 400 });
    }

    // Verify day exists for tenant
    const dayCheck = await queryDb(
      `SELECT id FROM website_days WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [day_id, auth.website.id]
    );

    if (dayCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Selected day does not exist in this portal.' }, { status: 404 });
    }

    const insertRes = await queryDb(
      `INSERT INTO website_periods (website_id, day_id, name, start_time, end_time, is_break)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        auth.website.id,
        day_id,
        String(name).trim(),
        String(start_time).trim(),
        String(end_time).trim(),
        Boolean(is_break)
      ]
    );

    return NextResponse.json({
      success: true,
      period: insertRes.rows[0],
      message: 'Period created successfully.'
    });
  } catch (error) {
    console.error('Error in POST period:', error);
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'A period with this name already exists for this day.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update period
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { id, day_id, name, start_time, end_time, is_break } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Period ID is required.' }, { status: 400 });
    }

    const updateRes = await queryDb(
      `UPDATE website_periods
       SET day_id = COALESCE($1, day_id),
           name = COALESCE($2, name),
           start_time = COALESCE($3, start_time),
           end_time = COALESCE($4, end_time),
           is_break = COALESCE($5, is_break),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND website_id = $7
       RETURNING *`,
      [
        day_id !== undefined ? day_id : null,
        name !== undefined ? String(name).trim() : null,
        start_time !== undefined ? String(start_time).trim() : null,
        end_time !== undefined ? String(end_time).trim() : null,
        is_break !== undefined ? Boolean(is_break) : null,
        id,
        auth.website.id
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Period not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      period: updateRes.rows[0],
      message: 'Period updated successfully.'
    });
  } catch (error) {
    console.error('Error in PUT period:', error);
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'Another period already uses this name for this day.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove period
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Period ID query parameter required.' }, { status: 400 });
    }

    const delRes = await queryDb(
      `DELETE FROM website_periods WHERE id = $1 AND website_id = $2 RETURNING id`,
      [id, auth.website.id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Period not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Period and its assigned routines deleted successfully.'
    });
  } catch (error) {
    console.error('Error in DELETE period:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
