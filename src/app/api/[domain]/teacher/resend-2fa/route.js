import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo.js';

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
        { success: false, error: 'Teacher email is required.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const teacherRes = await queryDb(
      `SELECT wt.id, wt.name, wt.email, wt.is_active, wt.is_registered
       FROM website_teachers wt
       WHERE wt.website_id = $1 AND LOWER(wt.email) = $2
       LIMIT 1`,
      [website.id, cleanEmail]
    );

    if (teacherRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Teacher account not found.' },
        { status: 404 }
      );
    }

    const teacher = teacherRes.rows[0];

    if (!teacher.is_active || !teacher.is_registered) {
      return NextResponse.json(
        { success: false, error: 'Account inactive or pending verification.' },
        { status: 403 }
      );
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    await queryDb(
      `UPDATE website_teachers
       SET two_factor_code = $1, two_factor_expires = CURRENT_TIMESTAMP + INTERVAL '10 minutes'
       WHERE id = $2`,
      [otpCode, teacher.id]
    );

    try {
      const html = buildStyledEmail({
        title: 'New Security Code',
        subtitle: `${website.name} — Teacher Operations Portal`,
        recipientName: teacher.name,
        bodyParagraphs: [
          'A new two-factor authentication code was requested for your teacher account.',
          'Please use the code below to complete sign-in. This code is valid for 10 minutes.',
        ],
        code: otpCode,
        codeLabel: 'Security Passcode',
      });

      await sendEmail({
        to: teacher.email,
        toName: teacher.name,
        subject: `${website.name} - New Teacher Verification Passcode`,
        html,
        websiteId: website.id,
      });
    } catch (mailErr) {
      console.warn('Failed to resend 2FA email:', mailErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'New verification code dispatched to your email.',
    });
  } catch (error) {
    console.error('Error resending teacher 2FA:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error dispatching code.' },
      { status: 500 }
    );
  }
}
