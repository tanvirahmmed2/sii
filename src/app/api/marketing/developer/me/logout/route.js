import { NextResponse } from 'next/server';
import { clearAdminSessionCookie } from 'src/lib/middleware/developer';
import { DEVELOPER_TOKEN } from 'src/lib/database/secret';
import { queryDb } from 'src/lib/database/db';

export async function POST(request) {
  try {
    const cookieName = DEVELOPER_TOKEN || 'hiesci-dev';
    const token =
      request?.cookies?.get?.(cookieName)?.value ||
      request?.cookies?.get?.('dev_admin_token')?.value ||
      request?.cookies?.get?.('fit-dev')?.value ||
      request?.headers?.get?.('authorization')?.replace('Bearer ', '');

    if (token) {
      await queryDb(
        `UPDATE developer_login_sessions SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE token = $1`,
        [token]
      ).catch(() => {});
    }

    await clearAdminSessionCookie();
    const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });

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
