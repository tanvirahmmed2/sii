import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

// GET: Single teacher profile by username, email prefix, or ID
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const { username } = await context.params;
    if (!username) {
      return NextResponse.json({ success: false, error: 'Teacher identifier required' }, { status: 400 });
    }

    const teacherRes = await queryDb(
      `SELECT t.id,
              t.website_id,
              t.name,
              t.email,
              t.number,
              t.emergency_contact,
              t.gender,
              t.blood_group,
              t.date_of_birth,
              t.religion,
              t.address,
              t.permanent_address,
              t.joining_date,
              t.photo_url,
              t.department_id,
              t.designation_id,
              dept.name AS department_name,
              dept.code AS department_code,
              des.title AS designation_title,
              COALESCE(split_part(t.email, '@', 1), t.id::text) AS username
       FROM website_teachers t
       LEFT JOIN website_departments dept ON dept.id = t.department_id AND dept.website_id = t.website_id
       LEFT JOIN website_designations des ON des.id = t.designation_id AND des.website_id = t.website_id
       WHERE t.website_id = $1
         AND (t.id::text = $2 OR LOWER(split_part(t.email, '@', 1)) = LOWER($2) OR LOWER(t.email) = LOWER($2))
       LIMIT 1`,
      [website.id, username]
    );

    if (teacherRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Teacher profile not found' }, { status: 404 });
    }

    const teacher = teacherRes.rows[0];

    // Qualifications
    const qualRes = await queryDb(
      `SELECT id, degree, institute, board, passing_year, result
       FROM website_teacher_qualifications
       WHERE website_id = $1 AND teacher_id = $2
       ORDER BY passing_year DESC NULLS LAST, id ASC`,
      [website.id, teacher.id]
    );

    // Subjects taught
    const subjRes = await queryDb(
      `SELECT s.id, s.name, s.code
       FROM website_teacher_subjects ts
       JOIN website_subjects s ON s.id = ts.subject_id AND s.website_id = ts.website_id
       WHERE ts.website_id = $1 AND ts.teacher_id = $2
       ORDER BY s.name ASC`,
      [website.id, teacher.id]
    );

    const fullTeacher = {
      ...teacher,
      qualifications: qualRes.rows,
      subjects: subjRes.rows,
    };

    return NextResponse.json({
      success: true,
      teacher: fullTeacher,
      payload: { teacher: fullTeacher },
      paylod: { teacher: fullTeacher },
    });
  } catch (error) {
    console.error('Error fetching teacher profile:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
