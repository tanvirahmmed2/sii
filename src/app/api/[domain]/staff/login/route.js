import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import {
  comparePassword,
  generateToken,
  createStaffSession,
  setStaffSessionCookie,
} from 'src/lib/middleware/staff';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo';

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
        { success: false, error: 'Staff email and password are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Look up staff under this website
    const staffRes = await queryDb(
      `SELECT ws.id, ws.website_id, ws.name, ws.email, ws.number, ws.address,
              ws.password, ws.is_active, ws.is_registered, ws.is_two_factor_enabled,
              ws.grade_id, ws.username, ws.bio,
              gp.name AS grade_name, gp.basic_salary, gp.allowance
       FROM website_staffs ws
       LEFT JOIN website_staff_pay_scale gp ON gp.id = ws.grade_id
       WHERE ws.website_id = $1 AND LOWER(ws.email) = $2
       LIMIT 1`,
      [website.id, cleanEmail]
    );

    if (staffRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const staff = staffRes.rows[0];

    if (!staff.is_active) {
      return NextResponse.json(
        { success: false, error: 'Your staff account is currently deactivated. Please contact campus administration.' },
        { status: 403 }
      );
    }

    const isMatch = await comparePassword(password, staff.password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Two-Factor Authentication Check
    if (staff.is_two_factor_enabled) {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

      await queryDb(
        `UPDATE website_staffs
         SET two_factor_code = $1, two_factor_expires = CURRENT_TIMESTAMP + INTERVAL '10 minutes'
         WHERE id = $2`,
        [otpCode, staff.id]
      );

      try {
        const html = buildStyledEmail({
          title: 'Staff Security Verification',
          subtitle: `${website.name} — Staff Operations Portal`,
          recipientName: staff.name,
          bodyParagraphs: [
            'A sign-in request to your staff portal was detected. Please use the verification code below to complete your authentication.',
            'This security code will expire in 10 minutes. If you did not initiate this request, please contact your systems administrator immediately.',
          ],
          code: otpCode,
          codeLabel: 'Two-Factor Authentication Code',
        });

        await sendEmail({
          to: staff.email,
          toName: staff.name,
          subject: `${website.name} - Staff Portal Login Verification Code`,
          html,
        });
      } catch (mailErr) {
        console.warn('Failed to dispatch 2FA email to staff:', mailErr.message);
      }

      return NextResponse.json({
        success: true,
        requires2FA: true,
        message: 'Two-factor authentication code sent to your registered email address.',
      });
    }

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
      message: 'Logged in successfully.',
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
    console.error('Error during staff login:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error occurred during staff login.' },
      { status: 500 }
    );
  }
}
