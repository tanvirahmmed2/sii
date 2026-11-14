import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import {
  generateToken,
  setStudentSessionCookie,
  createStudentLoginSession,
} from 'src/lib/middleware/students.js';
import {
  inspectMalwareAndAttacks,
  checkRateLimit,
  recordSuccessfulLogin,
  extractClientIp,
} from 'src/lib/security/shield.js';

export async function POST(request, context) {
  try {
    const attackCheck = inspectMalwareAndAttacks(request);
    if (attackCheck.blocked) {
      return NextResponse.json(
        { success: false, error: 'Suspicious request payload detected.' },
        { status: 403 }
      );
    }

    const clientIp = extractClientIp(request);
    const rateCheck = checkRateLimit(`student_2fa_verify:${clientIp}`, {
      windowMs: 60 * 1000,
      max: 10,
    });
    if (rateCheck.limited) {
      return NextResponse.json(
        { success: false, error: 'Too many verification attempts. Please wait.' },
        { status: 429 }
      );
    }

    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const identifier = body.identifier || body.registration_number || body.registration_no || body.email || body.phone || body.number;
    const code = body.code || body.twoFactorCode;

    if (!identifier || !code) {
      return NextResponse.json(
        { success: false, error: 'Student identifier and 6-digit verification code are required.' },
        { status: 400 }
      );
    }

    const cleanId = String(identifier).trim();
    const cleanLower = cleanId.toLowerCase();
    const raw = cleanId;
    const digits = raw.replace(/\D/g, '');
    const cleanCode = String(code).trim();

    const studentRes = await queryDb(
      `SELECT s.id, s.website_id, s.registration_no, s.roll_no, s.student_unique_id,
              s.class_id, s.section_id, s.session_id, s.is_active,
              COALESCE(s.phone, s.number) AS phone, s.number,
              COALESCE(s.is_verified, FALSE) AS is_verified,
              COALESCE(i.is_registered, s.is_registered, TRUE) AS is_registered,
              COALESCE(i.verification_status, s.verification_status, 'verified') AS verification_status,
              COALESCE(s.name, i.data->>'name', 'Student') AS name,
              COALESCE(s.email, i.data->>'email') AS email,
              s.two_factor_code, s.two_factor_expires
       FROM website_students s
       LEFT JOIN website_student_info i ON s.id = i.student_id
       WHERE s.website_id = $1 AND (
         LOWER(s.registration_no) = $2
         OR LOWER(COALESCE(s.email, i.data->>'email')) = $2
         OR LOWER(s.student_unique_id) = $2
         OR s.number = $3
         OR s.phone = $3
         OR (LENGTH($4) >= 8 AND RIGHT(REGEXP_REPLACE(COALESCE(s.phone, s.number, ''), '\\D', '', 'g'), 10) = RIGHT($4, 10))
       )
       LIMIT 1`,
      [website.id, cleanLower, raw, digits]
    );

    if (studentRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Student account not found.' },
        { status: 404 }
      );
    }

    const student = studentRes.rows[0];

    if (!student.is_active || !student.is_registered || !student.is_verified) {
      return NextResponse.json(
        { success: false, error: 'Student account is not active or verified.' },
        { status: 403 }
      );
    }

    if (!student.two_factor_code || student.two_factor_code !== cleanCode) {
      return NextResponse.json(
        { success: false, error: 'Invalid security verification code.' },
        { status: 400 }
      );
    }

    if (student.two_factor_expires && new Date(student.two_factor_expires) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Verification code has expired. Please request a new code.' },
        { status: 410 }
      );
    }

    await queryDb(
      `UPDATE website_students
       SET two_factor_code = NULL,
           two_factor_expires = NULL,
           failed_login_attempts = 0,
           locked_until = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [student.id]
    );

    const userAgent = request.headers?.get?.('user-agent') || 'Unknown';
    await recordSuccessfulLogin({
      table: 'website_students',
      id: student.id,
      websiteId: website.id,
      ip: clientIp,
      userAgent,
    });

    const token = generateToken({
      id: student.id,
      email: student.email,
      registration_no: student.registration_no,
      websiteId: website.id,
      name: student.name,
    });

    await createStudentLoginSession(student.id, website.id, token, request);

    const studentPayload = {
      id: student.id,
      name: student.name,
      email: student.email,
      registrationNumber: student.registration_no,
      registration_no: student.registration_no,
      roll_no: student.roll_no,
      student_unique_id: student.student_unique_id,
      phone: student.phone || student.number,
      number: student.phone || student.number,
      isActive: Boolean(student.is_active),
      isRegistered: Boolean(student.is_registered),
      isVerified: Boolean(student.is_verified),
    };

    const response = NextResponse.json({
      success: true,
      message: 'Two-factor verification successful. Welcome back.',
      student: studentPayload,
      token,
    });

    await setStudentSessionCookie(response, token);

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error validating 2FA code.' },
      { status: 500 }
    );
  }
}

