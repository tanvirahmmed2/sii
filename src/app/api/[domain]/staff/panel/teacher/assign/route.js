import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyTeacherStaffAccess } from 'src/lib/middleware/teacher-auth.js';

// GET: Fetch teacher assignments (subjects and/or class periods)
export async function GET(request, context) {
  try {
    const auth = await verifyTeacherStaffAccess(request, context, 'view');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacher_id');
    const type = searchParams.get('type'); // 'subject', 'period', or null (both)

    const result = {};

    if (!type || type === 'subject') {
      let subjQuery = `
        SELECT wts.id, wts.teacher_id, wts.subject_id, wts.class_id, wts.is_primary, wts.created_at,
               wt.name AS teacher_name, wt.email AS teacher_email,
               ws.name AS subject_name, ws.code AS subject_code,
               wc.name AS class_name
        FROM website_teacher_subjects wts
        JOIN website_teachers wt ON wt.id = wts.teacher_id
        JOIN website_subjects ws ON ws.id = wts.subject_id
        LEFT JOIN website_classes wc ON wc.id = wts.class_id
        WHERE wts.website_id = $1
      `;
      const subjParams = [website.id];
      if (teacherId) {
        subjQuery += ` AND wts.teacher_id = $2`;
        subjParams.push(teacherId);
      }
      subjQuery += ` ORDER BY wt.name ASC, ws.name ASC`;
      const subjRes = await queryDb(subjQuery, subjParams);
      result.subjects = subjRes.rows;
    }

    if (!type || type === 'period') {
      let periodQuery = `
        SELECT wtcp.id, wtcp.teacher_id, wtcp.period_id, wtcp.class_id, wtcp.section_id, wtcp.day_id, wtcp.created_at,
               wt.name AS teacher_name,
               wp.name AS period_name, wp.start_time, wp.end_time,
               wd.name AS day_name,
               wc.name AS class_name,
               wsec.name AS section_name
        FROM website_teacher_class_periods wtcp
        JOIN website_teachers wt ON wt.id = wtcp.teacher_id
        JOIN website_periods wp ON wp.id = wtcp.period_id
        LEFT JOIN website_days wd ON wd.id = wtcp.day_id
        LEFT JOIN website_classes wc ON wc.id = wtcp.class_id
        LEFT JOIN website_sections wsec ON wsec.id = wtcp.section_id
        WHERE wtcp.website_id = $1
      `;
      const periodParams = [website.id];
      if (teacherId) {
        periodQuery += ` AND wtcp.teacher_id = $2`;
        periodParams.push(teacherId);
      }
      periodQuery += ` ORDER BY wt.name ASC, wd.id ASC, wp.start_time ASC`;
      const periodRes = await queryDb(periodQuery, periodParams);
      result.periods = periodRes.rows;
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error fetching teacher assignments:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch assignments.' }, { status: 500 });
  }
}

// POST: Assign subject or class period to a teacher
export async function POST(request, context) {
  try {
    const auth = await verifyTeacherStaffAccess(request, context, 'create');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json().catch(() => ({}));
    const { type = 'subject', teacher_id } = body;

    if (!teacher_id) {
      return NextResponse.json({ success: false, error: 'teacher_id is required.' }, { status: 400 });
    }

    // Verify teacher belongs to current website
    const teacherCheck = await queryDb(
      `SELECT id FROM website_teachers WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [teacher_id, website.id]
    );
    if (teacherCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Teacher not found in this institution.' }, { status: 404 });
    }

    if (type === 'subject') {
      const { subject_id, class_id = null, is_primary = true } = body;
      if (!subject_id) {
        return NextResponse.json({ success: false, error: 'subject_id is required.' }, { status: 400 });
      }

      const insertRes = await queryDb(
        `INSERT INTO website_teacher_subjects (website_id, teacher_id, subject_id, class_id, is_primary)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (website_id, teacher_id, subject_id, class_id)
         DO UPDATE SET is_primary = EXCLUDED.is_primary, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [website.id, teacher_id, subject_id, class_id || null, Boolean(is_primary)]
      );

      return NextResponse.json({
        success: true,
        assignment: insertRes.rows[0],
        message: 'Subject assigned to teacher successfully.',
      }, { status: 201 });
    }

    if (type === 'period') {
      const { period_id, day_id = null, class_id = null, section_id = null } = body;
      if (!period_id) {
        return NextResponse.json({ success: false, error: 'period_id is required.' }, { status: 400 });
      }

      const insertRes = await queryDb(
        `INSERT INTO website_teacher_class_periods (website_id, teacher_id, period_id, day_id, class_id, section_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (website_id, teacher_id, period_id, day_id)
         DO UPDATE SET class_id = EXCLUDED.class_id, section_id = EXCLUDED.section_id, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [website.id, teacher_id, period_id, day_id || null, class_id || null, section_id || null]
      );

      return NextResponse.json({
        success: true,
        assignment: insertRes.rows[0],
        message: 'Class period routine assigned to teacher successfully.',
      }, { status: 201 });
    }

    return NextResponse.json({ success: false, error: `Invalid assignment type: "${type}". Expected "subject" or "period".` }, { status: 400 });
  } catch (error) {
    console.error('Error assigning teacher record:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to save assignment.' }, { status: 500 });
  }
}

// DELETE: Remove an assignment (subject or class period)
export async function DELETE(request, context) {
  try {
    const auth = await verifyTeacherStaffAccess(request, context, 'delete');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type') || 'subject';

    if (!id) {
      return NextResponse.json({ success: false, error: 'Assignment ID parameter is required.' }, { status: 400 });
    }

    if (type === 'subject') {
      const delRes = await queryDb(
        `DELETE FROM website_teacher_subjects WHERE id = $1 AND website_id = $2 RETURNING id`,
        [id, website.id]
      );
      if (delRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Subject assignment not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Subject assignment removed successfully.' });
    }

    if (type === 'period') {
      const delRes = await queryDb(
        `DELETE FROM website_teacher_class_periods WHERE id = $1 AND website_id = $2 RETURNING id`,
        [id, website.id]
      );
      if (delRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Period assignment not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Period assignment removed successfully.' });
    }

    return NextResponse.json({ success: false, error: 'Invalid assignment type.' }, { status: 400 });
  } catch (error) {
    console.error('Error removing assignment:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to remove assignment.' }, { status: 500 });
  }
}
