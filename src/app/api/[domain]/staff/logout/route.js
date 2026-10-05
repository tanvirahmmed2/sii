import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.set('fit-staff', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(0), // expire immediately
      path: '/'
    });

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully.'
    }, { status: 200 });
  } catch (error) {
    console.error('Error logging out staff:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to log out.'
    }, { status: 500 });
  }
}
