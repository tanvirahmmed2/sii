import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { sendWebsiteEmail } from 'src/lib/database/websiteBrevo.js';
import { buildStyledEmail } from 'src/lib/database/brevo.js';

/**
 * POST /api/[domain]/admissions/send-otp
 * Sends a cryptographically secure 6-digit email OTP for applicant email verification.
 */
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { email } = body;

    if (!email || !email.trim() || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'A valid candidate email address is required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Rate-limiting check: enforce a 60-second cooldown per email
    const recentOtpRes = await queryDb(`
      SELECT created_at FROM website_email_verifications
      WHERE website_id = $1 AND email = $2 AND purpose = 'admission'
        AND created_at > (CURRENT_TIMESTAMP - INTERVAL '60 seconds')
      LIMIT 1
    `, [website.id, cleanEmail]);

    if (recentOtpRes.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Please wait at least 60 seconds before requesting another verification code.'
      }, { status: 429 });
    }

    // 2. Invalidate any previous unverified OTPs for this email to prevent reuse
    await queryDb(`
      DELETE FROM website_email_verifications
      WHERE website_id = $1 AND email = $2 AND purpose = 'admission' AND is_verified = FALSE
    `, [website.id, cleanEmail]);

    // 3. Cryptographically secure 6-digit numeric OTP
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins validity

    // 4. Store in website_email_verifications
    await queryDb(`
      INSERT INTO website_email_verifications (website_id, email, purpose, otp_code, expires_at)
      VALUES ($1, $2, 'admission', $3, $4)
    `, [website.id, cleanEmail, otpCode, expiresAt]);

    // 5. Send secure email via institution mailer
    const appName = website.name || 'Admissions Portal';
    const emailHtml = buildStyledEmail({
      title: 'Admission Email Verification',
      recipientName: 'Admission Applicant',
      paragraphs: [
        `You have initiated an admission application at <strong>${appName}</strong>.`,
        `Please use the following 6-digit one-time passcode to confirm your email address:`,
      ],
      code: otpCode,
      buttonText: 'Continue Application',
      footerNote: 'This security code is strictly confidential and expires in 15 minutes. If you did not request this code, no action is required.'
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

    // NEVER return OTP in response body
    return NextResponse.json({
      success: true,
      message: 'A 6-digit verification code has been dispatched to your email address. Please check your inbox and spam folder.',
      email: cleanEmail
    });
  } catch (error) {
    console.error('Error in send-otp:', error);
    return NextResponse.json({ success: false, error: 'Internal server error processing verification request.' }, { status: 500 });
  }
}

