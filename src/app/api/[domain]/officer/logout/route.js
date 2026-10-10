import { NextResponse } from 'next/server';
import {
  getOfficerSession,
  revokeOfficerSession,
  clearOfficerSessionCookie,
} from 'src/lib/middleware/officer.js';

export async function POST(request) {
  try {
    const session = await getOfficerSession(request);

    if (session?.session?.token) {
      await revokeOfficerSession(session.session.token);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully.',
    });

    await clearOfficerSessionCookie(response);
    return response;
  } catch (error) {
    console.error('Error logging out officer:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error during logout.' },
      { status: 500 }
    );
  }
}
