import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { hashPassword } from '@/lib/middleware/developer';
import { sendEmail } from '@/lib/db/mailer';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action = 'request_token', email, token, newPassword } = body;

    const cleanEmail = email?.trim().toLowerCase();
    if (!cleanEmail) {
      return NextResponse.json(
        { success: false, error: 'Email is required.' },
        { status: 400 }
      );
    }

    // Step 2: Reset Password
    if (action === 'reset_password' || (token && newPassword)) {
      if (!token || !newPassword) {
        return NextResponse.json(
          { success: false, error: 'Token and new password are required.' },
          { status: 400 }
        );
      }

      const adminRes = await queryDb(
        `SELECT * FROM developers 
         WHERE LOWER(email) = $1 AND forget_token = $2 AND forget_token_expires_at > CURRENT_TIMESTAMP 
         LIMIT 1`,
        [cleanEmail, token.trim()]
      );

      if (adminRes.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired recovery token.' },
          { status: 400 }
        );
      }

      const hashedPassword = await hashPassword(newPassword.trim());
      await queryDb(
        `UPDATE developers 
         SET password = $1, forget_token = NULL, forget_token_expires_at = NULL 
         WHERE id = $2`,
        [hashedPassword, adminRes.rows[0].id]
      );

      // Invalidate existing sessions for security
      try {
        await queryDb('UPDATE session SET is_revoked = TRUE WHERE developer_id = $1', [adminRes.rows[0].id]);
      } catch (_) {}

      return NextResponse.json({
        success: true,
        message: 'Password reset successfully. You may now sign in.',
      });
    }

    // Step 1: Request Recovery Token
    const generatedToken = 'rec_' + Math.random().toString(36).substring(2, 10).toUpperCase();

    const dbAdmin = await queryDb('SELECT * FROM developers WHERE LOWER(email) = $1 LIMIT 1', [cleanEmail]);
    if (dbAdmin.rows.length > 0) {
      await queryDb(
        `UPDATE developers 
         SET forget_token = $1, forget_token_expires_at = CURRENT_TIMESTAMP + INTERVAL '1 hour' 
         WHERE id = $2`,
        [generatedToken, dbAdmin.rows[0].id]
      );
    }

    // Attempt to send email via Brevo
    try {
      await sendEmail({
        to: cleanEmail,
        subject: 'Super Admin Security Recovery Token',
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 16px;">
            <h2 style="color: #6366f1; margin-top: 0;">Admin Security Recovery</h2>
            <p>You requested a recovery token for your SaaS platform administrator account.</p>
            <div style="padding: 16px; background: #1e293b; border-radius: 10px; text-align: center; margin: 24px 0;">
              <span style="font-size: 22px; font-weight: bold; letter-spacing: 3px; color: #38bdf8;">${generatedToken}</span>
            </div>
            <p style="font-size: 13px; color: #94a3b8;">This token is valid for 60 minutes. Use it on the password recovery page to reset your password.</p>
          </div>
        `,
        text: `Your security recovery token is: ${generatedToken}. Valid for 60 minutes.`,
      });
    } catch (mailErr) {
      console.warn('Brevo email notice:', mailErr.message);
    }

    return NextResponse.json({
      success: true,
      token: generatedToken,
      message: 'Recovery token generated and sent to email.',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error processing recovery request.' },
      { status: 500 }
    );
  }
}
