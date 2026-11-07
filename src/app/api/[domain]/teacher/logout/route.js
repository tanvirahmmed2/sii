import { NextResponse } from 'next/server';
import { clearTeacherSessionCookie } from 'src/lib/middleware/teacher.js';

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully.',
    });

    await clearTeacherSessionCookie(response);

    return response;
  } catch (error) {
    console.error('Error during teacher logout:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error during logout.' },
      { status: 500 }
    );
  }
}
