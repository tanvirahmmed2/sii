import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { hashPassword } from 'src/lib/middleware/students.js';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo.js';
import { buildStudentRecoveryUrl } from 'src/lib/student/urls.js';

// POST: Request recovery token or reset password (supports both step 1 request and step 2 reset)
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const body = await request.json();
    const { email, recovery_token, new_password } = body;

    // STEP 2: Password reset submission
    if (recovery_token && new_password) {
      return handlePasswordReset(website, email, recovery_token, new_password);
    }

    // STEP 1: Request recovery token
    if (!email?.trim()) {
      return NextResponse.json({ success: false, error: 'Registered email or registration number is required.' }, { status: 400 });
    }

    const identifier = email.trim().toLowerCase();

    const studentRes = await queryDb(
      `SELECT s.id, s.registration_no, s.is_active,
              i.name, i.email
       FROM website_students s
       JOIN website_student_info i ON s.id = i.student_id
       WHERE s.website_id = $1 AND (LOWER(i.email) = $2 OR LOWER(s.registration_no) = $2)
       LIMIT 1`,
      [website.id, identifier]
    );

    if (studentRes.rows.length === 0) {
      // Don't leak user enumeration for security, return positive message
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this credential, a verification code has been dispatched.',
      });
    }

    const student = studentRes.rows[0];

    // Generate 6-digit numeric recovery code
    const sixDigitCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await queryDb(
      `UPDATE website_student_info
       SET recovery_token = $1,
           recovery_token_expires = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE student_id = $3 AND website_id = $4`,
      [sixDigitCode, expiresAt, student.id, website.id]
    );

    // Direct reset link URL with token query param
    const recoveryUrl = buildStudentRecoveryUrl(website, sixDigitCode, request);

    // Dispatch recovery email via Brevo if email is available
    if (student.email) {
      try {
        const emailHtml = buildStyledEmail({
          title: `Password Reset Request`,
          preheader: `Your verification code is ${sixDigitCode}`,
          websiteName: website.name || 'Institutional Management Portal',
          bodyContent: `
            <p>Dear <strong>${student.name || 'Student'}</strong>,</p>
            <p>We received a request to reset your student portal account password. Use the verification code below to complete your password update:</p>
            <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; margin: 20px 0;">
              <span style="font-size: 28px; font-weight: bold; font-family: monospace; letter-spacing: 6px; color: #0f172a;">
                ${sixDigitCode}
              </span>
              <p style="font-size: 11px; color: #64748b; margin-top: 8px; margin-bottom: 0;">Code expires in 60 minutes.</p>
            </div>
            <p style="font-size: 13px; color: #475569;">If you did not request a password reset, you can safely ignore this email.</p>
          `,
          ctaButton: {
            label: 'Reset Password Online →',
            url: recoveryUrl,
          },
        });

        await sendEmail({
          to: student.email,
          toName: student.name || 'Student',
          subject: `Your Student Account Verification Code [${sixDigitCode}]`,
          html: emailHtml,
          websiteId: website.id,
        });
      } catch (err) {
        console.warn('Failed to send recovery email via Brevo:', err.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your registered email inbox.',
    });
  } catch (error) {
    console.error('Error in student recovery request:', error);
    return NextResponse.json({ success: false, error: 'Internal server error processing recovery.' }, { status: 500 });
  }
}

// PUT: Reset password using verification token
export async function PUT(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const body = await request.json();
    const { email, recovery_token, new_password } = body;

    return handlePasswordReset(website, email, recovery_token, new_password);
  } catch (error) {
    console.error('Error in student recovery PUT:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

async function handlePasswordReset(website, email, token, newPassword) {
  if (!email?.trim() || !token?.trim() || !newPassword) {
    return NextResponse.json(
      { success: false, error: 'Email / Reg No, recovery token, and new password are all required.' },
      { status: 400 }
    );
  }

  if (newPassword.length < 6) {
    return NextResponse.json(
      { success: false, error: 'New password must be at least 6 characters long.' },
      { status: 400 }
    );
  }

  const identifier = email.trim().toLowerCase();
  const cleanToken = token.trim();

  const studentRes = await queryDb(
    `SELECT s.id, s.registration_no,
            i.name, i.email, i.recovery_token, i.recovery_token_expires
     FROM website_students s
     JOIN website_student_info i ON s.id = i.student_id
     WHERE website_id = $1 AND (LOWER(i.email) = $2 OR LOWER(s.registration_no) = $2)
     LIMIT 1`,
    [website.id, identifier]
  );

  if (studentRes.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Account not found.' }, { status: 404 });
  }

  const student = studentRes.rows[0];

  if (!student.recovery_token || student.recovery_token !== cleanToken) {
    return NextResponse.json({ success: false, error: 'Invalid or expired verification code.' }, { status: 400 });
  }

  if (student.recovery_token_expires && new Date() > new Date(student.recovery_token_expires)) {
    return NextResponse.json(
      { success: false, error: 'Verification code has expired. Please request a new code.' },
      { status: 410 }
    );
  }

  const hashedPassword = await hashPassword(newPassword);

  await queryDb(
    `UPDATE website_student_info
     SET password = $1,
         recovery_token = NULL,
         recovery_token_expires = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE student_id = $2 AND website_id = $3`,
    [hashedPassword, student.id, website.id]
  );

  return NextResponse.json({
    success: true,
    message: 'Password reset successfully! You can now log in with your new password.',
  });
}
