import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from 'src/lib/database/db';
import { sendEmail } from 'src/lib/database/brevo';
import { SITE_NAME } from 'src/lib/database/secret';

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

    const newToken = crypto.randomBytes(32).toString('hex');
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();

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

    const origin =
      request?.headers?.get('origin') ||
      (request?.headers?.get('host')
        ? `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`
        : '') ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000';

    const verifyUrl = `${origin}/developer-auth/verify?token=${newToken}&email=${encodeURIComponent(cleanEmail)}`;

    // Send link via Brevo mailer
    try {
      await sendEmail({
        to: cleanEmail,
        subject: `New Developer Verification Link - ${SITE_NAME}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #0f172a; color: #f8fafc; border-radius: 20px; border: 1px solid #1e293b;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #6366f1; font-size: 24px; margin: 0 0 8px 0; font-weight: 800;">${SITE_NAME} Developer Portal</h1>
              <p style="color: #94a3b8; font-size: 14px; margin: 0;">New Account Verification Link</p>
            </div>
            <div style="background: #1e293b; padding: 28px; border-radius: 14px; margin-bottom: 24px; border: 1px solid #334155;">
              <p style="margin-top: 0; color: #cbd5e1; font-size: 15px;">Hello <strong>${admin.name}</strong>,</p>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
                You requested a new verification link for your administrator account. Click the button below to verify your email and activate your account:
              </p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${verifyUrl}" style="background: #4f46e5; color: #ffffff; padding: 14px 32px; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);">
                  Verify & Activate Account →
                </a>
              </div>
              <div style="background: #0b0f19; padding: 14px; border-radius: 8px; border: 1px dashed #475569; margin: 20px 0; word-break: break-all; font-size: 12px; color: #94a3b8;">
                <span style="color: #64748b; display: block; margin-bottom: 4px;">Direct Link:</span>
                <a href="${verifyUrl}" style="color: #38bdf8; text-decoration: underline;">${verifyUrl}</a>
              </div>
              <p style="margin-bottom: 0; font-size: 12px; color: #64748b; text-align: center;">
                This link will expire in 24 hours. Do not share it with anyone.
              </p>
            </div>
            <p style="font-size: 12px; color: #64748b; text-align: center; margin: 0;">
              If you did not request this, please contact security immediately.
            </p>
          </div>
        `,
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
