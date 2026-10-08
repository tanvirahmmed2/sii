import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revokeStaffSession, STAFF_COOKIE_NAME } from 'src/lib/middleware/staff';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token =
      cookieStore.get(STAFF_COOKIE_NAME)?.value ||
      request.headers?.get('authorization')?.replace('Bearer ', '');

    if (token) {
      await revokeStaffSession(token);
    }

    cookieStore.set(STAFF_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(0),
      path: '/',
      sameSite: 'lax',
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Logged out successfully.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error logging out staff:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to log out.',
      },
      { status: 500 }
    );
  }
}
