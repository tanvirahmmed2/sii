import { NextResponse } from 'next/server';
import { clearAdminSessionCookie } from '@/lib/middleware/developer';

export async function POST() {
  try {
    await clearAdminSessionCookie();
    return NextResponse.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Logout failed.' },
      { status: 500 }
    );
  }
}
