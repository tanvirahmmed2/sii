import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyTeacherStaffAccess } from 'src/lib/middleware/teacher-auth.js';

// GET: Fetch qualifications for a teacher
export async function GET(request, context) {
  try {
    const auth = await verifyTeacherStaffAccess(request, context, 'view');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacher_id');

    if (!teacherId) {
      return NextResponse.json({ success: false, error: 'teacher_id parameter is required.' }, { status: 400 });
    }

    const res = await queryDb(
      `SELECT wtq.*, wt.name AS teacher_name
       FROM website_teacher_qualifications wtq
       JOIN website_teachers wt ON wt.id = wtq.teacher_id
       WHERE wtq.website_id = $1 AND wtq.teacher_id = $2
       ORDER BY wtq.passing_year DESC NULLS LAST, wtq.id DESC`,
      [website.id, teacherId]
    );

    return NextResponse.json({
      success: true,
      qualifications: res.rows,
    });
  } catch (error) {
    console.error('Error fetching qualifications:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch qualifications.' }, { status: 500 });
  }
}

// POST: Add new qualification for a teacher
export async function POST(request, context) {
  try {
    const auth = await verifyTeacherStaffAccess(request, context, 'create');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json().catch(() => ({}));
    const {
      teacher_id,
      degree,
      institute,
      board = null,
      passing_year = null,
      result = null,
      certificate_url = null,
      certificate_id = null,
    } = body;

    if (!teacher_id) {
      return NextResponse.json({ success: false, error: 'teacher_id is required.' }, { status: 400 });
    }
    if (!degree || !degree.trim()) {
      return NextResponse.json({ success: false, error: 'Degree/Certificate title is required.' }, { status: 400 });
    }
    if (!institute || !institute.trim()) {
      return NextResponse.json({ success: false, error: 'Institute/University name is required.' }, { status: 400 });
    }

    // Verify teacher belongs to this website
    const teacherCheck = await queryDb(
      `SELECT id FROM website_teachers WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [teacher_id, website.id]
    );
    if (teacherCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Teacher not found in this institution.' }, { status: 404 });
    }

    const insertRes = await queryDb(
      `INSERT INTO website_teacher_qualifications (
         website_id, teacher_id, degree, institute, board, passing_year, result, certificate_url, certificate_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        website.id,
        teacher_id,
        degree.trim(),
        institute.trim(),
        board?.trim() || null,
        passing_year ? parseInt(passing_year, 10) : null,
        result?.trim() || null,
        certificate_url?.trim() || null,
        certificate_id?.trim() || null,
      ]
    );

    return NextResponse.json({
      success: true,
      qualification: insertRes.rows[0],
      message: 'Qualification added successfully.',
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding qualification:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to add qualification.' }, { status: 500 });
  }
}

// PUT: Update qualification
export async function PUT(request, context) {
  try {
    const auth = await verifyTeacherStaffAccess(request, context, 'edit');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json().catch(() => ({}));
    const {
      id,
      degree,
      institute,
      board,
      passing_year,
      result,
      certificate_url,
      certificate_id,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Qualification ID is required.' }, { status: 400 });
    }

    const updateRes = await queryDb(
      `UPDATE website_teacher_qualifications
       SET degree = COALESCE($1, degree),
           institute = COALESCE($2, institute),
           board = $3,
           passing_year = $4,
           result = $5,
           certificate_url = COALESCE($6, certificate_url),
           certificate_id = COALESCE($7, certificate_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND website_id = $9
       RETURNING *`,
      [
        degree?.trim() || null,
        institute?.trim() || null,
        board !== undefined ? (board?.trim() || null) : null,
        passing_year ? parseInt(passing_year, 10) : null,
        result !== undefined ? (result?.trim() || null) : null,
        certificate_url !== undefined ? (certificate_url?.trim() || null) : null,
        certificate_id !== undefined ? (certificate_id?.trim() || null) : null,
        id,
        website.id,
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Qualification record not found or access denied.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      qualification: updateRes.rows[0],
      message: 'Qualification record updated successfully.',
    });
  } catch (error) {
    console.error('Error updating qualification:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update qualification.' }, { status: 500 });
  }
}

// DELETE: Delete qualification
export async function DELETE(request, context) {
  try {
    const auth = await verifyTeacherStaffAccess(request, context, 'delete');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Qualification ID parameter is required.' }, { status: 400 });
    }

    const delRes = await queryDb(
      `DELETE FROM website_teacher_qualifications WHERE id = $1 AND website_id = $2 RETURNING id, degree`,
      [id, website.id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Qualification record not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Qualification "${delRes.rows[0].degree}" removed successfully.`,
    });
  } catch (error) {
    console.error('Error deleting qualification:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete qualification.' }, { status: 500 });
  }
}
