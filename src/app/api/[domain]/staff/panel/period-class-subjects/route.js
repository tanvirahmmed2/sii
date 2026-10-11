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

// GET: List routine timetable allocations
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const dayId = searchParams.get('day_id');
    const classId = searchParams.get('class_id');
    const sectionId = searchParams.get('section_id');
    const sessionId = searchParams.get('session_id');

    let queryText = `
      SELECT pcs.*,
             p.name AS period_name,
             p.start_time,
             p.end_time,
             p.is_break,
             p.day_id,
             d.name AS day_name,
             d.day_order,
             cs.class_id,
             cs.subject_id,
             c.name AS class_name,
             c.numeric_name AS class_numeric,
             s.name AS subject_name,
             s.code AS subject_code,
             sec.name AS section_name,
             sess.name AS session_name
      FROM website_period_class_subjects pcs
      JOIN website_periods p ON p.id = pcs.period_id
      JOIN website_days d ON d.id = p.day_id
      JOIN website_class_subjects cs ON cs.id = pcs.class_subject_id
      JOIN website_classes c ON c.id = cs.class_id
      JOIN website_subjects s ON s.id = cs.subject_id
      LEFT JOIN website_sections sec ON sec.id = pcs.section_id
      LEFT JOIN website_sessions sess ON sess.id = pcs.session_id
      WHERE pcs.website_id = $1
    `;
    const params = [auth.website.id];

    if (dayId) {
      params.push(dayId);
      queryText += ` AND p.day_id = $${params.length}`;
    }
    if (classId) {
      params.push(classId);
      queryText += ` AND cs.class_id = $${params.length}`;
    }
    if (sectionId) {
      params.push(sectionId);
      queryText += ` AND pcs.section_id = $${params.length}`;
    }
    if (sessionId) {
      params.push(sessionId);
      queryText += ` AND pcs.session_id = $${params.length}`;
    }

    queryText += ` ORDER BY d.day_order ASC, p.start_time ASC, c.numeric_name ASC`;

    const result = await queryDb(queryText, params);

    return NextResponse.json({
      success: true,
      routines: result.rows,
      payload: { routines: result.rows }
    });
  } catch (error) {
    console.error('Error in GET period-class-subjects:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Allocate class subject to period
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { period_id, class_subject_id, section_id = null, session_id = null, room_number = '' } = body;

    if (!period_id || !class_subject_id) {
      return NextResponse.json({ success: false, error: 'Both Period and Class Subject are required.' }, { status: 400 });
    }

    // Verify period and class_subject belong to tenant
    const verifyPeriod = await queryDb(
      `SELECT id FROM website_periods WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [period_id, auth.website.id]
    );
    const verifyCS = await queryDb(
      `SELECT id FROM website_class_subjects WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [class_subject_id, auth.website.id]
    );

    if (verifyPeriod.rows.length === 0 || verifyCS.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Period or Class Subject does not exist in this portal.' }, { status: 404 });
    }

    const insertRes = await queryDb(
      `INSERT INTO website_period_class_subjects (
         website_id, period_id, class_subject_id, section_id, session_id, room_number
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        auth.website.id,
        period_id,
        class_subject_id,
        section_id || null,
        session_id || null,
        room_number ? String(room_number).trim() : null
      ]
    );

    return NextResponse.json({
      success: true,
      routine: insertRes.rows[0],
      message: 'Class subject assigned to period routine.'
    });
  } catch (error) {
    console.error('Error in POST period-class-subject:', error);
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'This class subject and section is already allocated to this period.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update routine allocation
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { id, period_id, class_subject_id, section_id, session_id, room_number } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Routine allocation ID is required.' }, { status: 400 });
    }

    const updateRes = await queryDb(
      `UPDATE website_period_class_subjects
       SET period_id = COALESCE($1, period_id),
           class_subject_id = COALESCE($2, class_subject_id),
           section_id = COALESCE($3, section_id),
           session_id = COALESCE($4, session_id),
           room_number = COALESCE($5, room_number),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND website_id = $7
       RETURNING *`,
      [
        period_id !== undefined ? period_id : null,
        class_subject_id !== undefined ? class_subject_id : null,
        section_id !== undefined ? section_id : null,
        session_id !== undefined ? session_id : null,
        room_number !== undefined ? String(room_number).trim() : null,
        id,
        auth.website.id
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Routine slot not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      routine: updateRes.rows[0],
      message: 'Routine slot updated successfully.'
    });
  } catch (error) {
    console.error('Error in PUT period-class-subject:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove routine allocation
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Routine ID query parameter required.' }, { status: 400 });
    }

    const delRes = await queryDb(
      `DELETE FROM website_period_class_subjects WHERE id = $1 AND website_id = $2 RETURNING id`,
      [id, auth.website.id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Routine slot not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Routine slot removed successfully.'
    });
  } catch (error) {
    console.error('Error in DELETE period-class-subject:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
