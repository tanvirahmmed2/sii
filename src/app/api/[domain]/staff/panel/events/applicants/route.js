import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStaffSession } from 'src/lib/middleware/staff.js';
import { getOfficerSession } from 'src/lib/middleware/officer.js';

async function verifyStaffOrOfficerAccess(request, context) {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }

  // 1. Staff session
  try {
    const staffSession = await getStaffSession(request);
    if (staffSession) {
      const staffWebsiteId =
        staffSession?.website_id ||
        staffSession?.websiteId ||
        staffSession?.staff?.websiteId ||
        staffSession?.staff?.website_id;

      if (!staffWebsiteId || String(staffWebsiteId) === String(website.id)) {
        return {
          website,
          userType: 'staff',
          user: staffSession.staff || staffSession.user,
          userId: staffSession.staff_id || staffSession.staffId || staffSession.staff?.id,
          userName: staffSession.staff?.name || staffSession.user?.name || 'Staff Member',
        };
      }
    }
  } catch (e) {
    console.warn('Error checking staff session:', e?.message);
  }

  // 2. Officer session
  try {
    const officerSession = await getOfficerSession(request);
    if (officerSession) {
      const officerWebsiteId =
        officerSession?.website_id ||
        officerSession?.websiteId ||
        officerSession?.officer?.websiteId ||
        officerSession?.officer?.website_id;

      if (!officerWebsiteId || String(officerWebsiteId) === String(website.id)) {
        return {
          website,
          userType: 'officer',
          user: officerSession.officer || officerSession.user,
          userId: officerSession.officer_id || officerSession.id,
          userName: officerSession.officer?.name || officerSession.user?.name || 'Officer',
        };
      }
    }
  } catch (e) {
    console.warn('Error checking officer session:', e?.message);
  }

  return { error: 'Unauthorized: Staff or Officer login required.', status: 401 };
}

// GET: Fetch applicants with optional filters
export async function GET(request, context) {
  try {
    const auth = await verifyStaffOrOfficerAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.trim();

    let query = `
      SELECT 
        ea.id AS applicant_id,
        ea.event_id,
        ea.student_id,
        ea.status,
        ea.applied_at,
        ea.notes,
        e.title AS event_title,
        e.event_date,
        s.name AS student_name,
        s.registration_no,
        s.roll_no,
        s.image AS student_image,
        COALESCE(s.email, i.email) AS student_email,
        COALESCE(s.phone, i.number) AS student_phone,
        c.name AS class_name,
        sec.name AS section_name,
        ses.name AS session_name
      FROM events_applicants ea
      JOIN events e ON e.id = ea.event_id
      JOIN website_students s ON s.id = ea.student_id
      LEFT JOIN website_student_info i ON i.student_id = s.id
      LEFT JOIN website_classes c ON c.id = s.class_id
      LEFT JOIN website_sections sec ON sec.id = s.section_id
      LEFT JOIN website_sessions ses ON ses.id = s.session_id
      WHERE ea.website_id = $1
    `;
    const params = [auth.website.id];

    if (eventId) {
      params.push(eventId);
      query += ` AND ea.event_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND ea.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (s.name ILIKE $${params.length} OR s.registration_no ILIKE $${params.length} OR s.roll_no ILIKE $${params.length})`;
    }

    query += ` ORDER BY ea.applied_at DESC, ea.id DESC`;

    const result = await queryDb(query, params);

    return NextResponse.json({
      success: true,
      applicants: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching event applicants:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update applicant status ('approved', 'rejected', 'registered', etc.)
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffOrOfficerAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const { applicant_id, id, status, notes } = body;
    const targetId = applicant_id || id;

    if (!targetId) {
      return NextResponse.json({ success: false, error: 'Applicant ID is required.' }, { status: 400 });
    }

    const updateRes = await queryDb(
      `UPDATE events_applicants
       SET status = COALESCE($1, status),
           notes = COALESCE($2, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND website_id = $4
       RETURNING *`,
      [status || null, notes !== undefined ? notes : null, targetId, auth.website.id]
    );

    if (updateRes.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Applicant record not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Applicant record updated successfully.',
      applicant: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Error updating applicant:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove an applicant
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffOrOfficerAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('id') || searchParams.get('applicant_id');
    const body = await request.json().catch(() => ({}));
    const targetId = queryId || body.id || body.applicant_id;

    if (!targetId) {
      return NextResponse.json({ success: false, error: 'Applicant ID is required for deletion.' }, { status: 400 });
    }

    const deleteRes = await queryDb(
      `DELETE FROM events_applicants WHERE id = $1 AND website_id = $2 RETURNING id`,
      [targetId, auth.website.id]
    );

    if (deleteRes.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Applicant not found or already removed.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Applicant registration cancelled successfully.',
    });
  } catch (error) {
    console.error('Error deleting applicant:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
