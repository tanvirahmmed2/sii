import { NextResponse } from 'next/server';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import {
  authenticateTeacher,
  setTeacherSessionCookie,
} from 'src/lib/middleware/teacher.js';
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
    const rateCheck = checkRateLimit(`teacher_login_api:${clientIp}`, {
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
    const identifier = body.identifier || body.email || body.phone || body.number;
    const password = body.password;
    const channel = body.channel || 'email';
    const twoFactorCode = body.code || body.twoFactorCode;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: 'Teacher email or phone number and password are required.' },
        { status: 400 }
      );
    }

    const authResult = await authenticateTeacher({
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
      message: 'Logged into teacher portal successfully.',
      teacher: authResult.teacher,
      token: authResult.token,
    });

    await setTeacherSessionCookie(response, authResult.token);

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

    if (error.requires2FA || error.twoFactorRequired) {
      return NextResponse.json(
        {
          success: true,
          requires2FA: true,
          twoFactorRequired: true,
          channel: error.channel || 'email',
          email: error.email,
          phone: error.phone,
          hasPhone: Boolean(error.hasPhone),
          hasEmail: Boolean(error.hasEmail),
          message: error.message,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Authentication failed. Please verify your credentials.',
        deactivated: Boolean(error.deactivated),
        pendingVerification: Boolean(error.pendingVerification),
      },
      { status: error.status || 401 }
    );
  }
}
