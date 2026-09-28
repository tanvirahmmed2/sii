import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendEmail } from '@/lib/brevo';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({
        success: false,
        message: 'Email address is required.',
        error: 'Missing Email',
        paylod: null,
      }, { status: 400 });
    }

    const result = await query('SELECT * FROM staffs WHERE email = $1 AND is_active = TRUE', [email.trim()]);
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Staff account not found.',
        error: 'Not Found',
        paylod: null,
      }, { status: 404 });
    }

    const staff = result.rows[0];

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await query(
      `UPDATE staffs 
       SET two_factor_code = $1, two_factor_expires = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [otpCode, expiresAt, staff.id]
    );

    try {
      await sendEmail({
        to: staff.email,
        toName: staff.name,
        subject: 'Staff Portal - Resent 2FA Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #0f172a; margin: 0;">Staff Portal Two-Factor Security</h2>
            </div>
            <p style="color: #334155; font-size: 15px;">Hello <strong>${staff.name}</strong>,</p>
            <p style="color: #334155; font-size: 15px;">Your new 6-digit verification code is:</p>
            <div style="background-color: #f1f5f9; padding: 18px; text-align: center; border-radius: 10px; margin: 24px 0;">
              <span style="font-size: 34px; font-weight: bold; letter-spacing: 6px; color: #0284c7;">${otpCode}</span>
            </div>
            <p style="color: #ef4444; font-size: 13px;">This code will expire in 10 minutes.</p>
          </div>
        `
      });
    } catch (emailErr) {
      console.error('Error resending staff 2FA email:', emailErr);
      return NextResponse.json({
        success: false,
        message: 'Failed to send verification email.',
        error: 'Email Error',
        paylod: null,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'A new 2FA verification code has been sent to your email.',
      paylod: { email: staff.email },
    }, { status: 200 });

  } catch (error) {
    console.error('Error in staff resend-2fa:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to resend 2FA code.',
      error: 'Internal Server Error',
      paylod: null,
    }, { status: 500 });
  }
}
