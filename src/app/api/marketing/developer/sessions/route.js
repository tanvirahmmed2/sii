import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from 'src/lib/middleware/developer';
import { queryDb } from 'src/lib/database/db';

/**
 * Developer Active Login Sessions API Route
 * Path: /api/marketing/developer/sessions
 * Provides list and revocation of active devices/sessions for developers.
 */

export async function GET(request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please log in to view active sessions.' },
        { status: 401 }
      );
    }

    const currentToken = authUser.token || '';

    const sessionRes = await queryDb(
      `SELECT id, ip_address, user_agent, expires_at, last_active_at, created_at,
              CASE WHEN token = $2 THEN true ELSE false END AS is_current
       FROM developer_login_sessions
       WHERE developer_id = $1 AND is_active = TRUE AND expires_at > CURRENT_TIMESTAMP
       ORDER BY CASE WHEN token = $2 THEN 0 ELSE 1 END, last_active_at DESC`,
      [authUser.id, currentToken]
    );

    return NextResponse.json({
      success: true,
      sessionsList: sessionRes.rows || [],
    });
  } catch (error) {
    console.error('Error fetching developer sessions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please log in to manage sessions.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const revokeOthers = searchParams.get('revokeOthers') === 'true';
    const currentToken = authUser.token || '';

    if (revokeOthers) {
      await queryDb(
        `UPDATE developer_login_sessions
         SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE developer_id = $1 AND token != $2`,
        [authUser.id, currentToken]
      );

      return NextResponse.json({
        success: true,
        message: 'All other active developer sessions have been logged out successfully.',
      });
    }

    if (sessionId) {
      await queryDb(
        `UPDATE developer_login_sessions
         SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE developer_id = $1 AND id = $2`,
        [authUser.id, sessionId]
      );

      return NextResponse.json({
        success: true,
        message: 'Developer device session has been revoked and logged out successfully.',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Session ID or action required.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error revoking developer session:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
