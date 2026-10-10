import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import {
  comparePassword,
  generateToken,
  createOfficerSession,
  setOfficerSessionCookie,
  ensureOfficerSchema,
} from 'src/lib/middleware/officer.js';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo.js';

export async function POST(request, context) {
  try {
    await ensureOfficerSchema().catch(() => {});
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Officer email address and password are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Look up officer under this website
    const officerRes = await queryDb(
      `SELECT wo.id, wo.website_id, wo.name, wo.email, wo.phone, wo.department,
              wo.designation, wo.password, wo.is_active, wo.is_registered,
              wo.is_two_factor_enabled, wo.photo_url, wo.username
       FROM website_officers wo
       WHERE wo.website_id = $1 AND LOWER(wo.email) = $2
       LIMIT 1`,
      [website.id, cleanEmail]
    );

    if (officerRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const officer = officerRes.rows[0];

    if (!officer.is_active) {
      return NextResponse.json(
        { success: false, error: 'Your officer account is currently deactivated. Please contact campus administration.' },
        { status: 403 }
      );
    }

    const isMatch = await comparePassword(password, officer.password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Two-Factor Authentication Check
    if (officer.is_two_factor_enabled) {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

      await queryDb(
        `UPDATE website_officers
         SET two_factor_code = $1, two_factor_expires = CURRENT_TIMESTAMP + INTERVAL '10 minutes'
         WHERE id = $2`,
        [otpCode, officer.id]
      );

      try {
        const html = buildStyledEmail({
          title: 'Officer Security Verification',
          subtitle: `${website.name} — Administrative Portal`,
          recipientName: officer.name,
          bodyParagraphs: [
            'A sign-in request to your Officer account was detected. Use the verification passcode below to complete your authentication.',
            'This security code will expire in 10 minutes. If you did not initiate this request, please contact your systems administrator immediately.',
          ],
          code: otpCode,
          codeLabel: 'Two-Factor Authentication Passcode',
        });

        await sendEmail({
          to: officer.email,
          toName: officer.name,
          subject: `${website.name} - Officer Portal Sign-In Verification Code`,
          html,
          websiteId: website.id,
        });
      } catch (mailErr) {
        console.warn('Failed to dispatch 2FA email to officer:', mailErr.message);
      }

      return NextResponse.json({
        success: true,
        requires2FA: true,
        message: 'Two-factor authentication code sent to your registered email address.',
      });
    }

    // Generate JWT token
    const token = generateToken({
      id: officer.id,
      email: officer.email,
      websiteId: website.id,
      name: officer.name,
      role: 'officer',
    });

    // Create active session in website_officer_login_sessions
    await createOfficerSession({
      websiteId: website.id,
      officerId: officer.id,
      token,
      request,
    });

    const officerData = {
      id: officer.id,
      name: officer.name,
      email: officer.email,
      phone: officer.phone,
      department: officer.department,
      designation: officer.designation,
      isRegistered: Boolean(officer.is_registered),
      isActive: Boolean(officer.is_active),
      isTwoFactorEnabled: Boolean(officer.is_two_factor_enabled),
      photoUrl: officer.photo_url,
    };

    const response = NextResponse.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      officer: officerData,
      payload: { officer: officerData },
      paylod: { officer: officerData },
    });

    await setOfficerSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error('Error during officer login:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error during officer sign-in.' },
      { status: 500 }
    );
  }
}
