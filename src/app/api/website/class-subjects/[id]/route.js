import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/middleware/auth';

// PUT update class-subject mapping (Admin only)
export async function PUT(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;
    const { class_id, subject_id } = await request.json();

    if (!class_id || !subject_id) {
      return NextResponse.json({
        success: false,
        message: 'Class ID and Subject ID are required.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    // Check duplicate mapping (excluding current mapping)
    const checkDup = await query(
      'SELECT id FROM class_subjects WHERE class_id = $1 AND subject_id = $2 AND id <> $3',
      [class_id, subject_id, id]
    );

    if (checkDup.rows.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'This subject is already mapped to the selected class.',
        error: 'Conflict',
        paylod: null
      }, { status: 400 });
    }

    const updatedMapping = await query(
      `UPDATE class_subjects 
       SET class_id = $1, subject_id = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 
       RETURNING *`,
      [class_id, subject_id, id]
    );

    if (updatedMapping.rowCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Mapping not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    const res_data = {
      message: 'Class subject allocation updated successfully.',
      assignment: updatedMapping.rows[0]
    };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating class subject mapping:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update mapping.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// DELETE a class-subject mapping (Admin only)
export async function DELETE(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;

    const deleteResult = await query('DELETE FROM class_subjects WHERE id = $1 RETURNING id', [id]);

    if (deleteResult.rowCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Mapping not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    const res_data = {
      message: 'Class subject allocation deleted successfully.'
    };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete assignment.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
