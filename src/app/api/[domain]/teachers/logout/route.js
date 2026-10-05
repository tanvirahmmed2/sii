import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.set('fit-teacher', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
      path: '/',
      sameSite: 'strict',
    });

    const res_data_403 = { message: 'Teacher logged out successfully.' };
      return NextResponse.json({
        success: true,
        message: res_data_403?.message || 'Successfully fecthed data',
        paylod: res_data_403
      }, { status: 200 });
  } catch (error) {
    console.error('Teacher logout error:', error);
    const res_err_781 = { error: 'Internal server error during logout.' };
      return NextResponse.json({
        success: false,
        message: res_err_781?.error || res_err_781?.message || 'An error occurred',
        error: res_err_781?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
