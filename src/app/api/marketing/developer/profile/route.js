import { NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  hashPassword,
  comparePassword,
  generateToken,
  setDeveloperSessionCookie,
} from 'src/lib/middleware/developer';
import { queryDb } from 'src/lib/database/db';
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
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please log in to view profile.' },
        { status: 401 }
      );
    }

    const devRes = await queryDb(
      `SELECT d.id, d.name, d.email, d.phone, d.bio,
              d.github_profile, d.linkedin_profile,
              d.role_id, r.name AS role_name, r.slug AS role_slug,
              d.is_active, d.email_verified, COALESCE(d.two_factor_enabled, false) AS two_factor_enabled, d.last_login_at, d.created_at, d.updated_at
       FROM developers d
       LEFT JOIN developer_roles r ON d.role_id = r.id
       WHERE d.id = $1
       LIMIT 1`,
      [authUser.id]
    );

    if (devRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Developer account not found.' },
        { status: 404 }
      );
    }

    const developer = devRes.rows[0];

    const currentToken = authUser.token || '';
    const sessionRes = await queryDb(
      `SELECT id, ip_address, user_agent, expires_at, last_active_at, created_at,
              CASE WHEN token = $2 THEN true ELSE false END AS is_current
       FROM developer_login_sessions
       WHERE developer_id = $1 AND is_active = TRUE AND expires_at > CURRENT_TIMESTAMP
       ORDER BY CASE WHEN token = $2 THEN 0 ELSE 1 END, last_active_at DESC`,
      [developer.id, currentToken]
    ).catch(() => ({ rows: [] }));

    const activeSessions = sessionRes.rows.length || 1;

    const loginRes = await queryDb(
      `SELECT id, status, ip_address, user_agent, failure_reason, login_time, created_at
       FROM developer_login_activities
       WHERE developer_id = $1
       ORDER BY id DESC
       LIMIT 15`,
      [developer.id]
    ).catch(() => ({ rows: [] }));

    let rolePermissions = [];
    const permRes = await queryDb(
      `SELECT m.name AS module_name, m.slug AS module_slug, mp.can_view, mp.can_create, mp.can_edit, mp.can_delete
       FROM module_permissions mp
       JOIN modules m ON mp.module_id = m.id
       WHERE mp.developer_id = $1 AND m.is_active = TRUE
       ORDER BY m.name ASC`,
      [developer.id]
    ).catch(() => ({ rows: [] }));
    rolePermissions = permRes.rows || [];

    const statsRes = await queryDb(
      `SELECT 
        (SELECT COUNT(*)::int FROM support_tickets WHERE assigned_developer_id = $1) AS assigned_tickets,
        (SELECT COUNT(*)::int FROM ticket_replies WHERE developer_id = $1) AS ticket_replies_count
      `,
      [developer.id]
    ).catch(() => ({ rows: [{ assigned_tickets: 0, ticket_replies_count: 0 }] }));

    const stats = statsRes.rows[0] || { assigned_tickets: 0, ticket_replies_count: 0 };

    return NextResponse.json({
      success: true,
      developer: {
        ...developer,
        role: developer.role_slug || 'developer',
        role_name: developer.role_name || 'Developer',
        is_verified: Boolean(developer.email_verified),
        isVerified: Boolean(developer.email_verified),
        two_factor_enabled: Boolean(developer.two_factor_enabled),
        permissions: authUser.permissions || [],
        rolePermissions,
        isAdmin: Boolean(authUser.isAdmin),
        stats,
      },
      activeSessions,
      sessionsList: sessionRes.rows,
      recentLogins: loginRes.rows,
    });
  } catch (error) {
    console.error('Error fetching developer profile:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please log in to update profile.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const sec = await inspectMalwareAndAttacks(request, body);
    if (sec.isBlocked || sec.allowed === false) {
      return NextResponse.json(
        { success: false, error: sec.error || 'Request blocked by security rules.' },
        { status: sec.status || 403 }
      );
    }

    const data = body.data || body;

    const currentRes = await queryDb(
      `SELECT d.id, d.name, d.email, d.phone, d.bio,
              d.github_profile, d.linkedin_profile, d.password,
              d.role_id, r.name AS role_name, r.slug AS role_slug,
              d.is_active, d.email_verified, COALESCE(d.two_factor_enabled, false) AS two_factor_enabled
       FROM developers d
       LEFT JOIN developer_roles r ON d.role_id = r.id
       WHERE d.id = $1 LIMIT 1`,
      [authUser.id]
    );

    if (currentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Developer account not found.' }, { status: 404 });
    }

    const currentDev = currentRes.rows[0];
    const currentEmail = String(currentDev.email || '').toLowerCase().trim();
    const currentPhone = String(currentDev.phone || '').trim();

    let newName = currentDev.name;
    if (data.name !== undefined) {
      newName = data.name.trim();
      if (!newName) {
        return NextResponse.json({ success: false, error: 'Full name cannot be empty.' }, { status: 400 });
      }
    }

    let newEmail = currentEmail;
    let emailChanged = false;
    if (data.email !== undefined) {
      newEmail = String(data.email || '').trim().toLowerCase();
      if (!newEmail) {
        return NextResponse.json({ success: false, error: 'Email address cannot be empty.' }, { status: 400 });
      }
      if (!EMAIL_REGEX.test(newEmail)) {
        return NextResponse.json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 });
      }

      if (newEmail !== currentEmail) {
        const emailCheck = await queryDb(
          'SELECT id FROM developers WHERE LOWER(email) = LOWER($1) AND id != $2 LIMIT 1',
          [newEmail, authUser.id]
        );
        if (emailCheck.rows.length > 0) {
          return NextResponse.json(
            { success: false, error: 'This email address is already registered to another account.' },
            { status: 409 }
          );
        }
      }
    }

    let newPhone = currentPhone;
    let phoneChanged = false;
    if (data.phone !== undefined) {
      newPhone = String(data.phone || '').trim();
      if (!newPhone) {
        return NextResponse.json({ success: false, error: 'Phone number cannot be empty.' }, { status: 400 });
      }

      if (newPhone !== currentPhone) {
        const phoneCheck = await queryDb(
          'SELECT id FROM developers WHERE phone = $1 AND id != $2 LIMIT 1',
          [newPhone, authUser.id]
        );
        if (phoneCheck.rows.length > 0) {
          return NextResponse.json(
            { success: false, error: 'This phone number is already registered to another developer account.' },
            { status: 409 }
          );
        }
        phoneChanged = true;
      }
    }

    const contactChanged = (data.email !== undefined && newEmail !== currentEmail) || phoneChanged;
    if (contactChanged) {
      const otpCode = String(data.otpCode || '').trim();
      if (!otpCode) {
        const ip = getClientIp(request);
        const rateCheck = await checkOtpDispatchRateLimit({
          identifier: currentDev.email,
          phone: currentDev.phone,
          email: currentDev.email,
          ip,
        });

        if (!rateCheck.isAllowed) {
          return NextResponse.json(
            { success: false, error: rateCheck.error, rateLimited: true, remainingMinutes: rateCheck.remainingMinutes },
            { status: 429 }
          );
        }

        const generatedOtp = generateSecureOtp(6);
        await queryDb('DELETE FROM contact_update_verifications WHERE user_type = $1 AND user_id = $2', ['developer', authUser.id]);
        await queryDb(
          `INSERT INTO contact_update_verifications (user_type, user_id, new_email, new_phone, otp_code, expires_at)
           VALUES ('developer', $1, $2, $3, $4, CURRENT_TIMESTAMP + INTERVAL '10 minutes')`,
          [authUser.id, newEmail, newPhone, generatedOtp]
        );

        try {
          await sendEmail({
            to: currentDev.email,
            toName: currentDev.name,
            subject: `Security Verification Code: ${generatedOtp} - ${SITE_NAME}`,
            html: buildStyledEmail({
              title: 'Verify Profile Contact Update',
              subtitle: 'A request was made to update your developer account email or phone number.',
              recipientName: currentDev.name,
              code: generatedOtp,
              codeLabel: 'Security Verification Code',
              bodyParagraphs: [
                `You requested to change your contact details on ${SITE_NAME}.`,
                newEmail !== currentEmail ? `Requested Email: ${newEmail}` : null,
                phoneChanged ? `Requested Phone: ${newPhone}` : null,
                'Please enter this 6-digit verification code to confirm and apply your changes.',
                'This code will expire in 10 minutes. If you did not initiate this change, please secure your account immediately.',
              ].filter(Boolean),
            }),
          });

          await recordOtpDispatch({
            identifier: currentDev.email,
            phone: currentDev.phone,
            email: currentDev.email,
            channel: 'email',
            purpose: 'contact_update',
            ip,
          });
        } catch (mailErr) {
          console.error('Failed to dispatch developer OTP email:', mailErr);
          return NextResponse.json(
            { success: false, error: `Failed to dispatch security verification email: ${mailErr.message || 'Mail service error.'}` },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: false,
          otpRequired: true,
          message: `A 6-digit verification code has been sent to your registered email (${currentDev.email}) to confirm the change of your contact details.`,
        });
      }

      const verifyRes = await queryDb(
        `SELECT id, new_email, new_phone FROM contact_update_verifications
         WHERE user_type = 'developer' AND user_id = $1 AND otp_code = $2 AND expires_at > CURRENT_TIMESTAMP
         ORDER BY id DESC LIMIT 1`,
        [authUser.id, otpCode]
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

    const newBio = data.bio !== undefined ? data.bio.trim() : currentDev.bio;
    const newGithub = data.github_profile !== undefined ? data.github_profile.trim() : currentDev.github_profile;
    const newLinkedin = data.linkedin_profile !== undefined ? data.linkedin_profile.trim() : currentDev.linkedin_profile;
    const newTwoFactor = data.two_factor_enabled !== undefined ? Boolean(data.two_factor_enabled) : Boolean(currentDev.two_factor_enabled);

    let newPasswordHash = currentDev.password;
    if (data.newPassword && data.newPassword.trim()) {
      const currentPassword = data.currentPassword?.trim();
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, error: 'Current password is required to set a new password.' },
          { status: 400 }
        );
      }

      const isMatch = await comparePassword(currentPassword, currentDev.password);
      if (!isMatch) {
        return NextResponse.json(
          { success: false, error: 'Current password is incorrect. Please try again.' },
          { status: 400 }
        );
      }

      if (data.newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: 'New password must be at least 6 characters long.' },
          { status: 400 }
        );
      }

      newPasswordHash = await hashPassword(data.newPassword.trim());
    }

    const updateRes = await queryDb(
      `UPDATE developers
       SET name = $1,
           email = $2,
           phone = $3,
           bio = $4,
           github_profile = $5,
           linkedin_profile = $6,
           password = $7,
           two_factor_enabled = $8,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING id, name, email, phone, bio, github_profile, linkedin_profile, is_active, email_verified, COALESCE(two_factor_enabled, false) AS two_factor_enabled, last_login_at, created_at, updated_at`,
      [newName, newEmail, newPhone, newBio, newGithub, newLinkedin, newPasswordHash, newTwoFactor, authUser.id]
    );

    const updatedDev = {
      ...updateRes.rows[0],
      role: currentDev.role_slug || 'developer',
      role_name: currentDev.role_name || 'Developer',
    };

    const response = NextResponse.json({
      success: true,
      message: 'Developer profile updated successfully.',
      developer: {
        ...updatedDev,
        is_verified: Boolean(updatedDev.email_verified),
        isVerified: Boolean(updatedDev.email_verified),
        two_factor_enabled: Boolean(updatedDev.two_factor_enabled),
        permissions: authUser.permissions || [],
        isAdmin: Boolean(authUser.isAdmin),
      },
      user: {
        id: updatedDev.id,
        name: updatedDev.name,
        email: updatedDev.email,
        phone: updatedDev.phone,
        bio: updatedDev.bio,
        githubProfile: updatedDev.github_profile,
        linkedinProfile: updatedDev.linkedin_profile,
        role: updatedDev.role,
        roleName: updatedDev.role_name,
        permissions: authUser.permissions || [],
        isAdmin: Boolean(authUser.isAdmin),
        isActive: updatedDev.is_active !== false,
        isVerified: Boolean(updatedDev.email_verified),
        two_factor_enabled: Boolean(updatedDev.two_factor_enabled),
      },
    });

    if (emailChanged) {
      try {
        const refreshedToken = generateToken(
          { id: updatedDev.id, email: newEmail },
          '7d'
        );
        await queryDb('UPDATE developer_login_sessions SET token = $1 WHERE developer_id = $2 AND is_active = TRUE', [
          refreshedToken,
          updatedDev.id,
        ]).catch(() => {});

        await setDeveloperSessionCookie(response, refreshedToken);
      } catch (cookieErr) {
        console.warn('Could not refresh session cookie after email change:', cookieErr);
      }
    }

    return response;
  } catch (error) {
    console.error('Error updating developer profile:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const revokeOthers = searchParams.get('revokeOthers') === 'true';

    if (revokeOthers) {
      const currentToken = authUser.token || '';
      await queryDb(
        `UPDATE developer_login_sessions
         SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE developer_id = $1 AND token != $2`,
        [authUser.id, currentToken]
      );
      return NextResponse.json({ success: true, message: 'All other active sessions revoked successfully.' });
    }

    if (sessionId) {
      await queryDb(
        `UPDATE developer_login_sessions
         SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE developer_id = $1 AND id = $2`,
        [authUser.id, sessionId]
      );
      return NextResponse.json({ success: true, message: 'Session revoked successfully.' });
    }

    return NextResponse.json({ success: false, error: 'Session ID or action required.' }, { status: 400 });
  } catch (error) {
    console.error('Error revoking session:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  return PUT(request);
}

export async function POST(request) {
  return PUT(request);
}
