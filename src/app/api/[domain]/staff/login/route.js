import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { queryDb } from 'src/lib/database/db';
import { comparePassword, signJWT } from 'src/lib/middleware/developer';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { createStaffSession, STAFF_COOKIE_NAME } from 'src/lib/middleware/staff';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo';
import { recordLoginLog } from 'src/lib/database/logger';
import { generateToken } from 'src/lib/utils/random';

export async function POST(request, context) {
  try {
    const resolvedParams = await context?.params;
    const website = await resolveWebsiteFromRequest(request, { params: resolvedParams });

    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Campus portal website not found.' },
        { status: 404 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    // Direct lookup in website_staffs scoped to website.id
    const result = await queryDb(
      `SELECT * FROM website_staffs 
       WHERE website_id = $1 AND LOWER(email) = LOWER($2) 
       LIMIT 1`,
      [website.id, email.trim()]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const staff = result.rows[0];

    if (!staff.is_active || !staff.is_registered) {
      return NextResponse.json(
        { success: false, error: 'Staff account is inactive or not registered yet. Contact administration.' },
        { status: 403 }
      );
    }

    const isPasswordValid = await comparePassword(password, staff.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Check 2FA setting
    const is2FAEnabled = Boolean(staff.is_two_factor_enabled);

    if (!is2FAEnabled) {
      // Direct login: record log and create session
      try {
        await recordLoginLog({
          userType: 'staff',
          name: staff.name,
          email: staff.email,
          req: request,
          status: 'success',
        });
      } catch {}

      const token = signJWT({
        id: staff.id,
        website_id: website.id,
        email: staff.email,
        name: staff.name,
      });

      // Insert session in staff_sessions
      await createStaffSession({
        websiteId: website.id,
        staffId: staff.id,
        token,
        request,
      });

      // Set auth cookie
      const cookieStore = await cookies();
      cookieStore.set(STAFF_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
        sameSite: 'lax',
      });

      // Fetch active module permissions (scoped to package-allowed website modules)
      const permsRes = await queryDb(
        `SELECT wmp.website_module_id, wmp.can_view, wmp.can_create, wmp.can_edit, wmp.can_delete,
                wm.slug AS module_slug, wm.name AS module_name, wm.icon AS module_icon
         FROM website_modules_permissions wmp
         JOIN website_modules wm ON wm.id = wmp.website_module_id
         JOIN websites w ON w.id = wmp.website_id
         LEFT JOIN subscriptions s ON (s.id = w.subscription_id OR s.website_id = w.id)
         WHERE wmp.staff_id = $1 AND wmp.website_id = $2 AND wm.is_active = TRUE
           AND (
             EXISTS (
               SELECT 1 FROM package_website_modules pwm 
               WHERE pwm.package_id = s.package_id AND pwm.website_module_id = wm.id
             )
             OR s.package_id IS NULL
           )`,
        [staff.id, website.id]
      ).catch(() => ({ rows: [] }));

      const permissions = {};
      const allowedModules = [];
      for (const p of permsRes.rows) {
        permissions[p.module_slug] = p;
        if (p.can_view) allowedModules.push(p.module_slug);
      }

      return NextResponse.json(
        {
          success: true,
          requires2FA: false,
          message: 'Logged in successfully!',
          paylod: {
            requires2FA: false,
            staff: {
              id: staff.id,
              name: staff.name,
              email: staff.email,
              number: staff.number,
              websiteId: website.id,
              permissions,
              allowedModules,
            },
          },
        },
        { status: 200 }
      );
    }

    // 2FA Enabled -> Generate OTP
    const otpCode = generateToken(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await queryDb(
      `UPDATE website_staffs 
       SET two_factor_code = $1, two_factor_expires = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [otpCode, expiresAt, staff.id]
    );

    try {
      await sendEmail({
        to: staff.email,
        toName: staff.name,
        subject: `${website.name} - Staff Portal 2FA Verification Code`,
        html: buildStyledEmail({
          title: `${website.name} Staff Portal`,
          subtitle: 'Two-Factor Authentication',
          recipientName: staff.name,
          bodyParagraphs: [
            'Your verification code for logging in to the Staff Portal is ready. Enter this code to complete sign-in:',
          ],
          code: otpCode,
          codeLabel: 'Security Code',
          footerNote: 'This code will expire in 10 minutes and can only be used once. If you did not request this, please secure your account immediately.',
        }),
      });
    } catch (emailErr) {
      console.error('Failed to send staff 2FA email:', emailErr);
      return NextResponse.json(
        { success: false, error: 'Failed to send verification code email.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        requires2FA: true,
        message: 'Two-factor verification code sent to your email.',
        paylod: { requires2FA: true, email: staff.email },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error logging in staff:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
