import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// PUT update a section (Admin only)
export async function PUT(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_293 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_293?.error || res_err_293?.message || 'An error occurred',
        error: res_err_293?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;
    const { class_id, name, capacity, room_number } = await request.json();

    if (!class_id || !name) {
      const res_err_758 = { error: 'Class ID and Section Name are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_758?.error || res_err_758?.message || 'An error occurred',
        error: res_err_758?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    const capVal = capacity !== undefined ? parseInt(capacity, 10) : 40;
    if (isNaN(capVal)) {
      const res_err_1194 = { error: 'Capacity must be a valid number.' };
      return NextResponse.json({
        success: false,
        message: res_err_1194?.error || res_err_1194?.message || 'An error occurred',
        error: res_err_1194?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Verify class exists
    const classCheck = await query('SELECT id FROM classes WHERE id = $1', [class_id]);
    if (classCheck.rows.length === 0) {
      const res_err_1684 = { error: 'Selected class not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_1684?.error || res_err_1684?.message || 'An error occurred',
        error: res_err_1684?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    // Verify unique section name under the same class (excluding current section)
    const duplicateCheck = await query(
      'SELECT id FROM sections WHERE class_id = $1 AND LOWER(name) = LOWER($2) AND id <> $3',
      [class_id, name.trim(), id]
    );

    if (duplicateCheck.rows.length > 0) {
      const res_err_2313 = { error: 'A section with this name already exists under the selected class.' };
      return NextResponse.json({
        success: false,
        message: res_err_2313?.error || res_err_2313?.message || 'An error occurred',
        error: res_err_2313?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    const updatedSection = await query(
      `UPDATE sections 
       SET class_id = $1, name = $2, capacity = $3, room_number = $4, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $5 
       RETURNING *`,
      [class_id, name.trim(), capVal, room_number ? room_number.trim() : null, id]
    );

    if (updatedSection.rowCount === 0) {
      const res_err_3022 = { error: 'Section not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_3022?.error || res_err_3022?.message || 'An error occurred',
        error: res_err_3022?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const res_data_1999 = {
      message: 'Section updated successfully.',
      section: updatedSection.rows[0]
    };
      return NextResponse.json({
        success: true,
        message: res_data_1999?.message || 'Successfully fecthed data',
        paylod: res_data_1999
      }, { status: 200 });
  } catch (error) {
    console.error('Error updating section:', error);
    const res_err_3815 = { error: 'Failed to update section. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_3815?.error || res_err_3815?.message || 'An error occurred',
        error: res_err_3815?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// DELETE a section (Admin only)
export async function DELETE(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_4328 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_4328?.error || res_err_4328?.message || 'An error occurred',
        error: res_err_4328?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;

    const deleteResult = await query('DELETE FROM sections WHERE id = $1 RETURNING id', [id]);

    if (deleteResult.rowCount === 0) {
      const res_err_4826 = { error: 'Section not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_4826?.error || res_err_4826?.message || 'An error occurred',
        error: res_err_4826?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const res_data_3107 = {
      message: 'Section deleted successfully.'
    };
      return NextResponse.json({
        success: true,
        message: res_data_3107?.message || 'Successfully fecthed data',
        paylod: res_data_3107
      }, { status: 200 });
  } catch (error) {
    console.error('Error deleting section:', error);
    const res_err_5580 = { error: 'Failed to delete section. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_5580?.error || res_err_5580?.message || 'An error occurred',
        error: res_err_5580?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
