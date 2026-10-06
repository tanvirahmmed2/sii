import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db';
import { isAdmin } from 'src/lib/middleware/developer';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo';
import { getBaseUrl } from 'src/lib/database/secret';
import { generateToken } from 'src/lib/utils/random';

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
    const newToken = generateToken(12);
    const newExpiry = new Date(Date.now() + 72 * 60 * 60 * 1000);

    await query(
      `UPDATE teachers
       SET verification_token = $1, verification_token_expires = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [newToken, newExpiry, teacher_id]
    );

    const baseUrl = getBaseUrl(request);
    const verificationUrl = `${baseUrl}/auth/access/teacher/verify?token=${newToken}`;

    try {
      await sendEmail({
        to: teacher.email,
        toName: teacher.name,
        subject: 'Your Teacher Profile Verification Link (Resent)',
        html: buildStyledEmail({
          title: 'Account Setup Reminder',
          subtitle: 'Teacher Profile Verification',
          recipientName: teacher.name,
          bodyParagraphs: [
            'The school administration has resent your profile setup invitation. Your previous link has been refreshed.',
            'Click the button below to set up your account and complete your profile.',
          ],
          actionUrl: verificationUrl,
          actionText: 'Verify & Set Up Profile',
          footerNote: 'This link is valid for 72 hours. If you did not expect this email, please contact the school administration.',
        })
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
