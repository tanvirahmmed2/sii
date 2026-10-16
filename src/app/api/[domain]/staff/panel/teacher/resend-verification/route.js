import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from 'src/lib/database/db.js';
import { verifyTeacherStaffAccess } from 'src/lib/middleware/teacher-auth.js';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo.js';
import { buildTeacherVerificationUrl } from '../route.js';

/**
 * POST /api/[domain]/staff/panel/teacher/resend-verification
 * Resends the account verification / activation invitation link to a teacher.
 */
export async function POST(request, context) {
  try {
    const auth = await verifyTeacherStaffAccess(request, context, 'edit');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json().catch(() => ({}));
    const teacherId = body.teacherId || body.teacher_id || body.id;
    const email = body.email?.trim()?.toLowerCase();

    if (!teacherId && !email) {
      return NextResponse.json(
        { success: false, error: 'Teacher ID or email is required to resend verification link.' },
        { status: 400 }
      );
    }

    let queryStr = `
      SELECT id, name, email, is_active, is_registered
      FROM website_teachers
      WHERE website_id = $1
    `;
    const queryParams = [website.id];

    if (teacherId) {
      queryStr += ` AND id = $2`;
      queryParams.push(teacherId);
    } else {
      queryStr += ` AND LOWER(email) = LOWER($2)`;
      queryParams.push(email);
    }

    const teacherRes = await queryDb(queryStr, queryParams);
    if (teacherRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Teacher not found in this institution.' },
        { status: 404 }
      );
    }

    const teacher = teacherRes.rows[0];

    // Generate fresh verification token valid for 7 days
    const verificationToken = crypto.randomBytes(32).toString('hex');

    await queryDb(
      `UPDATE website_teachers
       SET verification_token = $1,
           verification_token_expires = CURRENT_TIMESTAMP + INTERVAL '7 days',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND website_id = $3`,
      [verificationToken, teacher.id, website.id]
    );

    // Build verification URL
    const verificationUrl = buildTeacherVerificationUrl(website, verificationToken, request);

    // Send verification email via website mailer (falling back to platform mailer if unconfigured)
    let emailSent = false;
    let emailError = null;

    try {
      const emailHtml = buildStyledEmail({
        title: 'Faculty Account Activation Link',
        subtitle: `${website.name} — Teacher Operations Portal`,
        recipientName: teacher.name,
        bodyParagraphs: [
          `A new verification link has been requested for your faculty account at ${website.name}.`,
          'Your account status is currently inactive pending verification. Please use the link below to verify your profile and set up your personal login password.',
          'This link is valid for 7 days. Once verified, your status will become active and you will be able to log in, recover your credentials, and access the Teacher Portal.',
        ],
        actionUrl: verificationUrl,
        actionText: 'Activate Account & Set Password →',
        footerNote: 'If you did not expect this email, please contact campus administration.',
      });

      await sendEmail({
        to: teacher.email,
        toName: teacher.name,
        subject: `${website.name} - Activate Your Faculty Account`,
        html: emailHtml,
        websiteId: website.id,
      });
      emailSent = true;
    } catch (mailErr) {
      emailError = mailErr.message;
      console.warn('[Teacher Resend Verification] Email dispatch error:', mailErr.message);
    }

    return NextResponse.json({
      success: true,
      message: emailSent
        ? `Verification activation email successfully resent to ${teacher.email}.`
        : `New verification link generated for ${teacher.email}.`,
      verificationUrl,
      emailSent,
      emailError: emailSent ? null : emailError,
    });
  } catch (error) {
    console.error('Error resending teacher verification link:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to resend verification link.' },
      { status: 500 }
    );
  }
}
