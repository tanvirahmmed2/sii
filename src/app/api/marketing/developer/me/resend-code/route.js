import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { sendEmail } from '@/lib/db/mailer';
import { SITE_NAME } from '@/lib/db/secret';

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
      `SELECT id, name, email, is_verified 
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

    if (admin.is_verified) {
      return NextResponse.json(
        { success: false, error: 'This account is already verified. You can sign in directly.' },
        { status: 400 }
      );
    }

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();

    await queryDb(
      `UPDATE developers 
       SET verification_code = $1, verification_expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours' 
       WHERE id = $2`,
      [newCode, admin.id]
    );

    // Send code via Brevo mailer
    try {
      await sendEmail({
        to: cleanEmail,
        subject: `New Admin Verification Code - ${SITE_NAME}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; background: #0f172a; color: #f8fafc; border-radius: 20px; border: 1px solid #1e293b;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #6366f1; font-size: 24px; margin: 0 0 8px 0;">${SITE_NAME} Admin Portal</h1>
              <p style="color: #94a3b8; font-size: 14px; margin: 0;">New Security Verification Code</p>
            </div>
            <div style="background: #1e293b; padding: 24px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #334155;">
              <p style="margin-top: 0; color: #cbd5e1; font-size: 14px;">Hello <strong>${admin.name}</strong>,</p>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">You requested a new verification code for your administrator account. Use the code below to complete your activation:</p>
              <div style="text-align: center; padding: 18px; margin: 20px 0; background: #0b0f19; border-radius: 10px; border: 1px dashed #6366f1;">
                <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; font-family: monospace;">${newCode}</span>
              </div>
              <p style="margin-bottom: 0; font-size: 12px; color: #64748b; text-align: center;">This code will expire in 24 hours. Do not share it with anyone.</p>
            </div>
          </div>
        `,
        text: `Hello ${admin.name},\n\nYour new admin verification code is: ${newCode}\n\nThis code expires in 24 hours.`,
      });
    } catch (mailErr) {
      console.warn('Brevo email sending notice during resend:', mailErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'A new 6-digit verification code has been dispatched to your email.',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to resend code.' },
      { status: 500 }
    );
  }
}
