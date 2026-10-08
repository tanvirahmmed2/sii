import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { queryDb } from 'src/lib/database/db';
import { signJWT } from 'src/lib/middleware/developer';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { createStaffSession, STAFF_COOKIE_NAME } from 'src/lib/middleware/staff';
import { recordLoginLog } from 'src/lib/database/logger';

export async function POST(request, context) {
  try {
    const resolvedParams = await context?.params;
    const website = await resolveWebsiteFromRequest(request, { params: resolvedParams });

    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Campus portal website not found.' },
        { status: 404 }
      );
    }

    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: 'Email and verification code are required.' },
        { status: 400 }
      );
    }

    const result = await queryDb(
      `SELECT * FROM website_staffs 
       WHERE website_id = $1 AND LOWER(email) = LOWER($2) AND is_active = TRUE`,
      [website.id, email.trim()]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Staff account not found or inactive.' },
        { status: 404 }
      );
    }

    const staff = result.rows[0];

    if (!staff.two_factor_code || !staff.two_factor_expires) {
      return NextResponse.json(
        { success: false, error: 'No active 2FA request found. Please log in again.' },
        { status: 400 }
      );
    }

    const expiresAt = new Date(staff.two_factor_expires);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Verification code has expired. Please request a new code.' },
        { status: 400 }
      );
    }

    if (staff.two_factor_code.trim().toLowerCase() !== code.trim().toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification code.' },
        { status: 401 }
      );
    }

    // Clear 2FA OTP
    await queryDb(
      `UPDATE website_staffs 
       SET two_factor_code = NULL, two_factor_expires = NULL, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [staff.id]
    );

    // Record login log
    try {
      await recordLoginLog({
        userType: 'staff',
        name: staff.name,
        email: staff.email,
        req: request,
        status: 'success',
      });
    } catch {}

    const token = signJWT({
      id: staff.id,
      website_id: website.id,
      email: staff.email,
      name: staff.name,
    });

    // Create session in staff_sessions
    await createStaffSession({
      websiteId: website.id,
      staffId: staff.id,
      token,
      request,
    });

    const cookieStore = await cookies();
    cookieStore.set(STAFF_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
      sameSite: 'lax',
    });

    // Fetch active module permissions (scoped to package-allowed website modules)
    const permsRes = await queryDb(
      `SELECT wmp.website_module_id, wmp.can_view, wmp.can_create, wmp.can_edit, wmp.can_delete,
              wm.slug AS module_slug, wm.name AS module_name, wm.icon AS module_icon
       FROM website_modules_permissions wmp
       JOIN website_modules wm ON wm.id = wmp.website_module_id
       JOIN websites w ON w.id = wmp.website_id
       LEFT JOIN subscriptions s ON (s.id = w.subscription_id OR s.website_id = w.id)
       WHERE wmp.staff_id = $1 AND wmp.website_id = $2 AND wm.is_active = TRUE
         AND (
           EXISTS (
             SELECT 1 FROM package_website_modules pwm 
             WHERE pwm.package_id = s.package_id AND pwm.website_module_id = wm.id
           )
           OR s.package_id IS NULL
         )`,
      [staff.id, website.id]
    ).catch(() => ({ rows: [] }));

    const permissions = {};
    const allowedModules = [];
    for (const p of permsRes.rows) {
      permissions[p.module_slug] = p;
      if (p.can_view) allowedModules.push(p.module_slug);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Verification successful! Redirecting...',
        paylod: {
          email: staff.email,
          staff: {
            id: staff.id,
            name: staff.name,
            email: staff.email,
            websiteId: website.id,
            permissions,
            allowedModules,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error verifying staff 2FA:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
