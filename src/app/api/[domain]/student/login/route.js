import { NextResponse } from 'next/server';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import {
  authenticateStudent,
  setStudentSessionCookie,
} from 'src/lib/middleware/students.js';
import {
  inspectMalwareAndAttacks,
  checkRateLimit,
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
    const rateCheck = checkRateLimit(`student_login_api:${clientIp}`, {
      windowMs: 60 * 1000,
      max: 15,
    });
    if (rateCheck.limited) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait a moment.' },
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
    const password = body.password;
    const channel = body.channel || 'email';
    const twoFactorCode = body.code || body.twoFactorCode;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: 'Registration number, email, or phone number and password are required.' },
        { status: 400 }
      );
    }

    const authResult = await authenticateStudent({
      identifier,
      password,
      websiteId: website.id,
      channel,
      twoFactorCode,
      request,
      website,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Logged into student portal successfully.',
      student: authResult.student,
      token: authResult.token,
    });

    await setStudentSessionCookie(response, authResult.token);

    return response;
  } catch (error) {
    if (error.status === 429 && error.locked) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          locked: true,
          remainingMinutes: error.remainingMinutes,
          remainingSeconds: error.remainingSeconds,
        },
        { status: 429 }
      );
    }

    if (error.verification_status) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          verification_status: error.verification_status,
        },
        { status: error.status || 403 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Authentication failed. Please verify your student credentials.',
      },
      { status: error.status || 401 }
    );
  }
}
