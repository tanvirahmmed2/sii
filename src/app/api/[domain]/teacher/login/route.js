import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import {
  comparePassword,
  generateToken,
  setTeacherSessionCookie,
  createTeacherSession,
} from 'src/lib/middleware/teacher.js';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo.js';

/**
 * API Route: /api/[domain]/teacher/login
 * Handles teacher authentication, 2FA challenge, JWT issuance, and session creation.
 */
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Teacher email and password are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Query teacher under this website
    const teacherRes = await queryDb(
      `SELECT wt.id, wt.website_id, wt.designation_id, wt.name, wt.email, wt.number,
              wt.emergency_contact, wt.gender, wt.blood_group, wt.date_of_birth, wt.religion,
              wt.address, wt.permanent_address, wt.joining_date, wt.salary, wt.photo_url,
              wt.password, wt.is_active, wt.is_registered, wt.is_two_factor_enabled,
              wd.title AS designation_title
       FROM website_teachers wt
       LEFT JOIN website_designations wd ON wd.id = wt.designation_id
       WHERE wt.website_id = $1 AND LOWER(wt.email) = $2
       LIMIT 1`,
      [website.id, cleanEmail]
    );

    if (teacherRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const teacher = teacherRes.rows[0];

    if (!teacher.is_active) {
      return NextResponse.json(
        { success: false, error: 'Your teacher account is deactivated. Please contact campus administration.' },
        { status: 403 }
      );
    }

    if (!teacher.is_registered) {
      return NextResponse.json(
        {
          success: false,
          error: 'Your account is pending verification. Please check your email for the invitation link to set your password.',
          pendingVerification: true,
        },
        { status: 403 }
      );
    }

    const isMatch = await comparePassword(password, teacher.password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Two-Factor Authentication Check
    if (teacher.is_two_factor_enabled) {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

      await queryDb(
        `UPDATE website_teachers
         SET two_factor_code = $1, two_factor_expires = CURRENT_TIMESTAMP + INTERVAL '10 minutes'
         WHERE id = $2`,
        [otpCode, teacher.id]
      );

      try {
        const html = buildStyledEmail({
          title: 'Teacher Security Verification',
          subtitle: `${website.name} — Teacher Operations Portal`,
          recipientName: teacher.name,
          bodyParagraphs: [
            'A sign-in request to your teacher dashboard was detected.',
            'Please use the 6-digit security code below to complete your authentication. This code expires in 10 minutes.',
            'If you did not initiate this sign-in attempt, please notify your administrator.',
          ],
          code: otpCode,
          codeLabel: 'Two-Factor Authentication Code',
        });

        await sendEmail({
          to: teacher.email,
          toName: teacher.name,
          subject: `${website.name} - Teacher Portal Login Verification Code`,
          html,
          websiteId: website.id,
        });
      } catch (mailErr) {
        console.warn('Failed to dispatch 2FA email to teacher:', mailErr.message);
      }

      return NextResponse.json({
        success: true,
        requires2FA: true,
        message: 'Security verification code has been dispatched to your email.',
      });
    }

    // Generate JWT token
    const token = generateToken({
      id: teacher.id,
      email: teacher.email,
      websiteId: website.id,
      name: teacher.name,
      role: 'teacher',
    });

    // Create session in website_teacher_login_sessions
    await createTeacherSession({
      websiteId: website.id,
      teacherId: teacher.id,
      token,
      request,
    });

    const teacherPayload = {
      id: teacher.id,
      websiteId: teacher.website_id,
      name: teacher.name,
      email: teacher.email,
      number: teacher.number,
      address: teacher.address,
      designation: teacher.designation_title || 'Teacher',
      designationId: teacher.designation_id,
      photoUrl: teacher.photo_url,
      isActive: Boolean(teacher.is_active),
      isRegistered: Boolean(teacher.is_registered),
    };

    const response = NextResponse.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      teacher: teacherPayload,
      payload: { teacher: teacherPayload },
      paylod: { teacher: teacherPayload },
    });

    // Set HTTP-only session cookie
    await setTeacherSessionCookie(response, token);

    // Keep active tenant domain cookies synced
    const tenantSlug = website.subdomain || website.slug || '';
    if (tenantSlug) {
      response.cookies.set('x-website-domain', tenantSlug, { path: '/', maxAge: 7 * 86400 });
      response.cookies.set('x-domain', tenantSlug, { path: '/', maxAge: 7 * 86400 });
    }

    return response;
  } catch (error) {
    console.error('Error during teacher login:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error during teacher login.' },
      { status: 500 }
    );
  }
}
