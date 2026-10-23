import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

// GET: Single club details
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
      return NextResponse.json({ success: false, error: 'Club identifier required' }, { status: 400 });
    }

    const clubRes = await queryDb(
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
              des.title AS moderator_designation,
              COALESCE((SELECT COUNT(*) FROM website_student_club_members scm WHERE scm.club_id = c.id AND scm.status = 'active'), 0)::int AS member_count
       FROM website_clubs c
       LEFT JOIN website_teachers t ON t.id = c.moderator_teacher_id
       LEFT JOIN website_designations des ON des.id = t.designation_id
       WHERE c.website_id = $1 AND (c.id::text = $2 OR LOWER(c.name) = LOWER($2) OR LOWER(REPLACE(c.name, ' ', '-')) = LOWER($2))
       LIMIT 1`,
      [website.id, slug]
    );

    if (clubRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Club not found' }, { status: 404 });
    }

    const club = clubRes.rows[0];

    // Executive committee
    const execsRes = await queryDb(
      `SELECT scm.id,
              scm.role,
              scm.joined_date,
              s.registration_no,
              COALESCE(s.name, si.data->>'name') AS student_name,
              cl.name AS class_name
       FROM website_student_club_members scm
       JOIN website_students s ON s.id = scm.student_id AND s.website_id = scm.website_id
       LEFT JOIN website_student_info si ON si.student_id = s.id
       LEFT JOIN website_classes cl ON cl.id = s.class_id
       WHERE scm.website_id = $1 AND scm.club_id = $2 AND scm.status = 'active'
       ORDER BY CASE scm.role
                  WHEN 'president' THEN 1
                  WHEN 'general_secretary' THEN 2
                  WHEN 'treasurer' THEN 3
                  WHEN 'executive' THEN 4
                  ELSE 5
                END ASC, scm.joined_date ASC`,
      [website.id, club.id]
    );

    const fullClub = {
      ...club,
      executives: execsRes.rows,
    };

    return NextResponse.json({
      success: true,
      club: fullClub,
      payload: { club: fullClub, executives: execsRes.rows },
      paylod: { club: fullClub, executives: execsRes.rows },
    });
  } catch (error) {
    console.error('Error fetching club detail:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
