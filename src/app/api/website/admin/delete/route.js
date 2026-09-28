import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { verifyJWT, comparePassword } from '@/lib/auth';

export async function DELETE(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-admin')?.value;

    let loggedInAdminId = null;

    if (token) {
      const decoded = verifyJWT(token);
      if (decoded && decoded.id) {
        loggedInAdminId = decoded.id;
      }
    }

    // Try parsing the request body for parameters
    let targetId = null;
    let email = null;
    let password = null;
    try {
      const body = await request.json();
      if (body) {
        targetId = body.id;
        email = body.email;
        password = body.password;
      }
    } catch (e) {
      // Body is empty or not JSON, which is fine
    }

    // Fallback authentication check if token is missing
    if (!loggedInAdminId && email && password) {
      const result = await query('SELECT * FROM admins WHERE email = $1', [email]);
      if (result.rows.length > 0) {
        const admin = result.rows[0];
        const isPasswordValid = await comparePassword(password, admin.password_hash);
        if (isPasswordValid) {
          loggedInAdminId = admin.id;
        }
      }
    }

    // If still unauthorized, return 401
    if (!loggedInAdminId) {
      const res_err_1390 = { error: 'Unauthorized. Please login or provide valid email and password.' };
      return NextResponse.json({
        success: false,
        message: res_err_1390?.error || res_err_1390?.message || 'An error occurred',
        error: res_err_1390?.error || 'Internal Server Error',
        paylod: null
      }, { status: 401 });
    }

    // CASE 1: Delete another admin by ID
    if (targetId && Number(targetId) !== Number(loggedInAdminId)) {
      // Perform deletion of target
      const deleteResult = await query('DELETE FROM admins WHERE id = $1 RETURNING id', [targetId]);
      
      if (deleteResult.rowCount === 0) {
        const res_err_2053 = { error: 'Admin account to delete not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_2053?.error || res_err_2053?.message || 'An error occurred',
        error: res_err_2053?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
      }

      const res_data_1970 = {
        message: 'Admin account deleted successfully.'
      };
      return NextResponse.json({
        success: true,
        message: res_data_1970?.message || 'Successfully fecthed data',
        paylod: res_data_1970
      }, { status: 200 });
    }

    // CASE 2: Self-deletion warning/prevent (if targetId matches loggedInAdminId)
    if (targetId && Number(targetId) === Number(loggedInAdminId)) {
      const res_err_2924 = { error: 'Self-deletion is not permitted from the Access Panel to avoid admin lockout.' };
      return NextResponse.json({
        success: false,
        message: res_err_2924?.error || res_err_2924?.message || 'An error occurred',
        error: res_err_2924?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Execute self-delete (for generic call to delete own account)
    await query('DELETE FROM admins WHERE id = $1', [loggedInAdminId]);

    // Clear session cookie
    cookieStore.set('fit-admin', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
      path: '/',
      sameSite: 'strict',
    });

    const res_data_2999 = {
      message: 'Admin account deleted successfully.'
    };
      return NextResponse.json({
        success: true,
        message: res_data_2999?.message || 'Successfully fecthed data',
        paylod: res_data_2999
      }, { status: 200 });
  } catch (error) {
    console.error('Error deleting admin account:', error);
    const res_err_4100 = { error: 'Failed to delete admin account. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_4100?.error || res_err_4100?.message || 'An error occurred',
        error: res_err_4100?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
