import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { sendEmail } from '@/lib/brevo';
import crypto from 'crypto';

// POST /api/teachers/resend-verification
// Regenerates a new token and resends the verification email for a pending teacher
export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 403 });
    }

    const { teacher_id } = await request.json();

    if (!teacher_id) {
      return NextResponse.json({
        success: false,
        message: 'Teacher ID is required.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    // Fetch teacher record
    const result = await query(
      'SELECT id, name, email, is_registered FROM teachers WHERE id = $1',
      [teacher_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Teacher not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    const teacher = result.rows[0];

    if (teacher.is_registered) {
      return NextResponse.json({
        success: false,
        message: 'This teacher has already completed account setup. No verification link needed.',
        error: 'Already Registered',
        paylod: null
      }, { status: 400 });
    }

    // Generate a fresh token + 72h expiry
    const newToken = crypto.randomBytes(32).toString('hex');
    const newExpiry = new Date(Date.now() + 72 * 60 * 60 * 1000);

    await query(
      `UPDATE teachers
       SET verification_token = $1, verification_token_expires = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [newToken, newExpiry, teacher_id]
    );

    // Build and send the verification email
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/auth/access/teacher/verify?token=${newToken}`;

    try {
      await sendEmail({
        to: teacher.email,
        toName: teacher.name,
        subject: 'Your Teacher Profile Verification Link (Resent)',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
            <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 32px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0;">Account Setup Reminder</h1>
              <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 8px 0 0;">Your previous verification link has been refreshed.</p>
            </div>
            <div style="padding: 32px;">
              <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 8px;">Hi <strong>${teacher.name}</strong>,</p>
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                The school administration has resent your profile setup invitation. Your previous link has been invalidated. 
                Click the button below to set up your account. This link is valid for <strong>72 hours</strong>.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">
                  Verify &amp; Set Up My Profile
                </a>
              </div>
              <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin-top: 24px;">
                If the button doesn't work, copy and paste this link into your browser:<br/>
                <a href="${verificationUrl}" style="color: #4f46e5; word-break: break-all;">${verificationUrl}</a>
              </p>
              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;"/>
              <p style="color: #cbd5e1; font-size: 11px; margin: 0;">
                If you didn't expect this email, please ignore it or contact the school administration. This link will expire in 72 hours.
              </p>
            </div>
          </div>
        `
      });
    } catch (emailErr) {
      console.error('Failed to resend verification email (non-fatal):', emailErr.message);
      // Still return success since the token was regenerated
      return NextResponse.json({
        success: true,
        message: 'Verification token regenerated, but email delivery failed. Please check Brevo configuration.',
        paylod: { verification_link_sent: false, verification_url: verificationUrl }
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      message: `Verification link resent to ${teacher.email} successfully.`,
      paylod: { verification_link_sent: true }
    }, { status: 200 });
  } catch (error) {
    console.error('Error resending verification link:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to resend verification link. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
