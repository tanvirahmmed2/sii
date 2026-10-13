import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { sendWebsiteEmail } from 'src/lib/database/websiteBrevo.js';
import { buildStyledEmail } from 'src/lib/database/brevo.js';

/**
 * POST /api/[domain]/admissions/send-otp
 * Sends a 6-digit email OTP for applicant email verification before admission application.
 */
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { email } = body;

    if (!email || !email.trim()) {
      return NextResponse.json({ success: false, error: 'Valid candidate email address is required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Insert into website_email_verifications
    await queryDb(`
      INSERT INTO website_email_verifications (website_id, email, purpose, otp_code, expires_at)
      VALUES ($1, $2, 'admission', $3, $4)
    `, [website.id, cleanEmail, otpCode, expiresAt]);

    // Send email using website mailer
    const appName = website.name || 'Admissions Portal';
    const emailHtml = buildStyledEmail({
      title: 'Admission Email Verification',
      recipientName: 'Admission Applicant',
      paragraphs: [
        `You have initiated an admission application at <strong>${appName}</strong>.`,
        `Please use the following 6-digit verification code to confirm your email address:`,
      ],
      code: otpCode,
      buttonText: 'Continue Application',
      footerNote: 'This verification code is valid for 15 minutes. If you did not request this, please disregard this email.'
    });

    try {
      await sendWebsiteEmail(website.id, {
        to: cleanEmail,
        toName: 'Admission Applicant',
        subject: `[${appName}] Admission Application Verification Code`,
        html: emailHtml
      });
    } catch (emailErr) {
      console.warn('Error dispatching admission OTP email:', emailErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email address.',
      email: cleanEmail,
      debug_otp: process.env.NODE_ENV !== 'production' ? otpCode : undefined
    });
  } catch (error) {
    console.error('Error in send-otp:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
