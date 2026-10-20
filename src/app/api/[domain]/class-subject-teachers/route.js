import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

// GET: Teachers assigned to subjects
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
    }

    const result = await queryDb(
      `SELECT DISTINCT
              ts.subject_id,
              t.id AS teacher_id,
              t.name AS teacher_name,
              t.email AS teacher_email,
              t.photo_url,
              des.title AS designation_title,
              COALESCE(split_part(t.email, '@', 1), t.id::text) AS username
       FROM website_teacher_subjects ts
       JOIN website_teachers t ON t.id = ts.teacher_id AND t.website_id = ts.website_id
       LEFT JOIN website_designations des ON des.id = t.designation_id
       WHERE ts.website_id = $1 AND t.is_active = true
       ORDER BY t.name ASC`,
      [website.id]
    );

    return NextResponse.json({
      success: true,
      assignments: result.rows,
      payload: { assignments: result.rows },
      paylod: { assignments: result.rows },
    });
  } catch (error) {
    console.error('Error fetching class subject teachers:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
