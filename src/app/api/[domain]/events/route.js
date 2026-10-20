import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStudentSession } from 'src/lib/middleware/students.js';

// GET: Public events list (supports ?limit=N and ?home=true)
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const isHome = searchParams.get('home') === 'true';

    // Optional student session check for personal interest & registration status
    let studentId = null;
    try {
      const session = await getStudentSession(request);
      if (session && session.isActive && session.isVerified && (!session.website_id || String(session.website_id) === String(website.id))) {
        studentId = session.id;
      }
    } catch {}

    const params = [website.id];
    let studentSelect = 'false AS is_interested, false AS is_registered';

    if (studentId) {
      params.push(studentId);
      const sIdx = params.length;
      studentSelect = `
        EXISTS (
          SELECT 1 FROM website_events_interested wei 
          WHERE wei.event_id = e.id AND wei.student_id = $${sIdx}
        ) AS is_interested,
        EXISTS (
          SELECT 1 FROM website_events_applicants ea 
          WHERE ea.event_id = e.id AND ea.student_id = $${sIdx}
        ) AS is_registered
      `;
    }

    let limitClause = '';
    if (limitParam && !isNaN(parseInt(limitParam, 10))) {
      params.push(parseInt(limitParam, 10));
      limitClause = ` LIMIT $${params.length}`;
    } else if (isHome) {
      limitClause = ` LIMIT 6`;
    }

    const result = await queryDb(
      `SELECT id,
              website_id,
              title,
              slug,
              description,
              location,
              event_date,
              end_date,
              image,
              image_id,
              is_applicable,
              is_active,
              created_at,
              updated_at,
              COALESCE(e.interested_count, (SELECT COUNT(*)::int FROM website_events_interested wei WHERE wei.event_id = e.id), 0)::int AS interested_count,
              COALESCE((SELECT COUNT(*) FROM website_events_applicants ea WHERE ea.event_id = e.id), 0)::int AS applicant_count,
              ${studentSelect}
       FROM website_events e
       WHERE e.website_id = $1 AND e.is_active = true
       ORDER BY 
         CASE WHEN e.event_date >= CURRENT_DATE THEN 0 ELSE 1 END ASC,
         CASE WHEN e.event_date >= CURRENT_DATE THEN e.event_date END ASC,
         e.event_date DESC,
         e.id DESC
       ${limitClause}`,
      params
    );

    return NextResponse.json({
      success: true,
      events: result.rows,
      payload: { events: result.rows },
      paylod: { events: result.rows },
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching public events in home/events:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Toggle student interest for an event
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Educational institution portal not found.' }, { status: 404 });
    }

    const session = await getStudentSession(request);
    if (!session || !session.isActive || !session.isVerified) {
      return NextResponse.json(
        {
          success: false,
          requireAuth: true,
          error: 'Please login to your student account to mark your interest in this event.',
        },
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
    const { event_id, action = 'toggle' } = body;
    const parsedEventId = parseInt(event_id, 10);

    if (!parsedEventId || isNaN(parsedEventId)) {
      return NextResponse.json({ success: false, error: 'Valid Event ID is required.' }, { status: 400 });
    }

    // Verify event exists & is active
    const eventCheck = await queryDb(
      `SELECT id, title, is_active FROM website_events WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [parsedEventId, website.id]
    );

    if (eventCheck.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Event not found.' }, { status: 404 });
    }

    const studentId = session.id;

    // Check existing interest
    const interestCheck = await queryDb(
      `SELECT id FROM website_events_interested WHERE event_id = $1 AND student_id = $2 LIMIT 1`,
      [parsedEventId, studentId]
    );

    let isInterestedNow = false;

    if (interestCheck.rowCount > 0 && (action === 'toggle' || action === 'uninterest' || action === 'remove')) {
      // Remove interest
      await queryDb(
        `DELETE FROM website_events_interested WHERE event_id = $1 AND student_id = $2`,
        [parsedEventId, studentId]
      );
      isInterestedNow = false;
    } else {
      // Add interest
      await queryDb(
        `INSERT INTO website_events_interested (website_id, event_id, student_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (event_id, student_id) DO NOTHING`,
        [website.id, parsedEventId, studentId]
      );
      isInterestedNow = true;
    }

    // Calculate current count and update website_events cache
    const countRes = await queryDb(
      `SELECT COUNT(*)::int AS count FROM website_events_interested WHERE event_id = $1`,
      [parsedEventId]
    );
    const newCount = countRes.rows[0]?.count || 0;

    await queryDb(
      `UPDATE website_events SET interested_count = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newCount, parsedEventId]
    );

    const message = isInterestedNow
      ? 'You have marked interest in this event!'
      : 'Removed from your interested events.';

    return NextResponse.json({
      success: true,
      is_interested: isInterestedNow,
      interested_count: newCount,
      message,
      payload: { is_interested: isInterestedNow, interested_count: newCount, message },
      paylod: { is_interested: isInterestedNow, interested_count: newCount, message },
    });
  } catch (error) {
    console.error('Error toggling event interest in home/events:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

