import { NextResponse } from 'next/server';
import {
  getStaffSession,
  revokeStaffSession,
  clearStaffSessionCookie,
} from 'src/lib/middleware/staff';

export async function POST(request) {
  try {
    const sessionData = await getStaffSession(request);
    if (sessionData?.session?.token) {
      await revokeStaffSession(sessionData.session.token);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out of staff portal successfully.',
    });

    await clearStaffSessionCookie(response);

    return response;
  } catch (error) {
    console.error('Error during staff logout:', error);
    const response = NextResponse.json({
      success: true,
      message: 'Logged out.',
    });
    await clearStaffSessionCookie(response);
    return response;
  }
}
