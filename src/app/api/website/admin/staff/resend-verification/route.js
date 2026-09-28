import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { sendEmail } from '@/lib/brevo';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Admins only.' }, { status: 403 });
    }

    const { staff_id } = await request.json();

    if (!staff_id) {
      return NextResponse.json({ success: false, error: 'Staff ID is required.' }, { status: 400 });
    }

    const staffRes = await query('SELECT id, name, email, role, is_registered FROM staffs WHERE id = $1', [parseInt(staff_id, 10)]);

    if (staffRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Staff member not found.' }, { status: 404 });
    }

    const staff = staffRes.rows[0];

    if (staff.is_registered) {
      return NextResponse.json({ success: false, error: 'This staff account is already registered.' }, { status: 400 });
    }

    // Re-generate token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    await query(`
      UPDATE staffs
      SET verification_token = $1, verification_token_expires = $2
      WHERE id = $3
    `, [verificationToken, verificationExpires, staff.id]);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/auth/access/staff/verify?token=${verificationToken}`;

    // Send email
    try {
      await sendEmail({
        to: staff.email,
        toName: staff.name,
        subject: 'Complete Your Staff Profile Setup',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
            <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 40px 32px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0;">Welcome to the Staff Portal</h1>
              <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 8px 0 0;">Your staff profile has been created by the administration.</p>
            </div>
            <div style="padding: 32px;">
              <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 8px;">Hi <strong>${staff.name}</strong>,</p>
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                An administrator has generated a new setup link for your staff account. Click the button below to verify your identity and complete your profile setup.
                This verification link is valid for <strong>72 hours</strong>.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">
                  Verify &amp; Set Up My Profile
                </a>
              </div>
              <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin-top: 24px;">
                If the button doesn't work, copy and paste this link into your browser:<br/>
                <a href="${verificationUrl}" style="color: #0284c7; word-break: break-all;">${verificationUrl}</a>
              </p>
            </div>
          </div>
        `
      });
    } catch (emailErr) {
      console.error('Failed to send verification email (non-fatal):', emailErr.message);
    }

    return NextResponse.json({
      success: true,
      message: `A new verification link has been sent to ${staff.email}`
    }, { status: 200 });
  } catch (error) {
    console.error('Error resending verification:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to resend verification. Internal server error.'
    }, { status: 500 });
  }
}
