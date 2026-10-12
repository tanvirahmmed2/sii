import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStudentSession } from 'src/lib/middleware/students.js';

export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const session = await getStudentSession(request);
    if (!session || !session.isActive || !session.isVerified) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Active verified student session required.' },
        { status: 401 }
      );
    }

    if (session.website_id && String(session.website_id) !== String(website.id)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Access denied to foreign institution resources.' },
        { status: 403 }
      );
    }

    const studentId = session.id;

    // 1. Fetch available hostels for this institution
    let hostels = [];
    try {
      const hostelsRes = await queryDb(
        `SELECT h.id, h.name, h.type, h.warden_name, h.warden_phone, h.capacity, h.monthly_fee,
                (SELECT COUNT(*)::int FROM website_hostel_rooms r WHERE r.hostel_id = h.id AND r.website_id = $1) AS total_rooms,
                (SELECT COUNT(*)::int FROM website_hostel_seats s WHERE s.hostel_id = h.id AND s.website_id = $1 AND s.status = 'available') AS available_seats
         FROM website_hostels h
         WHERE h.website_id = $1 AND h.status = 'active'
         ORDER BY h.name ASC`,
        [website.id]
      );
      hostels = hostelsRes.rows;
    } catch (err) {
      console.error('Error fetching hostels:', err);
    }

    // 2. Fetch student info
    let studentGender = 'Male';
    try {
      const stuRes = await queryDb(
        `SELECT gender FROM website_student_info WHERE student_id = $1 LIMIT 1`,
        [studentId]
      );
      if (stuRes.rows.length > 0) {
        studentGender = stuRes.rows[0].gender || 'Male';
      }
    } catch {}

    // 3. Fetch active seat allocation
    let activeAllocation = null;
    try {
      const allocRes = await queryDb(
        `SELECT a.id, a.allocation_date, a.monthly_fee, a.status,
                h.name AS hostel_name, h.type AS hostel_type,
                r.room_number, r.floor_number,
                s.seat_number, s.seat_code
         FROM website_hostel_allocations a
         JOIN website_hostels h ON h.id = a.hostel_id
         JOIN website_hostel_rooms r ON r.id = a.room_id
         JOIN website_hostel_seats s ON s.id = a.seat_id
         WHERE a.website_id = $1 AND a.student_id = $2 AND a.status = 'active'
         LIMIT 1`,
        [website.id, studentId]
      );
      if (allocRes.rows.length > 0) {
        activeAllocation = allocRes.rows[0];
      }
    } catch (err) {
      console.error('Error fetching seat allocation:', err);
    }

    // 4. Fetch student's applications
    let applications = [];
    try {
      const appRes = await queryDb(
        `SELECT app.id, app.preferred_hostel_id, app.reason, app.status, app.applied_date, app.created_at,
                h.name AS preferred_hostel_name
         FROM website_hostel_applications app
         LEFT JOIN website_hostels h ON h.id = app.preferred_hostel_id
         WHERE app.website_id = $1 AND app.student_id = $2
         ORDER BY app.created_at DESC`,
        [website.id, studentId]
      );
      applications = appRes.rows;
    } catch (err) {
      console.error('Error fetching applications:', err);
    }

    const payload = {
      hostels,
      applications,
      activeAllocation,
      isAllocated: Boolean(activeAllocation),
      studentGender
    };

    return NextResponse.json({
      success: true,
      hostels,
      applications,
      activeAllocation,
      isAllocated: Boolean(activeAllocation),
      studentGender,
      payload,
      paylod: payload
    });
  } catch (error) {
    console.error('Error in student residence route:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const session = await getStudentSession(request);
    if (!session || !session.isActive || !session.isVerified) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Active verified student session required.' },
        { status: 401 }
      );
    }

    if (session.website_id && String(session.website_id) !== String(website.id)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Access denied to foreign institution resources.' },
        { status: 403 }
      );
    }

    // Check if student already has active allocation
    const checkAlloc = await queryDb(
      `SELECT id FROM website_hostel_allocations WHERE website_id = $1 AND student_id = $2 AND status = 'active' LIMIT 1`,
      [website.id, session.id]
    );
    if (checkAlloc.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'You already hold an active hostel seat allocation.' },
        { status: 400 }
      );
    }

    // Check if student already has a pending application
    const checkPending = await queryDb(
      `SELECT id FROM website_hostel_applications WHERE website_id = $1 AND student_id = $2 AND status = 'pending' LIMIT 1`,
      [website.id, session.id]
    );
    if (checkPending.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'You already have an accommodation application pending review.' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { preferred_hostel_id, reason } = body;

    const sanitizedReason = typeof reason === 'string' ? reason.trim().slice(0, 1000) : '';
    if (!sanitizedReason) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid reason for accommodation request.' },
        { status: 400 }
      );
    }

    const sanitizedHostelId = preferred_hostel_id ? parseInt(preferred_hostel_id, 10) : null;

    const newApp = await queryDb(
      `INSERT INTO website_hostel_applications (
         website_id, student_id, preferred_hostel_id, reason, status, applied_date
       ) VALUES ($1, $2, $3, $4, 'pending', CURRENT_TIMESTAMP)
       RETURNING *`,
      [website.id, session.id, sanitizedHostelId, sanitizedReason]
    );

    return NextResponse.json({
      success: true,
      message: 'Hostel application submitted successfully! Hall administration will review your request.',
      application: newApp.rows[0]
    });
  } catch (error) {
    console.error('Error submitting hostel application:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
