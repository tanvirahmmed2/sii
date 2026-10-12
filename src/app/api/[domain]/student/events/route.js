import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStudentSession } from 'src/lib/middleware/students.js';

// GET: Student view of campus events
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Educational institution portal not found.' }, { status: 404 });
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

    // Fetch all active events with applicant counts
    const eventsRes = await queryDb(
      `SELECT 
         e.*,
         (SELECT COUNT(*)::int FROM events_applicants ea WHERE ea.event_id = e.id) AS total_applicants,
         EXISTS (
           SELECT 1 FROM events_applicants ea 
           WHERE ea.event_id = e.id AND ea.student_id = $1
         ) AS is_registered
       FROM events e
       WHERE e.website_id = $2 AND e.is_active = TRUE
       ORDER BY e.event_date ASC, e.id DESC`,
      [studentId, website.id]
    );

    const events = eventsRes.rows;
    const joinedEventIds = events
      .filter((e) => e.is_registered)
      .map((e) => String(e.id));

    const payload = {
      events,
      joinedEventIds,
      totalEvents: events.length,
      registeredCount: joinedEventIds.length,
    };

    return NextResponse.json({
      success: true,
      events,
      joinedEventIds,
      payload,
      paylod: payload,
    });
  } catch (error) {
    console.error('Error fetching student events:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Student applies for an event or cancels registration
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Educational institution portal not found.' }, { status: 404 });
    }

    const session = await getStudentSession(request);
    if (!session || !session.isActive || !session.isVerified) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Only registered enrolled students can apply for events.' },
        { status: 401 }
      );
    }

    if (session.website_id && String(session.website_id) !== String(website.id)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Access denied to foreign institution resources.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { event_id, action = 'join', notes } = body;

    const parsedEventId = parseInt(event_id, 10);
    if (!parsedEventId || isNaN(parsedEventId)) {
      return NextResponse.json({ success: false, error: 'Valid Event ID is required.' }, { status: 400 });
    }

    // Verify event exists and belongs to current institution
    const eventRes = await queryDb(
      `SELECT * FROM events WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [parsedEventId, website.id]
    );

    if (eventRes.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Event not found or inactive.' }, { status: 404 });
    }

    const event = eventRes.rows[0];

    if (!event.is_active) {
      return NextResponse.json({ success: false, error: 'This event is currently inactive.' }, { status: 400 });
    }

    const studentId = session.id;

    if (action === 'leave' || action === 'cancel') {
      // Cancel registration
      await queryDb(
        `DELETE FROM events_applicants 
         WHERE event_id = $1 AND student_id = $2 AND website_id = $3`,
        [parsedEventId, studentId, website.id]
      );

      return NextResponse.json({
        success: true,
        message: 'Your registration for this event has been cancelled.',
        paylod: { message: 'Your registration for this event has been cancelled.' },
        payload: { message: 'Your registration for this event has been cancelled.' },
      });
    }

    // Applying for event (action === 'join' / 'apply')
    // Option to make it applicable or not. Only if applicable can student apply!
    if (!event.is_applicable) {
      return NextResponse.json(
        {
          success: false,
          error: 'Registration is not applicable for this event (Information only).',
          message: 'Registration is not applicable for this event (Information only).',
        },
        { status: 400 }
      );
    }

    // Check if already registered
    const existingApp = await queryDb(
      `SELECT id FROM events_applicants 
       WHERE event_id = $1 AND student_id = $2 LIMIT 1`,
      [parsedEventId, studentId]
    );

    if (existingApp.rowCount > 0) {
      return NextResponse.json({
        success: true,
        message: 'You are already registered for this event.',
        paylod: { message: 'You are already registered for this event.' },
        payload: { message: 'You are already registered for this event.' },
      });
    }

    // Register student
    const insertRes = await queryDb(
      `INSERT INTO events_applicants (
         website_id,
         event_id,
         student_id,
         status,
         notes
       ) VALUES ($1, $2, $3, 'registered', $4)
       RETURNING *`,
      [website.id, parsedEventId, studentId, notes || null]
    );

    return NextResponse.json({
      success: true,
      message: 'Registration successful! You are now enrolled as an applicant for this event.',
      applicant: insertRes.rows[0],
      paylod: { message: 'Registration successful!' },
      payload: { message: 'Registration successful!' },
    });
  } catch (error) {
    console.error('Error processing student event application:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
