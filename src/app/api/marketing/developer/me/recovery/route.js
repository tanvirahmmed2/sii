import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hashPassword } from 'src/lib/middleware/developer';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo';
import { generateToken } from 'src/lib/utils/random';

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
         WHERE LOWER(email) = $1 AND recovery_token = $2 AND recovery_token_expires > CURRENT_TIMESTAMP 
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
         SET password = $1, 
             recovery_token = NULL, 
             recovery_token_expires = NULL,
             verification_token = NULL,
             verification_token_expires = NULL,
             two_factor_code = NULL,
             two_factor_expires = NULL,
             email_verified = TRUE,
             is_active = TRUE,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [hashedPassword, adminRes.rows[0].id]
      );

      // Invalidate existing sessions for security
      try {
        await queryDb('UPDATE developer_login_sessions SET is_active = FALSE WHERE developer_id = $1', [adminRes.rows[0].id]);
      } catch (_) {}

      return NextResponse.json({
        success: true,
        message: 'Password reset successfully. You may now sign in.',
      });
    }

    // Step 1: Request Recovery Token (pure alphanumeric letters and numbers, e.g. 123D1)
    const generatedToken = generateToken(8);

    const dbAdmin = await queryDb('SELECT * FROM developers WHERE LOWER(email) = $1 LIMIT 1', [cleanEmail]);
    if (dbAdmin.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No developer account found with this email address.' },
        { status: 404 }
      );
    }

    await queryDb(
      `UPDATE developers 
       SET recovery_token = $1, recovery_token_expires = CURRENT_TIMESTAMP + INTERVAL '1 hour', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [generatedToken, dbAdmin.rows[0].id]
    );

    // Attempt to send email via Brevo using STYLE.md format
    try {
      const emailHtml = buildStyledEmail({
        title: 'Developer Security Recovery Token',
        subtitle: 'Password reset authorization',
        recipientName: dbAdmin.rows[0].name || 'Developer',
        bodyParagraphs: [
          'You requested a security recovery token for your administrator account.',
          'Please enter the token below on the password recovery page to set your new password.'
        ],
        code: generatedToken,
        codeLabel: 'Recovery Token',
        footerNote: 'This token is valid for 60 minutes. Keep it confidential and do not share it with anyone.'
      });

      await sendEmail({
        to: cleanEmail,
        subject: 'Developer Security Recovery Token',
        html: emailHtml,
        text: `Your security recovery token is: ${generatedToken}. Valid for 60 minutes.`,
      });
    } catch (mailErr) {
      console.warn('Brevo email notice:', mailErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Recovery token has been sent to your email.',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error processing recovery request.' },
      { status: 500 }
    );
  }
}
