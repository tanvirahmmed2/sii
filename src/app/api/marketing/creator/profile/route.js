import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { getCreatorSession, hashPassword, comparePassword } from 'src/lib/middleware/creator';

/**
 * API Route: /api/creator/profile
 * Dedicated to the `creators` table for profile & security settings.
 */

export async function GET(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const { searchParams } = new URL(request.url);
    const creatorIdParam = searchParams.get('creatorId');

    const creatorId = creatorIdParam ? Number(creatorIdParam) : Number(sessionCreator?.id);
    if (!creatorId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Creator session required' }, { status: 401 });
    }

    if (sessionCreator && Number(sessionCreator.id) !== creatorId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const res = await queryDb(
      `SELECT id, name, email, phone, institution, country, city, address,
              institution AS bio, is_active, email_verified AS is_verified,
              (CASE WHEN two_factor_code IS NOT NULL THEN true ELSE false END) AS two_factor_enabled,
              last_login_at, created_at, updated_at
       FROM creators WHERE id = $1 LIMIT 1`,
      [creatorId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Creator not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, creator: res.rows[0] });
  } catch (error) {
    console.error('Creator Profile GET API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function handleProfileAction(body, sessionCreator) {
  const { action } = body;
  const creatorId = Number(body.creatorId || sessionCreator?.id);

  if (!creatorId) {
    return NextResponse.json({ success: false, error: 'Creator ID required.' }, { status: 401 });
  }

  if (sessionCreator && Number(sessionCreator.id) !== creatorId) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  // 1. Update Creator Profile
  if (action === 'update_profile' || !action) {
    const res = await queryDb(
      `UPDATE creators 
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           institution = COALESCE($3, institution),
           country = COALESCE($4, country),
           city = COALESCE($5, city),
           address = COALESCE($6, address),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING id, name, email, phone, institution, country, city, address, institution AS bio, is_active, email_verified AS is_verified, updated_at`,
      [
        body.name?.trim() || null,
        body.phone?.trim() || null,
        (body.institution || body.bio)?.trim() || null,
        body.country?.trim() || null,
        body.city?.trim() || null,
        body.address?.trim() || null,
        creatorId,
      ]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Creator not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, creator: res.rows[0], message: 'Profile updated successfully.' });
  }

  // 2. Change Creator Password
  if (action === 'change_password') {
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, error: 'Current and new passwords are required.' }, { status: 400 });
    }

    if (String(newPassword).length < 6) {
      return NextResponse.json({ success: false, error: 'New password must be at least 6 characters.' }, { status: 400 });
    }

    const c = await queryDb('SELECT password FROM creators WHERE id = $1', [creatorId]);
    if (c.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Creator not found.' }, { status: 404 });
    }

    const isBcryptMatch = await comparePassword(currentPassword, c.rows[0].password).catch(() => false);
    const isPlainMatch = c.rows[0].password === currentPassword;
    if (!isBcryptMatch && !isPlainMatch) {
      return NextResponse.json({ success: false, error: 'Current password is incorrect.' }, { status: 401 });
    }

    const newHash = await hashPassword(newPassword);
    await queryDb('UPDATE creators SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newHash, creatorId]);
    return NextResponse.json({ success: true, message: 'Password updated successfully.' });
  }

  // 3. Toggle 2FA
  if (action === 'toggle_2fa') {
    const enabled = Boolean(body.enabled);
    const res = await queryDb(
      `UPDATE creators 
       SET two_factor_code = CASE WHEN $1 THEN 'ENABLED' ELSE NULL END, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING (two_factor_code IS NOT NULL) AS two_factor_enabled`,
      [enabled, creatorId]
    );
    return NextResponse.json({
      success: true,
      two_factor_enabled: Boolean(res.rows[0]?.two_factor_enabled),
      message: enabled ? 'Two-factor authentication enabled.' : 'Two-factor authentication disabled.',
    });
  }

  // 4. List Active Sessions
  if (action === 'list_sessions') {
    const currentToken = sessionCreator?.token || '';
    const sessionRes = await queryDb(
      `SELECT id, ip_address, user_agent, expires_at, last_active_at, created_at,
              CASE WHEN token = $2 THEN true ELSE false END AS is_current
       FROM creator_login_sessions
       WHERE creator_id = $1 AND is_active = TRUE AND expires_at > CURRENT_TIMESTAMP
       ORDER BY CASE WHEN token = $2 THEN 0 ELSE 1 END, last_active_at DESC`,
      [creatorId, currentToken]
    );
    return NextResponse.json({ success: true, sessionsList: sessionRes.rows || [] });
  }

  // 5. Revoke Single Session
  if (action === 'revoke_session') {
    const { sessionId } = body;
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID required.' }, { status: 400 });
    }
    await queryDb(
      `UPDATE creator_login_sessions
       SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE creator_id = $1 AND id = $2`,
      [creatorId, sessionId]
    );
    return NextResponse.json({ success: true, message: 'Device session logged out successfully.' });
  }

  // 6. Revoke Other Sessions
  if (action === 'revoke_other_sessions') {
    const currentToken = sessionCreator?.token || '';
    await queryDb(
      `UPDATE creator_login_sessions
       SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE creator_id = $1 AND token != $2`,
      [creatorId, currentToken]
    );
    return NextResponse.json({ success: true, message: 'All other active creator devices logged out successfully.' });
  }

  return NextResponse.json({ success: false, error: `Unknown profile action: ${action}` }, { status: 400 });
}

export async function POST(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const body = await request.json();
    return await handleProfileAction(body, sessionCreator);
  } catch (error) {
    console.error('Creator Profile POST API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
