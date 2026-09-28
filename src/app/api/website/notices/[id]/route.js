import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isRegister } from '@/lib/auth';

// PUT update notice (Admin only)
export async function PUT(request, { params }) {
  try {
    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      const res_err_290 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_290?.error || res_err_290?.message || 'An error occurred',
        error: res_err_290?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;
    const { title, link, is_pinned = false } = await request.json();

    if (!title || !link) {
      const res_err_745 = { error: 'Title and Google Drive Link are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_745?.error || res_err_745?.message || 'An error occurred',
        error: res_err_745?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    const result = await query(
      `UPDATE notices 
       SET title = $1, link = $2, is_pinned = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 
       RETURNING *`,
      [title.trim(), link.trim(), !!is_pinned, id]
    );

    if (result.rows.length === 0) {
      const res_err_1359 = { error: 'Notice not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_1359?.error || res_err_1359?.message || 'An error occurred',
        error: res_err_1359?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const res_data_1031 = {
      message: 'Notice updated successfully.',
      notice: result.rows[0],
    };
      return NextResponse.json({
        success: true,
        message: res_data_1031?.message || 'Successfully fecthed data',
        paylod: res_data_1031
      }, { status: 200 });
  } catch (error) {
    console.error('Error updating notice:', error);
    const res_err_2141 = { error: 'Failed to update notice. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_2141?.error || res_err_2141?.message || 'An error occurred',
        error: res_err_2141?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// DELETE notice (Admin only)
export async function DELETE(request, { params }) {
  try {
    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      const res_err_2650 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_2650?.error || res_err_2650?.message || 'An error occurred',
        error: res_err_2650?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;

    const result = await query('DELETE FROM notices WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      const res_err_3138 = { error: 'Notice not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_3138?.error || res_err_3138?.message || 'An error occurred',
        error: res_err_3138?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const res_data_2114 = {
      message: 'Notice deleted successfully.',
      id: result.rows[0].id,
    };
      return NextResponse.json({
        success: true,
        message: res_data_2114?.message || 'Successfully fecthed data',
        paylod: res_data_2114
      }, { status: 200 });
  } catch (error) {
    console.error('Error deleting notice:', error);
    const res_err_3919 = { error: 'Failed to delete notice. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_3919?.error || res_err_3919?.message || 'An error occurred',
        error: res_err_3919?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
