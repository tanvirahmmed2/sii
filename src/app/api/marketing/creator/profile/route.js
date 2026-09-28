import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { getCreatorSession, hashPassword } from '@/lib/middleware/creator';

/**
 * API Route: /api/creator/profile
 * Dedicated to the `creators` table for profile & security settings.
 */

export async function GET(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const { searchParams } = new URL(request.url);
    const creatorIdParam = searchParams.get('creatorId');

    const creatorId = creatorIdParam ? Number(creatorIdParam) : sessionCreator?.id;
    if (!creatorId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Creator session required' }, { status: 401 });
    }

    if (sessionCreator && sessionCreator.id !== creatorId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const res = await queryDb(
      `SELECT id, name, email, phone, bio, is_active, is_verified, two_factor_enabled, created_at, updated_at
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
    return NextResponse.json({ success: false, error: 'Creator ID required.' }, { status: 400 });
  }

  if (sessionCreator && sessionCreator.id !== creatorId) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  // 1. Update Creator Profile
  if (action === 'update_profile' || !action) {
    const res = await queryDb(
      `UPDATE creators 
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           bio = COALESCE($3, bio)
       WHERE id = $4
       RETURNING id, name, email, phone, bio, is_active, is_verified, two_factor_enabled, updated_at`,
      [body.name, body.phone, body.bio, creatorId]
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

    const valid = (await hashPassword(currentPassword)) === c.rows[0].password || c.rows[0].password === currentPassword;
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Current password is incorrect.' }, { status: 401 });
    }

    const newHash = await hashPassword(newPassword);
    await queryDb('UPDATE creators SET password = $1 WHERE id = $2', [newHash, creatorId]);
    return NextResponse.json({ success: true, message: 'Password updated successfully.' });
  }

  // 3. Toggle 2FA
  if (action === 'toggle_2fa') {
    const enabled = Boolean(body.enabled);
    const res = await queryDb(
      'UPDATE creators SET two_factor_enabled = $1 WHERE id = $2 RETURNING two_factor_enabled',
      [enabled, creatorId]
    );
    return NextResponse.json({
      success: true,
      two_factor_enabled: res.rows[0]?.two_factor_enabled,
      message: enabled ? 'Two-factor authentication enabled.' : 'Two-factor authentication disabled.',
    });
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
