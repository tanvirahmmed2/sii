import { NextResponse } from 'next/server';
import { getCreatorSession } from 'src/lib/middleware/creator';
import { queryDb } from 'src/lib/database/db';

/**
 * Creator Active Login Sessions API Route
 * Path: /api/marketing/creator/sessions
 * Provides list and revocation of active devices/sessions for creators.
 */

async function ensureSessionsTable() {
  try {
    await queryDb(`
      CREATE TABLE IF NOT EXISTS creator_login_sessions (
          id BIGSERIAL PRIMARY KEY,
          creator_id BIGINT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
          token TEXT UNIQUE NOT NULL,
          ip_address VARCHAR(100),
          user_agent TEXT,
          expires_at TIMESTAMPTZ NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          last_active_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_creator_login_sessions_creator ON creator_login_sessions(creator_id);
      CREATE INDEX IF NOT EXISTS idx_creator_login_sessions_token ON creator_login_sessions(token);
      CREATE INDEX IF NOT EXISTS idx_creator_login_sessions_active ON creator_login_sessions(is_active);
    `);
  } catch (e) {
    console.warn('Notice ensuring creator_login_sessions table:', e.message);
  }
}

export async function GET(request) {
  try {
    await ensureSessionsTable();

    const sessionCreator = await getCreatorSession(request);
    if (!sessionCreator) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid creator session required' },
        { status: 401 }
      );
    }

    const currentToken = sessionCreator.token || '';

    // Auto-record current session if not already in creator_login_sessions
    if (sessionCreator.id && currentToken) {
      try {
        const existing = await queryDb(
          `SELECT id FROM creator_login_sessions WHERE token = $1 LIMIT 1`,
          [currentToken]
        );
        if (existing.rows.length === 0) {
          const ip =
            request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request?.headers?.get('x-real-ip') ||
            '127.0.0.1';
          const userAgent = request?.headers?.get('user-agent') || 'Unknown';
          await queryDb(
            `INSERT INTO creator_login_sessions (creator_id, token, ip_address, user_agent, expires_at)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + INTERVAL '7 days')
             ON CONFLICT (token) DO UPDATE SET is_active = TRUE, last_active_at = CURRENT_TIMESTAMP`,
            [sessionCreator.id, currentToken, ip, userAgent]
          );
        }
      } catch (insertErr) {
        console.warn('Notice syncing current creator session:', insertErr.message);
      }
    }

    const sessionRes = await queryDb(
      `SELECT id, ip_address, user_agent, expires_at, last_active_at, created_at,
              CASE WHEN token = $2 THEN true ELSE false END AS is_current
       FROM creator_login_sessions
       WHERE creator_id = $1 AND is_active = TRUE AND expires_at > CURRENT_TIMESTAMP
       ORDER BY CASE WHEN token = $2 THEN 0 ELSE 1 END, last_active_at DESC`,
      [sessionCreator.id, currentToken]
    );

    const rows = (sessionRes.rows || []).map((row) => ({
      ...row,
      isCurrent: Boolean(row.is_current),
      is_current: Boolean(row.is_current),
    }));

    return NextResponse.json({
      success: true,
      sessions: rows,
      sessionsList: rows,
    });
  } catch (error) {
    console.error('Error fetching creator sessions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    if (!sessionCreator) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid creator session required' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { action, sessionId } = body;
    const currentToken = sessionCreator.token || '';

    if (action === 'revoke_all_others' || action === 'revoke_other_sessions') {
      const res = await queryDb(
        `UPDATE creator_login_sessions
         SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE creator_id = $1 AND token != $2 AND is_active = TRUE`,
        [sessionCreator.id, currentToken]
      );

      return NextResponse.json({
        success: true,
        revokedCount: res.rowCount || 0,
        message: 'All other active devices have been logged out successfully.',
      });
    }

    if (action === 'revoke_session') {
      if (!sessionId) {
        return NextResponse.json(
          { success: false, error: 'Session ID is required.' },
          { status: 400 }
        );
      }

      // Check if session being revoked is current device
      const checkRes = await queryDb(
        `SELECT token FROM creator_login_sessions WHERE id = $1 AND creator_id = $2 LIMIT 1`,
        [sessionId, sessionCreator.id]
      );

      const isCurrent = checkRes.rows[0]?.token === currentToken;

      await queryDb(
        `UPDATE creator_login_sessions
         SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE creator_id = $1 AND id = $2`,
        [sessionCreator.id, sessionId]
      );

      return NextResponse.json({
        success: true,
        isCurrent,
        message: isCurrent ? 'Current session signed out.' : 'Device session revoked successfully.',
      });
    }

    return NextResponse.json(
      { success: false, error: `Invalid action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in creator sessions POST:', error);
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
