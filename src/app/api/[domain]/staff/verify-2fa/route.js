import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import {
  generateToken,
  createStaffSession,
  setStaffSessionCookie,
} from 'src/lib/middleware/staff';

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
        { success: false, error: 'Staff email and 6-digit security code are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanCode = String(code).trim();

    // Verify staff record & code
    const staffRes = await queryDb(
      `SELECT ws.id, ws.website_id, ws.name, ws.email, ws.number, ws.address,
              ws.is_active, ws.is_registered, ws.is_two_factor_enabled,
              ws.two_factor_code, ws.two_factor_expires,
              ws.grade_id, ws.username, ws.bio,
              gp.name AS grade_name
       FROM website_staffs ws
       LEFT JOIN website_staff_pay_scale gp ON gp.id = ws.grade_id
       WHERE ws.website_id = $1 AND LOWER(ws.email) = $2
       LIMIT 1`,
      [website.id, cleanEmail]
    );

    if (staffRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Staff account not found.' },
        { status: 404 }
      );
    }

    const staff = staffRes.rows[0];

    if (!staff.is_active) {
      return NextResponse.json(
        { success: false, error: 'Staff account is currently deactivated.' },
        { status: 403 }
      );
    }

    if (!staff.two_factor_code || staff.two_factor_code !== cleanCode) {
      return NextResponse.json(
        { success: false, error: 'Invalid security code. Please check and try again.' },
        { status: 400 }
      );
    }

    if (!staff.two_factor_expires || new Date(staff.two_factor_expires) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Security code has expired. Please request a new code.' },
        { status: 410 }
      );
    }

    // Clear 2FA code upon successful verification
    await queryDb(
      `UPDATE website_staffs
       SET two_factor_code = NULL, two_factor_expires = NULL
       WHERE id = $1`,
      [staff.id]
    );

    // Generate JWT token
    const token = generateToken({
      id: staff.id,
      email: staff.email,
      websiteId: website.id,
      name: staff.name,
    });

    // Create session in staff_sessions
    await createStaffSession({
      websiteId: website.id,
      staffId: staff.id,
      token,
      request,
    });

    const staffData = {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      number: staff.number,
      address: staff.address,
      username: staff.username,
      gradeId: staff.grade_id,
      gradeName: staff.grade_name || null,
      designation: staff.grade_name || 'Staff Member',
      isTwoFactorEnabled: Boolean(staff.is_two_factor_enabled),
      isActive: Boolean(staff.is_active),
    };

    const response = NextResponse.json({
      success: true,
      message: 'Two-factor authentication successful.',
      token,
      staff: staffData,
      payload: { staff: staffData },
      paylod: { staff: staffData },
    });

    // Set HTTP-only session cookie
    await setStaffSessionCookie(response, token);

    // Keep active tenant cookie synced
    const tenantSlug = website.subdomain || website.slug || '';
    if (tenantSlug) {
      response.cookies.set('x-website-domain', tenantSlug, { path: '/', maxAge: 7 * 86400 });
      response.cookies.set('x-domain', tenantSlug, { path: '/', maxAge: 7 * 86400 });
    }

    return response;
  } catch (error) {
    console.error('Error in staff verify-2fa:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error during 2FA verification.' },
      { status: 500 }
    );
  }
}
