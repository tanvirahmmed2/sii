import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isTeacher, isAdmin, isStudent, verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { logActivity } from '@/lib/activity_logger';

// GET lesson plans (study plans)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classSubjectId = searchParams.get('class_subject_id');

    if (!classSubjectId) {
      return NextResponse.json({
        success: false,
        message: 'class_subject_id query parameter is required.',
        error: 'class_subject_id query parameter is required.',
        paylod: null
      }, { status: 400 });
    }

    // Verify authentication
    const teacherAuth = await isTeacher();
    const studentAuth = await isStudent();
    const adminAuth = await isAdmin();

    if (!teacherAuth && !studentAuth && !adminAuth) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized.',
        error: 'Unauthorized.',
        paylod: null
      }, { status: 401 });
    }

    const result = await query(
      `SELECT lp.*, cs.class_id, cs.subject_id,
              c.name AS class_name, s.name AS subject_name
       FROM lesson_plans lp
       JOIN class_subjects cs ON lp.class_subject_id = cs.id
       JOIN classes c ON cs.class_id = c.id
       JOIN subjects s ON cs.subject_id = s.id
       WHERE lp.class_subject_id = $1
       ORDER BY lp.date DESC, lp.id DESC`,
      [classSubjectId]
    );

    return NextResponse.json({
      success: true,
      message: 'Lesson plans fetched successfully',
      paylod: { lesson_plans: result.rows }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching lesson plans:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve lesson plans.',
      error: error.message,
      paylod: null
    }, { status: 500 });
  }
}

// POST create lesson plan (Study Plan)
export async function POST(request) {
  try {
    const teacherAuth = await isTeacher();
    const adminAuth = await isAdmin();

    if (!teacherAuth && !adminAuth) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Teachers or Admins only.',
        error: 'Unauthorized.',
        paylod: null
      }, { status: 403 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('fit-teacher')?.value || cookieStore.get('fit-staff')?.value || cookieStore.get('fit-admin')?.value;
    const decoded = token ? verifyJWT(token) : null;

    const { class_subject_id, title, description, date, status } = await request.json();

    if (!class_subject_id || !title || !description || !date) {
      return NextResponse.json({
        success: false,
        message: 'Fields class_subject_id, title, description, date are required.',
        error: 'Validation Error',
        paylod: null
      }, { status: 400 });
    }

    // Verify class subject exists
    const csCheck = await query(`
      SELECT cs.id, c.name AS class_name, s.name AS subject_name
      FROM class_subjects cs
      JOIN classes c ON c.id = cs.class_id
      JOIN subjects s ON s.id = cs.subject_id
      WHERE cs.id = $1
    `, [class_subject_id]);

    if (csCheck.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Class subject mapping not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    const insertRes = await query(
      `INSERT INTO lesson_plans (class_subject_id, title, description, date, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [class_subject_id, title.trim(), description.trim(), date, status || 'Completed']
    );

    // Log Activity
    await logActivity({
      userId: decoded?.id,
      userType: decoded?.role || 'teacher',
      action: 'CREATE_LESSON_PLAN',
      details: {
        lesson_plan_id: insertRes.rows[0].id,
        title: title.trim(),
        class_subject_id,
        class_name: csCheck.rows[0].class_name,
        subject_name: csCheck.rows[0].subject_name,
        date
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Lesson plan created successfully.',
      paylod: { lesson_plan: insertRes.rows[0] }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating lesson plan:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create lesson plan.',
      error: error.message,
      paylod: null
    }, { status: 500 });
  }
}

// DELETE lesson plan
export async function DELETE(request) {
  try {
    const teacherAuth = await isTeacher();
    const adminAuth = await isAdmin();

    if (!teacherAuth && !adminAuth) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('fit-teacher')?.value || cookieStore.get('fit-staff')?.value || cookieStore.get('fit-admin')?.value;
    const decoded = token ? verifyJWT(token) : null;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Lesson plan ID required.' }, { status: 400 });
    }

    const delRes = await query(`DELETE FROM lesson_plans WHERE id = $1 RETURNING *`, [id]);

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Lesson plan not found.' }, { status: 404 });
    }

    await logActivity({
      userId: decoded?.id,
      userType: decoded?.role || 'teacher',
      action: 'DELETE_LESSON_PLAN',
      details: {
        lesson_plan_id: id,
        title: delRes.rows[0].title
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Lesson plan deleted successfully.'
    });

  } catch (error) {
    console.error('Error deleting lesson plan:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
