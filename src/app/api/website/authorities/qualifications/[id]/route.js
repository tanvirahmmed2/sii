import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// PUT update authority qualification (Admin only)
export async function PUT(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_307 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_307?.error || res_err_307?.message || 'An error occurred',
        error: res_err_307?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;
    const { degree, institution, passing_year, result: examResult } = await request.json();

    if (!degree || !institution || !passing_year) {
      const res_err_810 = { error: 'Fields (degree, institution, passing_year) are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_810?.error || res_err_810?.message || 'An error occurred',
        error: res_err_810?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    const result = await query(
      `UPDATE authority_qualifications 
       SET degree = $1, institution = $2, passing_year = $3, result = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 
       RETURNING *`,
      [
        degree.trim(),
        institution.trim(),
        parseInt(passing_year, 10),
        examResult ? examResult.trim() : null,
        id
      ]
    );

    if (result.rows.length === 0) {
      const res_err_1590 = { error: 'Qualification not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_1590?.error || res_err_1590?.message || 'An error occurred',
        error: res_err_1590?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const res_data_1269 = {
      message: 'Qualification updated successfully.',
      qualification: result.rows[0]
    };
      return NextResponse.json({
        success: true,
        message: res_data_1269?.message || 'Successfully fecthed data',
        paylod: res_data_1269
      }, { status: 200 });
  } catch (error) {
    console.error('Error updating authority qualification:', error);
    const res_err_2409 = { error: 'Failed to update qualification. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_2409?.error || res_err_2409?.message || 'An error occurred',
        error: res_err_2409?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// DELETE authority qualification (Admin only)
export async function DELETE(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_2942 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_2942?.error || res_err_2942?.message || 'An error occurred',
        error: res_err_2942?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;

    const result = await query('DELETE FROM authority_qualifications WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      const res_err_3447 = { error: 'Qualification not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_3447?.error || res_err_3447?.message || 'An error occurred',
        error: res_err_3447?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const res_data_2430 = {
      message: 'Qualification deleted successfully.',
      id: result.rows[0].id
    };
      return NextResponse.json({
        success: true,
        message: res_data_2430?.message || 'Successfully fecthed data',
        paylod: res_data_2430
      }, { status: 200 });
  } catch (error) {
    console.error('Error deleting authority qualification:', error);
    const res_err_4258 = { error: 'Failed to delete qualification. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_4258?.error || res_err_4258?.message || 'An error occurred',
        error: res_err_4258?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
