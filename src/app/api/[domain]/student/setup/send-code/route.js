import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { sendWebsiteEmail } from 'src/lib/database/websiteBrevo.js';
import { buildStyledEmail } from 'src/lib/database/brevo.js';

/**
 * POST: Sends a 6-digit email verification code via Brevo to verify student email before setup
 */
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const body = await request.json();
    const { email, registration_no } = body;

    if (!email?.trim()) {
      return NextResponse.json({ success: false, error: 'Registered student email is required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanRegNo = registration_no?.trim() || null;

    // Verify student exists in website_students matching the email or registration number
    let studentRes = await queryDb(
      `SELECT s.id, s.registration_no, s.roll_no, s.email, s.is_active,
              i.name, i.email AS info_email, i.is_registered, i.is_verified,
              c.name AS class_name, ses.name AS session_name
       FROM website_students s
       LEFT JOIN website_student_info i ON s.id = i.student_id
       LEFT JOIN website_classes c ON s.class_id = c.id
       LEFT JOIN website_sessions ses ON s.session_id = ses.id
       WHERE s.website_id = $1 
         AND LOWER(TRIM(COALESCE(s.email, i.email))) = $2
         ${cleanRegNo ? 'AND (s.registration_no = $3 OR s.roll_no = $3 OR s.student_unique_id = $3)' : ''}
       LIMIT 1`,
      cleanRegNo ? [website.id, cleanEmail, cleanRegNo] : [website.id, cleanEmail]
    );

    // Fallback: If not found by email, check if student was registered without email using registration number
    if (studentRes.rows.length === 0 && cleanRegNo) {
      studentRes = await queryDb(
        `SELECT s.id, s.registration_no, s.roll_no, s.email, s.is_active,
                i.name, i.email AS info_email, i.is_registered, i.is_verified,
                c.name AS class_name, ses.name AS session_name
         FROM website_students s
         LEFT JOIN website_student_info i ON s.id = i.student_id
         LEFT JOIN website_classes c ON s.class_id = c.id
         LEFT JOIN website_sessions ses ON s.session_id = ses.id
         WHERE s.website_id = $1 
           AND (s.registration_no = $2 OR s.roll_no = $2 OR s.student_unique_id = $2)
         LIMIT 1`,
        [website.id, cleanRegNo]
      );

      if (studentRes.rows.length > 0) {
        const found = studentRes.rows[0];
        const registeredEmail = (found.email || found.info_email || '').trim().toLowerCase();
        if (registeredEmail && registeredEmail !== cleanEmail) {
          return NextResponse.json({
            success: false,
            error: `Registration number matches student with pre-registered email (${registeredEmail}). Please enter that email address.`
          }, { status: 400 });
        }
      }
    }

    if (studentRes.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: cleanRegNo
          ? 'No student record found matching this registration number and email.'
          : 'No student record found matching this email address. If email was not added during admission, please provide your registration number.'
      }, { status: 404 });
    }

    const student = studentRes.rows[0];

    // Rate-limiting check: enforce a 60-second cooldown per student/email
    const recentOtpRes = await queryDb(`
      SELECT created_at FROM website_email_verifications
      WHERE website_id = $1 AND LOWER(email) = $2 AND purpose = 'student_setup'
        AND created_at > (CURRENT_TIMESTAMP - INTERVAL '60 seconds')
      LIMIT 1
    `, [website.id, cleanEmail]);

    if (recentOtpRes.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Please wait at least 60 seconds before requesting another verification code.'
      }, { status: 429 });
    }

    // Generate 6-digit numeric verification OTP securely
    const verificationOtp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

    // Store OTP in website_students directly (always present for registered student)
    await queryDb(
      `UPDATE website_students
       SET two_factor_code = $1,
           two_factor_expires = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND website_id = $4`,
      [verificationOtp, expiresAt, student.id, website.id]
    );

    // Also store in website_email_verifications
    try {
      await queryDb(
        `INSERT INTO website_email_verifications (website_id, email, otp_code, purpose, expires_at)
         VALUES ($1, $2, $3, 'student_setup', $4)`,
        [website.id, cleanEmail, verificationOtp, expiresAt]
      );
    } catch (verErr) {
      console.warn('Notice inserting into website_email_verifications:', verErr.message);
    }

    // If website_student_info exists, update it as well
    try {
      await queryDb(
        `UPDATE website_student_info
         SET two_factor_code = $1,
             two_factor_expires = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE student_id = $3 AND website_id = $4`,
        [verificationOtp, expiresAt, student.id, website.id]
      );
    } catch (_) {}

    // Prepare Brevo email content
    let emailDispatched = false;
    let dispatchError = null;

    try {
      const emailHtml = buildStyledEmail({
        title: 'Student Account Setup Verification',
        preheader: `Your verification code is ${verificationOtp}`,
        websiteName: website.name || 'Student Portal',
        bodyContent: `
          <p>Dear <strong>${student.name || 'Student'}</strong>,</p>
          <p>Welcome to <strong>${website.name || 'the Institution'}</strong>! We received a request to initialize and setup your student portal account.</p>
          <p>To ensure security, please verify your registered institutional email address using the one-time code below:</p>
          <div style="background-color: #f8fafc; border: 2px dashed #0284c7; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: 800; font-family: monospace; letter-spacing: 8px; color: #0284c7;">
              ${verificationOtp}
            </span>
            <p style="font-size: 11px; color: #64748b; margin-top: 10px; margin-bottom: 0;">This code is valid for 15 minutes.</p>
          </div>
          <p style="font-size: 13px; color: #475569;">
            <strong>Student Details:</strong><br/>
            Registration No: <code>${student.registration_no}</code><br/>
            Class: ${student.class_name || 'N/A'} | Session: ${student.session_name || 'N/A'}
          </p>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">If you did not request this setup code, please contact your school administrator immediately.</p>
        `
      });

      await sendWebsiteEmail(website.id, {
        to: cleanEmail,
        toName: student.name || 'Student',
        subject: `Your Student Setup Verification Code: ${verificationOtp}`,
        html: emailHtml
      });
      emailDispatched = true;
    } catch (mailErr) {
      console.warn(`[StudentSetup] Brevo email dispatch warning for ${cleanEmail}:`, mailErr.message);
      dispatchError = mailErr.message;
    }

    return NextResponse.json({
      success: true,
      message: emailDispatched 
        ? `A 6-digit verification code has been dispatched to ${cleanEmail}. Please enter it to continue setup.`
        : `A verification code was requested. Please check your email inbox to proceed.`,
      payload: {
        student_id: student.id,
        registration_no: student.registration_no,
        email: cleanEmail,
        student_name: student.name,
        expires_in_minutes: 15
      }
    });
  } catch (error) {
    console.error('Error in student setup send-code route:', error);
    return NextResponse.json({ success: false, error: 'Failed to dispatch verification code.' }, { status: 500 });
  }
}
