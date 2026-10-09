import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo';

export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Staff email address is required.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const staffRes = await queryDb(
      `SELECT id, name, email, is_active, is_two_factor_enabled
       FROM website_staffs
       WHERE website_id = $1 AND LOWER(email) = $2
       LIMIT 1`,
      [website.id, cleanEmail]
    );

    if (staffRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Staff account not found.' },
        { status: 404 }
      );
    }

    const staff = staffRes.rows[0];

    if (!staff.is_active) {
      return NextResponse.json(
        { success: false, error: 'Staff account is deactivated.' },
        { status: 403 }
      );
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    await queryDb(
      `UPDATE website_staffs
       SET two_factor_code = $1, two_factor_expires = CURRENT_TIMESTAMP + INTERVAL '10 minutes'
       WHERE id = $2`,
      [otpCode, staff.id]
    );

    try {
      const html = buildStyledEmail({
        title: 'Staff Security Verification',
        subtitle: `${website.name} — Staff Operations Portal`,
        recipientName: staff.name,
        bodyParagraphs: [
          'A new two-factor security code was requested for your staff portal sign-in.',
          'Please enter the 6-digit code below to authenticate. This code is valid for 10 minutes.',
        ],
        code: otpCode,
        codeLabel: 'New Security Code',
      });

      await sendEmail({
        to: staff.email,
        toName: staff.name,
        subject: `${website.name} - Resent Staff Security Code`,
        html,
      });
    } catch (mailErr) {
      console.warn('Failed to resend 2FA email to staff:', mailErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'A new security code has been sent to your email.',
    });
  } catch (error) {
    console.error('Error in resend-2fa:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error while resending code.' },
      { status: 500 }
    );
  }
}
