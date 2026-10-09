import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getTeacherSession, requireTeacher } from 'src/lib/middleware/teacher.js';

/**
 * API Route: /api/[domain]/teacher/me
 * Retrieves or updates authenticated teacher profile information.
 */

// GET: Current authenticated teacher profile
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const session = await getTeacherSession(request);
    if (!session || !session.id) {
      return NextResponse.json(
        { success: false, error: 'Teacher authentication required.' },
        { status: 401 }
      );
    }

    const teacherRes = await queryDb(
      `SELECT wt.id, wt.website_id, wt.designation_id, wt.name, wt.email, wt.number,
              wt.emergency_contact, wt.gender, wt.blood_group, wt.date_of_birth, wt.religion,
              wt.address, wt.permanent_address, wt.joining_date, wt.salary, wt.photo_url,
              wt.photo_id, wt.is_active, wt.is_registered, wt.created_at, wt.updated_at,
              wd.title AS designation_title, wd.display_order AS designation_order
       FROM website_teachers wt
       LEFT JOIN website_designations wd ON wd.id = wt.designation_id
       WHERE wt.id = $1 AND wt.website_id = $2
       LIMIT 1`,
      [session.id, website.id]
    );

    if (teacherRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Teacher profile not found.' },
        { status: 404 }
      );
    }

    const teacher = teacherRes.rows[0];

    // Fetch assigned subjects count and pending leaves for quick stats
    const [statsRes, qualRes] = await Promise.all([
      queryDb(
        `SELECT 
           (SELECT COUNT(*)::int FROM website_teacher_subjects WHERE website_id = $1 AND teacher_id = $2) AS subjects_count,
           (SELECT COUNT(*)::int FROM website_teacher_class_periods WHERE website_id = $1 AND teacher_id = $2) AS periods_count,
           (SELECT COUNT(*)::int FROM website_teacher_attendance WHERE website_id = $1 AND teacher_id = $2 AND status = 'present') AS days_present`,
        [website.id, teacher.id]
      ),
      queryDb(
        `SELECT id, degree, institute, board, passing_year, result, certificate_url
         FROM website_teacher_qualifications
         WHERE website_id = $1 AND teacher_id = $2
         ORDER BY passing_year DESC NULLS LAST`,
        [website.id, teacher.id]
      ),
    ]);

    const stats = statsRes.rows[0] || {};
    teacher.qualifications = qualRes.rows || [];
    teacher.stats = stats;
    teacher.designation = teacher.designation_title || 'Faculty Member';

    return NextResponse.json({
      success: true,
      teacher,
      payload: { teacher, stats },
      paylod: { teacher, stats },
    });
  } catch (error) {
    console.error('Error fetching teacher profile /api/[domain]/teacher/me:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error fetching teacher profile.' },
      { status: 500 }
    );
  }
}

// PUT: Update teacher personal profile
export async function PUT(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const auth = await requireTeacher(request);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const teacherId = auth.teacher.id;
    const body = await request.json().catch(() => ({}));
    const {
      name,
      number,
      emergency_contact,
      blood_group,
      religion,
      address,
      permanent_address,
      photo_url,
      photo_id,
    } = body;

    const updateRes = await queryDb(
      `UPDATE website_teachers
       SET name = COALESCE($1, name),
           number = COALESCE($2, number),
           emergency_contact = COALESCE($3, emergency_contact),
           blood_group = COALESCE($4, blood_group),
           religion = COALESCE($5, religion),
           address = COALESCE($6, address),
           permanent_address = COALESCE($7, permanent_address),
           photo_url = COALESCE($8, photo_url),
           photo_id = COALESCE($9, photo_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND website_id = $11
       RETURNING id, name, email, number, address, photo_url`,
      [
        name?.trim() || null,
        number?.trim() || null,
        emergency_contact?.trim() || null,
        blood_group?.trim() || null,
        religion?.trim() || null,
        address?.trim() || null,
        permanent_address?.trim() || null,
        photo_url?.trim() || null,
        photo_id?.trim() || null,
        teacherId,
        website.id,
      ]
    );

    return NextResponse.json({
      success: true,
      teacher: updateRes.rows[0],
      message: 'Profile updated successfully.',
    });
  } catch (error) {
    console.error('Error updating teacher profile:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error updating profile.' },
      { status: 500 }
    );
  }
}
