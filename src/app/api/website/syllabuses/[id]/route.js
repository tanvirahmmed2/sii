import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// PUT update a syllabus (Admin only)
export async function PUT(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_294 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_294?.error || res_err_294?.message || 'An error occurred',
        error: res_err_294?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;
    const { name, title, link, class_id, subject_id } = await request.json();

    if (!name || !title || !link || !class_id || !subject_id) {
      const res_err_795 = { error: 'All fields (Name, Title, Document Link, Class, Subject) are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_795?.error || res_err_795?.message || 'An error occurred',
        error: res_err_795?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Verify class exists
    const classCheck = await query('SELECT id FROM classes WHERE id = $1', [class_id]);
    if (classCheck.rows.length === 0) {
      const res_err_1318 = { error: 'Target class not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_1318?.error || res_err_1318?.message || 'An error occurred',
        error: res_err_1318?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    // Verify subject exists
    const subjectCheck = await query('SELECT id FROM subjects WHERE id = $1', [subject_id]);
    if (subjectCheck.rows.length === 0) {
      const res_err_1808 = { error: 'Target subject not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_1808?.error || res_err_1808?.message || 'An error occurred',
        error: res_err_1808?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const updatedSyllabus = await query(
      `UPDATE syllabuses 
       SET name = $1, title = $2, link = $3, class_id = $4, subject_id = $5, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $6 
       RETURNING *`,
      [name.trim(), title.trim(), link.trim(), class_id, subject_id, id]
    );

    if (updatedSyllabus.rowCount === 0) {
      const res_err_2478 = { error: 'Syllabus not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_2478?.error || res_err_2478?.message || 'An error occurred',
        error: res_err_2478?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const res_data_1688 = {
      message: 'Syllabus updated successfully.',
      syllabus: updatedSyllabus.rows[0]
    };
      return NextResponse.json({
        success: true,
        message: res_data_1688?.message || 'Successfully fecthed data',
        paylod: res_data_1688
      }, { status: 200 });
  } catch (error) {
    console.error('Error updating syllabus:', error);
    const res_err_3276 = { error: 'Failed to update syllabus. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_3276?.error || res_err_3276?.message || 'An error occurred',
        error: res_err_3276?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// DELETE a syllabus (Admin only)
export async function DELETE(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_3791 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_3791?.error || res_err_3791?.message || 'An error occurred',
        error: res_err_3791?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;

    const deleteResult = await query('DELETE FROM syllabuses WHERE id = $1 RETURNING id', [id]);

    if (deleteResult.rowCount === 0) {
      const res_err_4291 = { error: 'Syllabus not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_4291?.error || res_err_4291?.message || 'An error occurred',
        error: res_err_4291?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const res_data_2805 = {
      message: 'Syllabus deleted successfully.'
    };
      return NextResponse.json({
        success: true,
        message: res_data_2805?.message || 'Successfully fecthed data',
        paylod: res_data_2805
      }, { status: 200 });
  } catch (error) {
    console.error('Error deleting syllabus:', error);
    const res_err_5048 = { error: 'Failed to delete syllabus. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_5048?.error || res_err_5048?.message || 'An error occurred',
        error: res_err_5048?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
