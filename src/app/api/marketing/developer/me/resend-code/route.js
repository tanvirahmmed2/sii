import { NextResponse } from 'next/server';
import { generateRandomHex, generateRandomCode } from 'src/lib/utils/random';
import { queryDb } from 'src/lib/database/db';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo';
import { SITE_NAME, getBaseUrl } from 'src/lib/database/secret';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email address is required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    const adminRes = await queryDb(
      `SELECT id, name, email, is_active, email_verified 
       FROM developers 
       WHERE LOWER(email) = $1 LIMIT 1`,
      [cleanEmail]
    );

    if (adminRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No developer account found for this email address.' },
        { status: 404 }
      );
    }

    const admin = adminRes.rows[0];

    if (!admin.is_active) {
      return NextResponse.json(
        { success: false, error: 'This developer account has been deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    if (admin.email_verified) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: 'Your developer account is already verified! You can sign in immediately.',
      });
    }

    const newToken = generateRandomHex(32);
    const newCode = generateRandomCode(100000, 999999);

    await queryDb(
      `UPDATE developers 
       SET verification_token = $1,
           verification_token_expires = CURRENT_TIMESTAMP + INTERVAL '24 hours',
           two_factor_code = $2,
           two_factor_expires = CURRENT_TIMESTAMP + INTERVAL '24 hours',
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [newToken, newCode, admin.id]
    );

    const baseUrl = getBaseUrl(request);
    const verifyUrl = `${baseUrl}/developer-auth/verify?token=${newToken}&email=${encodeURIComponent(cleanEmail)}`;

    // Send link via Brevo mailer
    try {
      const emailHtml = buildStyledEmail({
        title: `${SITE_NAME} Developer Portal`,
        subtitle: 'Account Verification Link',
        recipientName: admin.name || 'Developer',
        bodyParagraphs: [
          'You requested a new verification link for your platform administrator account.',
          'Click the link below to verify your email and activate your account.'
        ],
        actionText: 'Verify & Activate Account',
        actionUrl: verifyUrl,
        footerNote: 'This link will expire in 24 hours. Do not share it with anyone.'
      });

      await sendEmail({
        to: cleanEmail,
        subject: `Developer Verification Link - ${SITE_NAME}`,
        html: emailHtml,
        text: `Hello ${admin.name},\n\nYour new developer verification link is:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
      });
    } catch (mailErr) {
      console.warn('Brevo email sending notice during resend:', mailErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'A new verification activation link has been dispatched to your email.',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to resend verification link.' },
      { status: 500 }
    );
  }
}
