import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import {
  hashPassword,
  generateToken,
  createOfficerSession,
  setOfficerSessionCookie,
  ensureOfficerSchema,
} from 'src/lib/middleware/officer.js';

// POST: Validate verification token and return officer details
export async function POST(request, context) {
  try {
    await ensureOfficerSchema().catch(() => {});
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

    const officerRes = await queryDb(
      `SELECT wo.id, wo.name, wo.email, wo.phone, wo.department, wo.designation,
              wo.address, wo.is_registered, wo.is_active, wo.verification_token,
              wo.verification_token_expires
       FROM website_officers wo
       WHERE wo.website_id = $1 AND wo.verification_token = $2
       LIMIT 1`,
      [website.id, cleanToken]
    );

    if (officerRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or unrecognized verification token.' },
        { status: 404 }
      );
    }

    const officer = officerRes.rows[0];

    if (officer.is_registered) {
      return NextResponse.json(
        { success: false, error: 'This officer account has already been registered and verified.' },
        { status: 400 }
      );
    }

    if (officer.verification_token_expires && new Date(officer.verification_token_expires) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This verification invitation has expired. Please contact campus administration for a fresh invitation.' },
        { status: 410 }
      );
    }

    const officerPayload = {
      id: officer.id,
      name: officer.name,
      email: officer.email,
      phone: officer.phone,
      department: officer.department,
      designation: officer.designation,
      address: officer.address || '',
    };

    return NextResponse.json({
      success: true,
      officer: officerPayload,
      payload: { officer: officerPayload },
      paylod: { officer: officerPayload },
    });
  } catch (error) {
    console.error('Error validating officer verification token:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error validating verification token.' },
      { status: 500 }
    );
  }
}

// PUT: Finalize account setup with permanent password and profile details
export async function PUT(request, context) {
  try {
    await ensureOfficerSchema().catch(() => {});
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { token, password, address, phone } = body;

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

    const officerRes = await queryDb(
      `SELECT id, name, email, phone, department, designation, is_registered, verification_token_expires
       FROM website_officers
       WHERE website_id = $1 AND verification_token = $2
       LIMIT 1`,
      [website.id, cleanToken]
    );

    if (officerRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or unrecognized verification token.' },
        { status: 404 }
      );
    }

    const officer = officerRes.rows[0];

    if (officer.is_registered) {
      return NextResponse.json(
        { success: false, error: 'This officer account has already been registered and verified.' },
        { status: 400 }
      );
    }

    if (officer.verification_token_expires && new Date(officer.verification_token_expires) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This verification token has expired. Please request a new invitation.' },
        { status: 410 }
      );
    }

    const hashedPassword = await hashPassword(password);

    await queryDb(
      `UPDATE website_officers SET
         password = $1,
         address = COALESCE($2, address),
         phone = COALESCE($3, phone),
         is_registered = TRUE,
         is_active = TRUE,
         verification_token = NULL,
         verification_token_expires = NULL,
         updated_at = CURRENT_TIMESTAMP
       WHERE website_id = $4 AND id = $5`,
      [hashedPassword, address?.trim() || null, phone?.trim() || null, website.id, officer.id]
    );

    // Automatically create session and authenticate
    const sessionToken = generateToken({
      id: officer.id,
      email: officer.email,
      websiteId: website.id,
      name: officer.name,
      role: 'officer',
    });

    await createOfficerSession({
      websiteId: website.id,
      officerId: officer.id,
      token: sessionToken,
      request,
    });

    const officerData = {
      id: officer.id,
      name: officer.name,
      email: officer.email,
      phone: phone?.trim() || officer.phone,
      department: officer.department,
      designation: officer.designation,
      isRegistered: true,
      isActive: true,
    };

    const response = NextResponse.json({
      success: true,
      message: 'Account verified and configured successfully. Welcome aboard!',
      token: sessionToken,
      officer: officerData,
      payload: { officer: officerData },
      paylod: { officer: officerData },
    });

    await setOfficerSessionCookie(response, sessionToken);
    return response;
  } catch (error) {
    console.error('Error finalizing officer verification:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error completing verification.' },
      { status: 500 }
    );
  }
}
