import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import {
  generateToken,
  setTeacherSessionCookie,
  createTeacherSession,
} from 'src/lib/middleware/teacher.js';

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
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: 'Email and 6-digit code are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanCode = String(code).trim();

    const teacherRes = await queryDb(
      `SELECT wt.id, wt.website_id, wt.name, wt.email, wt.is_active, wt.is_registered,
              wt.two_factor_code, wt.two_factor_expires
       FROM website_teachers wt
       WHERE wt.website_id = $1 AND LOWER(wt.email) = $2
       LIMIT 1`,
      [website.id, cleanEmail]
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
        { success: false, error: 'Account inactive or pending verification.' },
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
        { success: false, error: 'Verification code has expired. Please request a new one.' },
        { status: 410 }
      );
    }

    // Clear 2FA code
    await queryDb(
      `UPDATE website_teachers
       SET two_factor_code = NULL, two_factor_expires = NULL
       WHERE id = $1`,
      [teacher.id]
    );

    const token = generateToken({
      id: teacher.id,
      email: teacher.email,
      websiteId: website.id,
      name: teacher.name,
      role: 'teacher',
    });

    await createTeacherSession({
      websiteId: website.id,
      teacherId: teacher.id,
      token,
      request,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Two-factor verification successful! Signed in.',
      token,
      teacher: { id: teacher.id, name: teacher.name, email: teacher.email },
    });

    await setTeacherSessionCookie(response, token);

    const tenantSlug = website.subdomain || website.slug || '';
    if (tenantSlug) {
      response.cookies.set('x-website-domain', tenantSlug, { path: '/', maxAge: 7 * 86400 });
      response.cookies.set('x-domain', tenantSlug, { path: '/', maxAge: 7 * 86400 });
    }

    return response;
  } catch (error) {
    console.error('Error verifying teacher 2FA:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error verifying security code.' },
      { status: 500 }
    );
  }
}
