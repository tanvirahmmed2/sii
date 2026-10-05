import { NextResponse } from 'next/server';
import { getCreatorSession } from 'src/lib/middleware/creator';
import { queryDb } from 'src/lib/database/db';

/**
 * Creator Active Login Sessions API Route
 * Path: /api/marketing/creator/sessions
 * Provides list and revocation of active devices/sessions for creators.
 */

export async function GET(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    if (!sessionCreator) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid creator session required' },
        { status: 401 }
      );
    }

    const currentToken = sessionCreator.token || '';

    const sessionRes = await queryDb(
      `SELECT id, ip_address, user_agent, expires_at, last_active_at, created_at,
              CASE WHEN token = $2 THEN true ELSE false END AS is_current
       FROM creator_login_sessions
       WHERE creator_id = $1 AND is_active = TRUE AND expires_at > CURRENT_TIMESTAMP
       ORDER BY CASE WHEN token = $2 THEN 0 ELSE 1 END, last_active_at DESC`,
      [sessionCreator.id, currentToken]
    );

    return NextResponse.json({
      success: true,
      sessionsList: sessionRes.rows || [],
    });
  } catch (error) {
    console.error('Error fetching creator sessions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    if (!sessionCreator) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid creator session required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const revokeOthers = searchParams.get('revokeOthers') === 'true';
    const currentToken = sessionCreator.token || '';

    if (revokeOthers) {
      await queryDb(
        `UPDATE creator_login_sessions
         SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE creator_id = $1 AND token != $2`,
        [sessionCreator.id, currentToken]
      );

      return NextResponse.json({
        success: true,
        message: 'All other active creator devices have been logged out successfully.',
      });
    }

    if (sessionId) {
      await queryDb(
        `UPDATE creator_login_sessions
         SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE creator_id = $1 AND id = $2`,
        [sessionCreator.id, sessionId]
      );

      return NextResponse.json({
        success: true,
        message: 'Device session has been revoked and logged out successfully.',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Session ID or action required.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error revoking creator session:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
