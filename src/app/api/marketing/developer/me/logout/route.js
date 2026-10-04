import { NextResponse } from 'next/server';
import { clearAdminSessionCookie } from 'src/lib/middleware/developer';
import { DEVELOPER_TOKEN } from 'src/lib/database/secret';
import { queryDb } from 'src/lib/database/db';

export async function POST(request) {
  try {
    const token =
      request?.cookies?.get?.(DEVELOPER_TOKEN)?.value ||
      request?.headers?.get?.('authorization')?.replace('Bearer ', '');

    if (token) {
      await queryDb(
        `UPDATE developer_login_sessions SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE token = $1`,
        [token]
      ).catch(() => {});
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
    await clearAdminSessionCookie(response);

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Logout failed.' },
      { status: 500 }
    );
  }
}
