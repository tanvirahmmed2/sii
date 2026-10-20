import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStudentSession } from 'src/lib/middleware/students.js';

// GET: Single event details
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const { slug } = await context.params;
    if (!slug) {
      return NextResponse.json({ success: false, error: 'Event identifier required' }, { status: 400 });
    }

    // Optional student session check
    let studentId = null;
    try {
      const session = await getStudentSession(request);
      if (session && session.isActive && session.isVerified && (!session.website_id || String(session.website_id) === String(website.id))) {
        studentId = session.id;
      }
    } catch {}

    const params = [website.id, slug];
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
       WHERE e.website_id = $1 AND (e.slug = $2 OR e.id::text = $2)
       LIMIT 1`,
      params
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    const event = result.rows[0];

    return NextResponse.json({
      success: true,
      event,
      payload: { event },
      paylod: { event },
    });
  } catch (error) {
    console.error('Error fetching event detail:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

