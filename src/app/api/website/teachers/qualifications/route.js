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

// GET qualifications for a teacher
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacher_id');

    if (!teacherId) {
      const res_err_856 = { error: 'teacher_id parameter is required.' };
      return NextResponse.json({
        success: false,
        message: res_err_856?.error || res_err_856?.message || 'An error occurred',
        error: res_err_856?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    const result = await query(
      'SELECT * FROM teacher_qualifications WHERE teacher_id = $1 ORDER BY passing_year DESC',
      [teacherId]
    );

    const res_data_1346 = { qualifications: result.rows };
      return NextResponse.json({
        success: true,
        message: res_data_1346?.message || 'Successfully fecthed data',
        paylod: res_data_1346
      }, { status: 200 });
  } catch (error) {
    console.error('Error fetching teacher qualifications:', error);
    const res_err_2191 = { error: 'Failed to retrieve qualifications. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_2191?.error || res_err_2191?.message || 'An error occurred',
        error: res_err_2191?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// POST create qualification for teacher
export async function POST(request) {
  try {
    const { teacher_id, degree, institution, passing_year, result: examResult } = await request.json();

    if (!teacher_id || !degree || !institution || !passing_year) {
      const res_err_2810 = { error: 'All fields (teacher_id, degree, institution, passing_year) are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_2810?.error || res_err_2810?.message || 'An error occurred',
        error: res_err_2810?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    const hasAccess = await verifyAccess(teacher_id);
    if (!hasAccess) {
      const res_err_3261 = { error: 'Unauthorized. Admins or the owner teacher only.' };
      return NextResponse.json({
        success: false,
        message: res_err_3261?.error || res_err_3261?.message || 'An error occurred',
        error: res_err_3261?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    // Verify teacher exists
    const teacherCheck = await query('SELECT id FROM teachers WHERE id = $1', [teacher_id]);
    if (teacherCheck.rows.length === 0) {
      const res_err_3775 = { error: 'Teacher not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_3775?.error || res_err_3775?.message || 'An error occurred',
        error: res_err_3775?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const result = await query(
      `INSERT INTO teacher_qualifications (teacher_id, degree, institution, passing_year, result) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [
        teacher_id,
        degree.trim(),
        institution.trim(),
        parseInt(passing_year, 10),
        examResult ? examResult.trim() : null
      ]
    );

    const res_data_3113 = { message: 'Qualification added successfully.', qualification: result.rows[0] };
      return NextResponse.json({
        success: true,
        message: res_data_3113?.message || 'Successfully fecthed data',
        paylod: res_data_3113
      }, { status: 201 });
  } catch (error) {
    console.error('Error creating teacher qualification:', error);
    const res_err_4933 = { error: 'Failed to add qualification. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_4933?.error || res_err_4933?.message || 'An error occurred',
        error: res_err_4933?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
