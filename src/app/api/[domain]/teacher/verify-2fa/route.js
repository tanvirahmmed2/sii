import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import {
  generateToken,
  setTeacherSessionCookie,
  createTeacherSession,
} from 'src/lib/middleware/teacher.js';
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
    const rateCheck = checkRateLimit(`teacher_2fa_verify:${clientIp}`, {
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
    const identifier = body.identifier || body.email || body.phone || body.number;
    const code = body.code || body.twoFactorCode;

    if (!identifier || !code) {
      return NextResponse.json(
        { success: false, error: 'Teacher identifier and 6-digit verification code are required.' },
        { status: 400 }
      );
    }

    const cleanId = String(identifier).trim();
    const cleanEmail = cleanId.toLowerCase();
    const raw = cleanId;
    const digits = raw.replace(/\D/g, '');
    const cleanCode = String(code).trim();

    const teacherRes = await queryDb(
      `SELECT wt.id, wt.website_id, wt.name, wt.email, wt.number, COALESCE(wt.phone, wt.number) AS phone,
              wt.is_active, wt.is_registered, wt.two_factor_code, wt.two_factor_expires,
              wt.department_id, wt.designation_id, wt.photo_url, wt.photo_id,
              wd.title AS designation_title, dept.name AS department_name
       FROM website_teachers wt
       LEFT JOIN website_designations wd ON wd.id = wt.designation_id
       LEFT JOIN website_departments dept ON dept.id = wt.department_id
       WHERE wt.website_id = $1 AND (
         LOWER(wt.email) = $2
         OR wt.number = $3
         OR wt.phone = $3
         OR (LENGTH($4) >= 8 AND RIGHT(REGEXP_REPLACE(COALESCE(wt.phone, wt.number, ''), '\\D', '', 'g'), 10) = RIGHT($4, 10))
       )
       LIMIT 1`,
      [website.id, cleanEmail, raw, digits]
    );

    if (teacherRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Teacher account not found.' },
        { status: 404 }
      );
    }

    const teacher = teacherRes.rows[0];

    if (!teacher.is_active || !teacher.is_registered) {
      return NextResponse.json(
        { success: false, error: 'Account is inactive or pending registration verification.' },
        { status: 403 }
      );
    }

    if (!teacher.two_factor_code || teacher.two_factor_code !== cleanCode) {
      return NextResponse.json(
        { success: false, error: 'Invalid security verification code.' },
        { status: 400 }
      );
    }

    if (teacher.two_factor_expires && new Date(teacher.two_factor_expires) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Verification code has expired. Please request a new code.' },
        { status: 410 }
      );
    }

    await queryDb(
      `UPDATE website_teachers
       SET two_factor_code = NULL, 
           two_factor_expires = NULL,
           failed_login_attempts = 0,
           locked_until = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [teacher.id]
    );

    const userAgent = request.headers?.get?.('user-agent') || 'Unknown';
    await recordSuccessfulLogin({
      table: 'website_teachers',
      id: teacher.id,
      websiteId: website.id,
      ip: clientIp,
      userAgent,
    });

    const token = generateToken({
      id: teacher.id,
      email: teacher.email,
      websiteId: website.id,
      name: teacher.name,
    });

    await createTeacherSession({
      websiteId: website.id,
      teacherId: teacher.id,
      token,
      request,
    });

    const teacherPayload = {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      number: teacher.phone || teacher.number,
      phone: teacher.phone || teacher.number,
      designation: teacher.designation_title || 'Teacher',
      designationId: teacher.designation_id,
      departmentId: teacher.department_id,
      departmentName: teacher.department_name,
      photoUrl: teacher.photo_url,
      photoId: teacher.photo_id,
      isActive: Boolean(teacher.is_active),
      isRegistered: Boolean(teacher.is_registered),
    };

    const response = NextResponse.json({
      success: true,
      message: 'Two-factor verification successful. Welcome back.',
      teacher: teacherPayload,
      token,
    });

    await setTeacherSessionCookie(response, token);

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error validating 2FA code.' },
      { status: 500 }
    );
  }
}
