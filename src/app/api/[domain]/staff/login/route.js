import { NextResponse } from 'next/server';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { authenticateStaff, setStaffSessionCookie } from 'src/lib/middleware/staff';
import {
  getClientIp,
  getUserAgent,
  inspectMalwareAndAttacks,
  checkRateLimit,
} from 'src/lib/security/shield';

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

    const attackInspection = await inspectMalwareAndAttacks(request, body);
    if (attackInspection.isBlocked) {
      return NextResponse.json(
        { success: false, error: attackInspection.error },
        { status: attackInspection.status || 403 }
      );
    }

    const ip = getClientIp(request);
    const userAgent = getUserAgent(request);
    const identifier = String(body.identifier || body.email || body.phone || body.number || '').trim();
    const password = body.password;
    const twoFactorCode = String(body.twoFactorCode || body.code || '').trim();
    const channel = String(body.channel || 'email').trim().toLowerCase();

    const rateCheck = await checkRateLimit({
      ip,
      identifier,
      action: 'staff_login',
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

    const result = await authenticateStaff({
      websiteId: website.id,
      identifier,
      password,
      ip,
      userAgent,
      twoFactorCode,
      channel,
      request,
      website,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Logged in successfully.',
      token: result.token,
      staff: result.staff,
      payload: { staff: result.staff },
      paylod: { staff: result.staff },
    });

    await setStaffSessionCookie(response, result.token);

    const tenantSlug = website.subdomain || website.slug || '';
    if (tenantSlug) {
      response.cookies.set('x-website-domain', tenantSlug, { path: '/', maxAge: 7 * 86400 });
      response.cookies.set('x-domain', tenantSlug, { path: '/', maxAge: 7 * 86400 });
    }

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
          email: error.email || undefined,
          phone: error.phone || undefined,
          rateLimited: Boolean(error.rateLimited),
          remainingMinutes: error.remainingMinutes,
          message: error.message || 'Two-factor verification code required.',
        },
        { status: error.rateLimited ? 429 : 200 }
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
        deactivated: Boolean(error.deactivated),
      },
      { status: error.deactivated ? 403 : error.status || 401 }
    );
  }
}
