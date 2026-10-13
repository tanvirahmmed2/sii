import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

/**
 * POST /api/[domain]/admissions/verify-otp
 * Verifies the 6-digit email OTP for admission application.
 */
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { email, code } = body;

    if (!email || !email.trim()) {
      return NextResponse.json({ success: false, error: 'Email address is required.' }, { status: 400 });
    }
    if (!code || !code.trim()) {
      return NextResponse.json({ success: false, error: '6-digit verification code is required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    // Look up most recent unexpired OTP for this email and purpose
    const res = await queryDb(`
      SELECT id, otp_code, expires_at, is_verified
      FROM website_email_verifications
      WHERE website_id = $1 AND email = $2 AND purpose = 'admission'
      ORDER BY id DESC
      LIMIT 1
    `, [website.id, cleanEmail]);

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'No verification code was requested for this email.' }, { status: 404 });
    }

    const record = res.rows[0];

    if (new Date() > new Date(record.expires_at)) {
      return NextResponse.json({ success: false, error: 'Verification code has expired. Please request a new code.' }, { status: 410 });
    }

    if (record.otp_code !== cleanCode) {
      return NextResponse.json({ success: false, error: 'Invalid verification code. Please check your email and try again.' }, { status: 400 });
    }

    // Mark as verified
    await queryDb(`
      UPDATE website_email_verifications
      SET is_verified = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [record.id]);

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! You can now proceed to complete the application form.',
      email: cleanEmail
    });
  } catch (error) {
    console.error('Error in verify-otp:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
