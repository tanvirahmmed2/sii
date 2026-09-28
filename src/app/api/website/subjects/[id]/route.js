import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// PUT update a subject (Admin only)
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
    const { name, code } = await request.json();

    if (!name || !code) {
      const res_err_727 = { error: 'Subject Name and Subject Code are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_727?.error || res_err_727?.message || 'An error occurred',
        error: res_err_727?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Check unique constraints (excluding current ID)
    const duplicateCheck = await query(
      'SELECT id, name, code FROM subjects WHERE (name = $1 OR code = $2) AND id <> $3',
      [name.trim(), code.trim().toUpperCase(), id]
    );

    if (duplicateCheck.rows.length > 0) {
      const match = duplicateCheck.rows[0];
      if (match.name === name.trim()) {
        const res_err_1440 = { error: 'A subject with this name already exists.' };
      return NextResponse.json({
        success: false,
        message: res_err_1440?.error || res_err_1440?.message || 'An error occurred',
        error: res_err_1440?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
      }
      if (match.code === code.trim().toUpperCase()) {
        const res_err_1840 = { error: 'A subject with this code already exists.' };
      return NextResponse.json({
        success: false,
        message: res_err_1840?.error || res_err_1840?.message || 'An error occurred',
        error: res_err_1840?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
      }
    }

    const updatedSubject = await query(
      `UPDATE subjects 
       SET name = $1, code = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 
       RETURNING *`,
      [name.trim(), code.trim().toUpperCase(), id]
    );

    if (updatedSubject.rowCount === 0) {
      const res_err_2463 = { error: 'Subject not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_2463?.error || res_err_2463?.message || 'An error occurred',
        error: res_err_2463?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const res_data_1672 = {
      message: 'Subject updated successfully.',
      subject: updatedSubject.rows[0]
    };
      return NextResponse.json({
        success: true,
        message: res_data_1672?.message || 'Successfully fecthed data',
        paylod: res_data_1672
      }, { status: 200 });
  } catch (error) {
    console.error('Error updating subject:', error);
    const res_err_3256 = { error: 'Failed to update subject. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_3256?.error || res_err_3256?.message || 'An error occurred',
        error: res_err_3256?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// DELETE a subject (Admin only)
export async function DELETE(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_3769 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_3769?.error || res_err_3769?.message || 'An error occurred',
        error: res_err_3769?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;

    const deleteResult = await query('DELETE FROM subjects WHERE id = $1 RETURNING id', [id]);

    if (deleteResult.rowCount === 0) {
      const res_err_4267 = { error: 'Subject not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_4267?.error || res_err_4267?.message || 'An error occurred',
        error: res_err_4267?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const res_data_2780 = {
      message: 'Subject deleted successfully.'
    };
      return NextResponse.json({
        success: true,
        message: res_data_2780?.message || 'Successfully fecthed data',
        paylod: res_data_2780
      }, { status: 200 });
  } catch (error) {
    console.error('Error deleting subject:', error);
    const res_err_5021 = { error: 'Failed to delete subject. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_5021?.error || res_err_5021?.message || 'An error occurred',
        error: res_err_5021?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
