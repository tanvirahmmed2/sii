import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { getCreatorSession, hashPassword, comparePassword, generateToken, setCreatorSessionCookie } from 'src/lib/middleware/creator';
import {
  inspectMalwareAndAttacks,
  generateSecureOtp,
  checkOtpDispatchRateLimit,
  recordOtpDispatch,
  getClientIp,
} from 'src/lib/security/shield';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo';
import { SITE_NAME } from 'src/lib/database/secret';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      `SELECT id, name, email, phone, country, city, address,
              is_active, email_verified AS is_verified,
              COALESCE(two_factor_enabled, false) AS two_factor_enabled,
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

  if (action === 'update_profile' || !action) {
    const currentCreatorRes = await queryDb(
      'SELECT id, name, email, phone, country, city, address FROM creators WHERE id = $1 LIMIT 1',
      [creatorId]
    );

    if (currentCreatorRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Creator not found' }, { status: 404 });
    }

    const currentCreator = currentCreatorRes.rows[0];
    const currentEmail = String(currentCreator.email || '').toLowerCase().trim();
    const currentPhone = String(currentCreator.phone || '').trim();

    const newName = body.name !== undefined ? body.name.trim() : currentCreator.name;
    if (!newName) {
      return NextResponse.json({ success: false, error: 'Full name cannot be empty.' }, { status: 400 });
    }

    const newCountry = body.country !== undefined ? body.country.trim() : currentCreator.country;
    const newCity = body.city !== undefined ? body.city.trim() : currentCreator.city;
    const newAddress = body.address !== undefined ? body.address.trim() : currentCreator.address;

    let newEmail = currentEmail;
    let emailChanged = false;
    if (body.email !== undefined) {
      newEmail = String(body.email || '').trim().toLowerCase();
      if (!newEmail) {
        return NextResponse.json({ success: false, error: 'Email address cannot be empty.' }, { status: 400 });
      }
      if (!EMAIL_REGEX.test(newEmail)) {
        return NextResponse.json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 });
      }

      if (newEmail !== currentEmail) {
        const emailCheck = await queryDb(
          'SELECT id FROM creators WHERE LOWER(email) = LOWER($1) AND id != $2 LIMIT 1',
          [newEmail, creatorId]
        );
        if (emailCheck.rows.length > 0) {
          return NextResponse.json(
            { success: false, error: 'This email address is already registered to another creator account.' },
            { status: 409 }
          );
        }
        emailChanged = true;
      }
    }

    let newPhone = currentPhone;
    let phoneChanged = false;
    if (body.phone !== undefined) {
      newPhone = String(body.phone || '').trim();
      if (!newPhone) {
        return NextResponse.json({ success: false, error: 'Phone number cannot be empty.' }, { status: 400 });
      }

      if (newPhone !== currentPhone) {
        const phoneCheck = await queryDb(
          'SELECT id FROM creators WHERE phone = $1 AND id != $2 LIMIT 1',
          [newPhone, creatorId]
        );
        if (phoneCheck.rows.length > 0) {
          return NextResponse.json(
            { success: false, error: 'This phone number is already registered to another creator account.' },
            { status: 409 }
          );
        }
        phoneChanged = true;
      }
    }

    const contactChanged = emailChanged || phoneChanged;
    if (contactChanged) {
      const otpCode = String(body.otpCode || '').trim();
      if (!otpCode) {
        const ip = getClientIp(request);
        const rateCheck = await checkOtpDispatchRateLimit({
          identifier: currentCreator.email,
          phone: currentCreator.phone,
          email: currentCreator.email,
          ip,
        });

        if (!rateCheck.isAllowed) {
          return NextResponse.json(
            { success: false, error: rateCheck.error, rateLimited: true, remainingMinutes: rateCheck.remainingMinutes },
            { status: 429 }
          );
        }

        const generatedOtp = generateSecureOtp(6);
        await queryDb('DELETE FROM contact_update_verifications WHERE user_type = $1 AND user_id = $2', ['creator', creatorId]);
        await queryDb(
          `INSERT INTO contact_update_verifications (user_type, user_id, new_email, new_phone, otp_code, expires_at)
           VALUES ('creator', $1, $2, $3, $4, CURRENT_TIMESTAMP + INTERVAL '10 minutes')`,
          [creatorId, newEmail, newPhone, generatedOtp]
        );

        try {
          await sendEmail({
            to: currentCreator.email,
            toName: currentCreator.name,
            subject: `Security Verification Code: ${generatedOtp} - ${SITE_NAME}`,
            html: buildStyledEmail({
              title: 'Verify Profile Contact Update',
              subtitle: 'A request was made to update your creator account email or phone number.',
              recipientName: currentCreator.name,
              code: generatedOtp,
              codeLabel: 'Security Verification Code',
              bodyParagraphs: [
                `You requested to change your contact details on ${SITE_NAME}.`,
                emailChanged ? `Requested Email: ${newEmail}` : null,
                phoneChanged ? `Requested Phone: ${newPhone}` : null,
                'Please enter this 6-digit verification code to confirm and apply your changes.',
                'This code will expire in 10 minutes. If you did not initiate this change, please change your password immediately.',
              ].filter(Boolean),
            }),
          });

          await recordOtpDispatch({
            identifier: currentCreator.email,
            phone: currentCreator.phone,
            email: currentCreator.email,
            channel: 'email',
            purpose: 'contact_update',
            ip,
          });
        } catch (mailErr) {
          console.error('Failed to dispatch contact update OTP email:', mailErr);
          return NextResponse.json(
            { success: false, error: `Failed to dispatch security verification email: ${mailErr.message || 'Mail service error.'}` },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: false,
          otpRequired: true,
          message: `A 6-digit verification code has been sent to your registered email (${currentCreator.email}) to confirm the change of your contact details.`,
        });
      }

      const verifyRes = await queryDb(
        `SELECT id, new_email, new_phone FROM contact_update_verifications
         WHERE user_type = 'creator' AND user_id = $1 AND otp_code = $2 AND expires_at > CURRENT_TIMESTAMP
         ORDER BY id DESC LIMIT 1`,
        [creatorId, otpCode]
      );

      if (verifyRes.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired verification code. Please request a new code.' },
          { status: 400 }
        );
      }

      const verifiedRecord = verifyRes.rows[0];
      newEmail = verifiedRecord.new_email || newEmail;
      newPhone = verifiedRecord.new_phone || newPhone;
      if (newEmail !== currentEmail) {
        emailChanged = true;
      }

      await queryDb('DELETE FROM contact_update_verifications WHERE id = $1', [verifiedRecord.id]);
    }

    const res = await queryDb(
      `UPDATE creators 
       SET name = $1,
           email = $2,
           phone = $3,
           country = $4,
           city = $5,
           address = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING id, name, email, phone, country, city, address, is_active, email_verified AS is_verified, COALESCE(two_factor_enabled, false) AS two_factor_enabled, updated_at`,
      [
        newName,
        newEmail,
        newPhone,
        newCountry || null,
        newCity || null,
        newAddress || null,
        creatorId,
      ]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Creator not found' }, { status: 404 });
    }

    const updatedCreator = res.rows[0];
    const response = NextResponse.json({
      success: true,
      creator: updatedCreator,
      message: 'Profile updated successfully.',
    });

    if (emailChanged) {
      try {
        const refreshedToken = generateToken({
          id: Number(updatedCreator.id),
          email: updatedCreator.email,
          role: 'creator',
          type: 'creator',
        });
        await queryDb(
          'UPDATE creator_login_sessions SET token = $1 WHERE creator_id = $2 AND is_active = TRUE',
          [refreshedToken, updatedCreator.id]
        ).catch(() => {});
        await setCreatorSessionCookie(response, refreshedToken);
      } catch (cookieErr) {
        console.warn('Could not refresh creator session cookie after email change:', cookieErr);
      }
    }

    return response;
  }

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

    const isMatch = await comparePassword(currentPassword, c.rows[0].password);
    if (!isMatch) {
      return NextResponse.json({ success: false, error: 'Current password is incorrect.' }, { status: 401 });
    }

    const newHash = await hashPassword(newPassword);
    await queryDb('UPDATE creators SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newHash, creatorId]);
    return NextResponse.json({ success: true, message: 'Password updated successfully.' });
  }

  if (action === 'toggle_2fa') {
    const enabled = Boolean(body.enabled);
    const res = await queryDb(
      `UPDATE creators 
       SET two_factor_enabled = $1, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING COALESCE(two_factor_enabled, false) AS two_factor_enabled`,
      [enabled, creatorId]
    );
    return NextResponse.json({
      success: true,
      two_factor_enabled: Boolean(res.rows[0]?.two_factor_enabled),
      message: enabled ? 'Two-factor authentication enabled.' : 'Two-factor authentication disabled.',
    });
  }

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

  if (action === 'list_activities') {
    const actRes = await queryDb(
      `SELECT id, ip_address, user_agent, status, failure_reason, created_at
       FROM creator_login_activities
       WHERE creator_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [creatorId]
    );
    return NextResponse.json({ success: true, activities: actRes.rows || [] });
  }

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
    const sec = await inspectMalwareAndAttacks(request, body);
    if (sec.isBlocked || sec.allowed === false) {
      return NextResponse.json(
        { success: false, error: sec.error || 'Request blocked by security rules.' },
        { status: sec.status || 403 }
      );
    }
    return await handleProfileAction(body, sessionCreator);
  } catch (error) {
    console.error('Creator Profile POST API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}