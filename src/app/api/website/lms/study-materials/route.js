import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isTeacher, isAdmin, isStudent, verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { logActivity } from '@/lib/activity_logger';

// GET study materials
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
      `SELECT sm.*, cs.class_id, cs.subject_id,
              c.name AS class_name, s.name AS subject_name
       FROM study_materials sm
       JOIN class_subjects cs ON sm.class_subject_id = cs.id
       JOIN classes c ON cs.class_id = c.id
       JOIN subjects s ON cs.subject_id = s.id
       WHERE sm.class_subject_id = $1
       ORDER BY sm.created_at DESC`,
      [classSubjectId]
    );

    return NextResponse.json({
      success: true,
      message: 'Study materials fetched successfully',
      paylod: { study_materials: result.rows }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching study materials:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve study materials.',
      error: error.message,
      paylod: null
    }, { status: 500 });
  }
}

// POST create study material (Teacher/Admin only)
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

    const { class_subject_id, title, description, file_url, file_id } = await request.json();

    if (!class_subject_id || !title || !file_url) {
      return NextResponse.json({
        success: false,
        message: 'Class subject, title, and file link are required.',
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
      `INSERT INTO study_materials (class_subject_id, title, description, file_url, file_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [class_subject_id, title.trim(), description ? description.trim() : null, file_url.trim(), file_id || null]
    );

    // Log Activity
    await logActivity({
      userId: decoded?.id,
      userType: decoded?.role || 'teacher',
      action: 'CREATE_STUDY_MATERIAL',
      details: {
        material_id: insertRes.rows[0].id,
        title: title.trim(),
        class_subject_id,
        class_name: csCheck.rows[0].class_name,
        subject_name: csCheck.rows[0].subject_name
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Study material created successfully.',
      paylod: { study_material: insertRes.rows[0] }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating study material:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create study material.',
      error: error.message,
      paylod: null
    }, { status: 500 });
  }
}

// PUT update study material
export async function PUT(request) {
  try {
    const teacherAuth = await isTeacher();
    const adminAuth = await isAdmin();

    if (!teacherAuth && !adminAuth) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('fit-teacher')?.value || cookieStore.get('fit-staff')?.value || cookieStore.get('fit-admin')?.value;
    const decoded = token ? verifyJWT(token) : null;

    const { id, title, description, file_url } = await request.json();

    if (!id || !title || !file_url) {
      return NextResponse.json({ success: false, error: 'ID, title, and file link are required.' }, { status: 400 });
    }

    const updateRes = await query(
      `UPDATE study_materials
       SET title = $1, description = $2, file_url = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [title.trim(), description ? description.trim() : null, file_url.trim(), id]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Study material not found.' }, { status: 404 });
    }

    await logActivity({
      userId: decoded?.id,
      userType: decoded?.role || 'teacher',
      action: 'UPDATE_STUDY_MATERIAL',
      details: {
        material_id: id,
        title: title.trim()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Study material updated successfully.',
      paylod: { study_material: updateRes.rows[0] }
    });

  } catch (error) {
    console.error('Error updating study material:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE study material
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
      return NextResponse.json({ success: false, error: 'Material ID required.' }, { status: 400 });
    }

    const delRes = await query(`DELETE FROM study_materials WHERE id = $1 RETURNING *`, [id]);

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Study material not found.' }, { status: 404 });
    }

    await logActivity({
      userId: decoded?.id,
      userType: decoded?.role || 'teacher',
      action: 'DELETE_STUDY_MATERIAL',
      details: {
        material_id: id,
        title: delRes.rows[0].title
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Study material deleted successfully.'
    });

  } catch (error) {
    console.error('Error deleting study material:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
