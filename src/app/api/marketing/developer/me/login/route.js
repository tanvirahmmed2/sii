import { NextResponse } from 'next/server';
import { authenticateDeveloper } from 'src/lib/middleware/developer';
import { DEVELOPER_TOKEN } from 'src/lib/database/secret';
import {
  getClientIp,
  getUserAgent,
  inspectMalwareAndAttacks,
  checkRateLimit,
} from 'src/lib/security/shield';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    const attackInspection = await inspectMalwareAndAttacks(request, body);
    if (attackInspection.isBlocked) {
      return NextResponse.json(
        { success: false, error: attackInspection.error },
        { status: attackInspection.status || 403 }
      );
    }

    const ip = getClientIp(request);
    const userAgent = getUserAgent(request);
    const identifier = (body.identifier || body.email || body.phone || '').trim();
    const password = body.password;
    const twoFactorCode = (body.twoFactorCode || body.code || '').trim();
    const channel = (body.channel || 'email').trim().toLowerCase();

    const rateCheck = await checkRateLimit({
      ip,
      identifier,
      action: 'dev_login',
      maxAttempts: 5,
      windowSeconds: 900,
      blockDurationSeconds: 900,
    });

    if (!rateCheck.isAllowed) {
      return NextResponse.json(
        {
          success: false,
          error: rateCheck.error,
          rateLimited: true,
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds || 900) } }
      );
    }

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: 'Email or phone number and password are required.' },
        { status: 400 }
      );
    }

    const result = await authenticateDeveloper(identifier, password, { ip, userAgent, twoFactorCode, channel });

    const response = NextResponse.json({
      success: true,
      developer: result.developer,
      admin: result.admin,
      token: result.token,
      message: 'Logged in successfully.',
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    };

    response.cookies.set(DEVELOPER_TOKEN, result.token, cookieOptions);

    return response;
  } catch (error) {
    if (error.dispatchFailed) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          dispatchFailed: true,
        },
        { status: 500 }
      );
    }

    if (error.twoFactorRequired || error.requires2FA) {
      return NextResponse.json(
        {
          success: false,
          twoFactorRequired: true,
          requires2FA: true,
          channel: error.channel || 'email',
          hasPhone: Boolean(error.hasPhone),
          hasEmail: Boolean(error.hasEmail),
          rateLimited: Boolean(error.rateLimited),
          remainingMinutes: error.remainingMinutes,
          message: error.message || 'Two-factor verification code required.',
        },
        { status: error.rateLimited ? 429 : 401 }
      );
    }

    if (error.locked) {
      return NextResponse.json(
        {
          success: false,
          locked: true,
          remainingMinutes: error.remainingMinutes,
          error: error.message,
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Authentication failed.',
        unverified: Boolean(error.unverified),
        email: error.email || undefined,
        deactivated: Boolean(error.deactivated),
      },
      { status: error.unverified || error.deactivated ? 403 : error.status || 401 }
    );
  }
}
