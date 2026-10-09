import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { hashPassword } from 'src/lib/middleware/staff';

// POST: Validate verification token and return staff details
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
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Verification token is required.' },
        { status: 400 }
      );
    }

    const cleanToken = String(token).trim();

    const staffRes = await queryDb(
      `SELECT ws.id, ws.name, ws.email, ws.number, ws.address,
              ws.is_registered, ws.is_active,
              ws.verification_token, ws.verification_token_expires,
              gp.name AS grade_name
       FROM website_staffs ws
       LEFT JOIN website_staff_pay_scale gp ON gp.id = ws.grade_id
       WHERE ws.website_id = $1 AND ws.verification_token = $2
       LIMIT 1`,
      [website.id, cleanToken]
    );

    if (staffRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or unrecognized verification token.' },
        { status: 404 }
      );
    }

    const staff = staffRes.rows[0];

    if (staff.is_registered) {
      return NextResponse.json(
        { success: false, error: 'This staff account has already been configured.' },
        { status: 400 }
      );
    }

    if (staff.verification_token_expires && new Date(staff.verification_token_expires) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This verification link has expired. Please contact administration for a new invitation.' },
        { status: 410 }
      );
    }

    const staffPayload = {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      number: staff.number,
      address: staff.address || '',
      designation: staff.grade_name || 'Staff Member',
      gradeName: staff.grade_name || null,
    };

    return NextResponse.json({
      success: true,
      staff: staffPayload,
      payload: { staff: staffPayload },
      paylod: { staff: staffPayload },
    });
  } catch (error) {
    console.error('Error validating staff verification token:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error validating verification token.' },
      { status: 500 }
    );
  }
}

// PUT: Finalize account setup with password and residential address
export async function PUT(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { token, address, password } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Verification token is required.' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters in length.' },
        { status: 400 }
      );
    }

    const cleanToken = String(token).trim();

    const staffRes = await queryDb(
      `SELECT id, is_registered, verification_token_expires
       FROM website_staffs
       WHERE website_id = $1 AND verification_token = $2
       LIMIT 1`,
      [website.id, cleanToken]
    );

    if (staffRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or unrecognized verification token.' },
        { status: 404 }
      );
    }

    const staff = staffRes.rows[0];

    if (staff.is_registered) {
      return NextResponse.json(
        { success: false, error: 'This staff account has already been configured.' },
        { status: 400 }
      );
    }

    if (staff.verification_token_expires && new Date(staff.verification_token_expires) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Verification token has expired.' },
        { status: 410 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const cleanAddress = address ? String(address).trim() : null;

    await queryDb(
      `UPDATE website_staffs
       SET password = $1,
           address = COALESCE($2, address),
           is_registered = TRUE,
           verification_token = NULL,
           verification_token_expires = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [hashedPassword, cleanAddress, staff.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Staff account setup completed successfully. You may now log in.',
    });
  } catch (error) {
    console.error('Error completing staff setup:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error while completing account setup.' },
      { status: 500 }
    );
  }
}
