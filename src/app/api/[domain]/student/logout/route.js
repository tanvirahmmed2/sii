import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.set('fit-student', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
      path: '/',
      sameSite: 'strict',
    });

    const res_data_403 = { message: 'Logged out successfully.' };
      return NextResponse.json({
        success: true,
        message: res_data_403?.message || 'Successfully fecthed data',
        paylod: res_data_403
      }, { status: 200 });
  } catch (error) {
    console.error('Student logout error:', error);
    const res_err_773 = { error: 'Internal server error during logout.' };
      return NextResponse.json({
        success: false,
        message: res_err_773?.error || res_err_773?.message || 'An error occurred',
        error: res_err_773?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
