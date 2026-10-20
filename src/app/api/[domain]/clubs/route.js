import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

// GET: Public list of student clubs & societies
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const result = await queryDb(
      `SELECT c.id,
              c.website_id,
              c.name,
              c.category,
              c.description,
              c.logo_url,
              c.moderator_teacher_id,
              c.is_active,
              c.created_at,
              c.updated_at,
              t.name AS moderator_teacher_name,
              t.email AS moderator_teacher_email,
              t.photo_url AS moderator_photo_url,
              COALESCE((SELECT COUNT(*) FROM website_student_club_members scm WHERE scm.club_id = c.id AND scm.status = 'active'), 0)::int AS member_count
       FROM website_clubs c
       LEFT JOIN website_teachers t ON t.id = c.moderator_teacher_id
       WHERE c.website_id = $1 AND c.is_active = true
       ORDER BY c.name ASC`,
      [website.id]
    );

    return NextResponse.json({
      success: true,
      clubs: result.rows,
      payload: { clubs: result.rows },
      paylod: { clubs: result.rows },
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching clubs in home/clubs:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
