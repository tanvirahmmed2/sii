import { NextResponse } from 'next/server';
import { clearStudentSessionCookie, revokeStudentLoginSession, STUDENT_COOKIE_NAME } from 'src/lib/middleware/students.js';

export async function POST(request) {
  try {
    const token =
      request.cookies?.get?.(STUDENT_COOKIE_NAME)?.value ||
      request.cookies?.get?.('fit-student')?.value;

    if (token) {
      await revokeStudentLoginSession(token);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully.',
    });

    await clearStudentSessionCookie(response);

    return response;
  } catch (error) {
    console.error('Error logging out student:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
