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
        error: 'Missing parameters',
        paylod: null,
      }, { status: 400 });
    }

    // Find admin by email
    const result = await query('SELECT * FROM admins WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Admin account not found.',
        error: 'Account Not Found',
        paylod: null,
      }, { status: 404 });
    }

    const admin = result.rows[0];

    if (!admin.is_active) {
      return NextResponse.json({
        success: false,
        message: 'This administrative account is inactive.',
        error: 'Account Inactive',
        paylod: null,
      }, { status: 403 });
    }

    // Generate new 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes validity

    // Update code in DB
    await query(
      `UPDATE admins 
       SET two_factor_code = $1, two_factor_expires = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [otpCode, expiresAt, admin.id]
    );

    // Send email via Brevo
    try {
      await sendEmail({
        to: admin.email,
        toName: admin.name,
        subject: 'Admin Portal - New 2FA Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #0f172a; margin: 0;">Admin Portal Two-Factor Security</h2>
              <p style="color: #64748b; font-size: 14px; margin-top: 4px;">School Management System</p>
            </div>
            <p style="color: #334155; font-size: 15px; line-height: 1.5;">Hello <strong>${admin.name}</strong>,</p>
            <p style="color: #334155; font-size: 15px; line-height: 1.5;">You requested a new verification code. Your code for logging in to the Admin Portal is:</p>
            <div style="background-color: #f1f5f9; padding: 18px; text-align: center; border-radius: 10px; margin: 24px 0;">
              <span style="font-size: 34px; font-weight: bold; letter-spacing: 6px; color: #2563eb;">${otpCode}</span>
            </div>
            <p style="color: #ef4444; font-size: 13px; font-weight: 500;">This verification code will expire in 10 minutes and can only be used once.</p>
            <p style="color: #64748b; font-size: 13px; margin-top: 28px; border-top: 1px solid #e2e8f0; padding-top: 16px;">If you did not request this, please secure your account immediately or notify institutional IT support.</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Failed to resend 2FA OTP email:', emailError);
      return NextResponse.json({
        success: false,
        message: 'Failed to send 2FA email. Check email configuration.',
        error: 'Email Dispatch Error',
        paylod: null,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'A new 2FA verification code has been dispatched to your email.',
      paylod: { email: admin.email },
    }, { status: 200 });

  } catch (error) {
    console.error('Error resending 2FA OTP code:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to resend verification code. Internal server error.',
      error: 'Internal Server Error',
      paylod: null,
    }, { status: 500 });
  }
}
