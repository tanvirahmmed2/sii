import { NextResponse } from 'next/server';
import { clearAdminSessionCookie } from '@/lib/middleware/developer';
import { DEVELOPER_TOKEN } from '@/lib/database/secret';

export async function POST() {
  try {
    await clearAdminSessionCookie();
    const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });

    const cookieName = DEVELOPER_TOKEN || 'hiesci-dev';
    const clearOptions = { path: '/', maxAge: 0, expires: new Date(0) };

    response.cookies.set(cookieName, '', clearOptions);
    response.cookies.set('dev_admin_token', '', clearOptions);
    response.cookies.set('fit-dev', '', clearOptions);

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Logout failed.' },
      { status: 500 }
    );
  }
}
