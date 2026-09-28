import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

// Helper to verify if the requester has permission for this teacher's qualifications
async function verifyAccess(teacherId) {
  const adminAuth = await isAdmin();
  if (adminAuth) return true;

  const cookieStore = await cookies();
  const token = cookieStore.get('fit-teacher')?.value;
  if (!token) return false;

  const decoded = verifyJWT(token);
  if (!decoded || !decoded.id) return false;

  return parseInt(decoded.id, 10) === parseInt(teacherId, 10);
}

// PUT update teacher qualification
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { degree, institution, passing_year, result: examResult } = await request.json();

    if (!degree || !institution || !passing_year) {
      const res_err_918 = { error: 'Fields (degree, institution, passing_year) are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_918?.error || res_err_918?.message || 'An error occurred',
        error: res_err_918?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Fetch qualification to check ownership
    const qualCheck = await query('SELECT teacher_id FROM teacher_qualifications WHERE id = $1', [id]);
    if (qualCheck.rows.length === 0) {
      const res_err_1462 = { error: 'Qualification not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_1462?.error || res_err_1462?.message || 'An error occurred',
        error: res_err_1462?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const teacherId = qualCheck.rows[0].teacher_id;
    const hasAccess = await verifyAccess(teacherId);
    if (!hasAccess) {
      const res_err_1916 = { error: 'Unauthorized. Owner teacher or admin only.' };
      return NextResponse.json({
        success: false,
        message: res_err_1916?.error || res_err_1916?.message || 'An error occurred',
        error: res_err_1916?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const result = await query(
      `UPDATE teacher_qualifications 
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

    const res_data_1996 = {
      message: 'Qualification updated successfully.',
      qualification: result.rows[0]
    };
      return NextResponse.json({
        success: true,
        message: res_data_1996?.message || 'Successfully fecthed data',
        paylod: res_data_1996
      }, { status: 200 });
  } catch (error) {
    console.error('Error updating teacher qualification:', error);
    const res_err_3138 = { error: 'Failed to update qualification. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_3138?.error || res_err_3138?.message || 'An error occurred',
        error: res_err_3138?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// DELETE teacher qualification
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    // Fetch qualification to check ownership
    const qualCheck = await query('SELECT teacher_id FROM teacher_qualifications WHERE id = $1', [id]);
    if (qualCheck.rows.length === 0) {
      const res_err_3810 = { error: 'Qualification not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_3810?.error || res_err_3810?.message || 'An error occurred',
        error: res_err_3810?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const teacherId = qualCheck.rows[0].teacher_id;
    const hasAccess = await verifyAccess(teacherId);
    if (!hasAccess) {
      const res_err_4264 = { error: 'Unauthorized. Owner teacher or admin only.' };
      return NextResponse.json({
        success: false,
        message: res_err_4264?.error || res_err_4264?.message || 'An error occurred',
        error: res_err_4264?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const result = await query('DELETE FROM teacher_qualifications WHERE id = $1 RETURNING id', [id]);

    const res_data_3365 = {
      message: 'Qualification deleted successfully.',
      id: result.rows[0].id
    };
      return NextResponse.json({
        success: true,
        message: res_data_3365?.message || 'Successfully fecthed data',
        paylod: res_data_3365
      }, { status: 200 });
  } catch (error) {
    console.error('Error deleting teacher qualification:', error);
    const res_err_5195 = { error: 'Failed to delete qualification. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_5195?.error || res_err_5195?.message || 'An error occurred',
        error: res_err_5195?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
