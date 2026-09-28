import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// GET qualifications for an authority member
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const authorityId = searchParams.get('authority_id');

    if (!authorityId) {
      const res_err_355 = { error: 'authority_id parameter is required.' };
      return NextResponse.json({
        success: false,
        message: res_err_355?.error || res_err_355?.message || 'An error occurred',
        error: res_err_355?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    const result = await query(
      'SELECT * FROM authority_qualifications WHERE authority_id = $1 ORDER BY passing_year DESC',
      [authorityId]
    );

    const res_data_660 = { qualifications: result.rows };
      return NextResponse.json({
        success: true,
        message: res_data_660?.message || 'Successfully fecthed data',
        paylod: res_data_660
      }, { status: 200 });
  } catch (error) {
    console.error('Error fetching authority qualifications:', error);
    const res_err_1269 = { error: 'Failed to retrieve qualifications. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_1269?.error || res_err_1269?.message || 'An error occurred',
        error: res_err_1269?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// POST create qualification for authority member (Admin only)
export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_1807 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_1807?.error || res_err_1807?.message || 'An error occurred',
        error: res_err_1807?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { authority_id, degree, institution, passing_year, result: examResult } = await request.json();

    if (!authority_id || !degree || !institution || !passing_year) {
      const res_err_2312 = { error: 'All fields (authority_id, degree, institution, passing_year) are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_2312?.error || res_err_2312?.message || 'An error occurred',
        error: res_err_2312?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Verify authority member exists
    const authCheck = await query('SELECT id FROM authorities WHERE id = $1', [authority_id]);
    if (authCheck.rows.length === 0) {
      const res_err_2861 = { error: 'Authority member not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_2861?.error || res_err_2861?.message || 'An error occurred',
        error: res_err_2861?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const result = await query(
      `INSERT INTO authority_qualifications (authority_id, degree, institution, passing_year, result) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [
        authority_id,
        degree.trim(),
        institution.trim(),
        parseInt(passing_year, 10),
        examResult ? examResult.trim() : null
      ]
    );

    const res_data_2446 = { message: 'Qualification added successfully.', qualification: result.rows[0] };
      return NextResponse.json({
        success: true,
        message: res_data_2446?.message || 'Successfully fecthed data',
        paylod: res_data_2446
      }, { status: 201 });
  } catch (error) {
    console.error('Error creating authority qualification:', error);
    const res_err_4036 = { error: 'Failed to add qualification. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_4036?.error || res_err_4036?.message || 'An error occurred',
        error: res_err_4036?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
