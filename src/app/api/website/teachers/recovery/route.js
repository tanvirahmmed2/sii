import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { sendEmail } from '@/lib/brevo';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, recovery_token, new_password } = body;

    if (!email) {
      const res_err_338 = { error: 'Email address is required.' };
      return NextResponse.json({
        success: false,
        message: res_err_338?.error || res_err_338?.message || 'An error occurred',
        error: res_err_338?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Find teacher by email
    const result = await query('SELECT * FROM teachers WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (result.rows.length === 0) {
      const res_err_833 = { error: 'Teacher account with this email not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_833?.error || res_err_833?.message || 'An error occurred',
        error: res_err_833?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const teacher = result.rows[0];

    // Verify account is active and registered
    if (!teacher.is_registered) {
      const res_err_1292 = { error: 'This account has not yet completed setup.' };
      return NextResponse.json({
        success: false,
        message: res_err_1292?.error || res_err_1292?.message || 'An error occurred',
        error: res_err_1292?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    if (!teacher.is_active) {
      const res_err_1666 = { error: 'This teacher account is inactive.' };
      return NextResponse.json({
        success: false,
        message: res_err_1666?.error || res_err_1666?.message || 'An error occurred',
        error: res_err_1666?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    // Step 1: Token Request (when recovery_token or new_password is not provided)
    if (!recovery_token || !new_password) {
      // Generate a 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

      // Save token and expiry to DB
      await query(
        `UPDATE teachers 
         SET recovery_token = $1, recovery_token_expires = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $3`,
        [verificationCode, expiresAt, teacher.id]
      );

      // Email the token
      try {
        await sendEmail({
          to: teacher.email,
          toName: teacher.name,
          subject: 'Teacher Portal - Password Recovery Token',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
              <h2 style="color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Teacher Password Recovery</h2>
              <p style="color: #475569; font-size: 16px; line-height: 1.5;">Hello ${teacher.name},</p>
              <p style="color: #475569; font-size: 16px; line-height: 1.5;">We received a request to reset your password for the Teacher Portal. Use the verification token below to reset your credentials:</p>
              <div style="background-color: #f1f5f9; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb;">${verificationCode}</span>
              </div>
              <p style="color: #ef4444; font-size: 14px; font-weight: 500;">Note: This token is valid for 15 minutes and can only be used once.</p>
              <p style="color: #64748b; font-size: 14px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">If you did not request this, you can safely ignore this email. Your password will remain unchanged.</p>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Failed to send recovery email via Brevo:', emailError);
        const res_err_4242 = { error: 'Failed to send recovery email. Please check your Brevo mail configurations.' };
      return NextResponse.json({
        success: false,
        message: res_err_4242?.error || res_err_4242?.message || 'An error occurred',
        error: res_err_4242?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
      }

      const res_data_3512 = {
        message: 'A 6-digit recovery token has been sent to your email.'
      };
      return NextResponse.json({
        success: true,
        message: res_data_3512?.message || 'Successfully fecthed data',
        paylod: res_data_3512
      }, { status: 200 });
    }

    // Step 2: Password Reset (when recovery_token and new_password are provided)
    if (!teacher.recovery_token) {
      const res_err_5138 = { error: 'No active recovery request found. Please request a new token.' };
      return NextResponse.json({
        success: false,
        message: res_err_5138?.error || res_err_5138?.message || 'An error occurred',
        error: res_err_5138?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    const tokenExpiry = new Date(teacher.recovery_token_expires);
    if (tokenExpiry < new Date()) {
      const res_err_5604 = { error: 'Recovery token has expired. Please request a new token.' };
      return NextResponse.json({
        success: false,
        message: res_err_5604?.error || res_err_5604?.message || 'An error occurred',
        error: res_err_5604?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    if (teacher.recovery_token.trim() !== recovery_token.trim()) {
      const res_err_6029 = { error: 'Invalid recovery token.' };
      return NextResponse.json({
        success: false,
        message: res_err_6029?.error || res_err_6029?.message || 'An error occurred',
        error: res_err_6029?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    const hashedPass = await hashPassword(new_password);

    await query(
      `UPDATE teachers 
       SET password_hash = $1, recovery_token = NULL, recovery_token_expires = NULL, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [hashedPass, teacher.id]
    );

    const res_data_4825 = {
      message: 'Password reset successful. You can now login with your new password.'
    };
      return NextResponse.json({
        success: true,
        message: res_data_4825?.message || 'Successfully fecthed data',
        paylod: res_data_4825
      }, { status: 200 });
  } catch (error) {
    console.error('Error recovering teacher account:', error);
    const res_err_7115 = { error: 'Failed to process password recovery. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_7115?.error || res_err_7115?.message || 'An error occurred',
        error: res_err_7115?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
