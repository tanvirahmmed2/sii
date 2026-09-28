import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { sendEmail } from '@/lib/brevo';
import crypto from 'crypto';

// POST: Request recovery token
export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email address is required.' }, { status: 400 });
    }

    const result = await query('SELECT * FROM staffs WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (result.rows.length === 0) {
      // Return 200 for security reasons (avoid enumerating emails)
      return NextResponse.json({
        success: true,
        message: 'If a staff account with that email exists, we have sent a password reset link.'
      }, { status: 200 });
    }

    const staff = result.rows[0];

    const recoveryToken = crypto.randomBytes(32).toString('hex');
    const recoveryExpires = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    await query(`
      UPDATE staffs
      SET recovery_token = $1, recovery_token_expires = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [recoveryToken, recoveryExpires, staff.id]);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const recoveryUrl = `${baseUrl}/auth/access/staff/recovery?token=${recoveryToken}`;

    try {
      await sendEmail({
        to: staff.email,
        toName: staff.name,
        subject: 'Reset Your Staff Account Password',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
            <div style="background: #0284c7; padding: 40px 32px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0;">Password Reset Request</h1>
            </div>
            <div style="padding: 32px;">
              <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 8px;">Hi <strong>${staff.name}</strong>,</p>
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                You requested to reset your password. Click the button below to choose a new password. 
                This password reset link is valid for <strong>2 hours</strong>.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${recoveryUrl}" style="display: inline-block; background: #0284c7; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">
                  Reset My Password
                </a>
              </div>
              <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin-top: 24px;">
                If the button doesn't work, copy and paste this link into your browser:<br/>
                <a href="${recoveryUrl}" style="color: #0284c7; word-break: break-all;">${recoveryUrl}</a>
              </p>
            </div>
          </div>
        `
      });
    } catch (emailErr) {
      console.error('Failed to send recovery email (non-fatal):', emailErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'If a staff account with that email exists, we have sent a password reset link.'
    }, { status: 200 });
  } catch (error) {
    console.error('Error in staff recovery request:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

// PUT: Reset password using recovery token
export async function PUT(request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ success: false, error: 'Token and new password are required.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const staffRes = await query(
      `SELECT id, recovery_token_expires FROM staffs WHERE recovery_token = $1`,
      [token]
    );

    if (staffRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid or expired recovery link.' }, { status: 400 });
    }

    const staff = staffRes.rows[0];

    if (new Date() > new Date(staff.recovery_token_expires)) {
      return NextResponse.json({ success: false, error: 'This recovery link has expired.' }, { status: 410 });
    }

    const hashedPass = await hashPassword(password);

    await query(`
      UPDATE staffs
      SET password_hash = $1, recovery_token = NULL, recovery_token_expires = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [hashedPass, staff.id]);

    return NextResponse.json({
      success: true,
      message: 'Your password has been reset successfully. You can now log in.'
    }, { status: 200 });
  } catch (error) {
    console.error('Error resetting staff password:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
