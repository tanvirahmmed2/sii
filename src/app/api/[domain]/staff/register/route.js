import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hashPassword } from 'src/lib/middleware/developer';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';

// POST: Verify staff account lookup by verification token or email
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

    const { token, email } = await request.json();

    if (!token && !email) {
      return NextResponse.json(
        { success: false, error: 'Verification token or email address is required.' },
        { status: 400 }
      );
    }

    let result;
    if (token) {
      result = await queryDb(
        `SELECT id, name, email, number, address, is_registered, verification_token_expires
         FROM website_staffs
         WHERE website_id = $1 AND verification_token = $2
         LIMIT 1`,
        [website.id, token.trim()]
      );
    } else {
      result = await queryDb(
        `SELECT id, name, email, number, address, is_registered, verification_token_expires
         FROM website_staffs
         WHERE website_id = $1 AND LOWER(email) = LOWER($2)
         LIMIT 1`,
        [website.id, email.trim()]
      );
    }

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Staff account not found or invalid verification token.' },
        { status: 404 }
      );
    }

    const staff = result.rows[0];

    if (staff.is_registered) {
      return NextResponse.json(
        { success: false, error: 'This account has already completed setup. Please log in.' },
        { status: 400 }
      );
    }

    // Check token expiry if token was used
    if (token && staff.verification_token_expires && new Date() > new Date(staff.verification_token_expires)) {
      return NextResponse.json(
        { success: false, error: 'This verification setup link has expired. Please contact administration.' },
        { status: 410 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Account verified successfully. Please complete setup.',
        paylod: {
          staff: {
            id: staff.id,
            name: staff.name,
            email: staff.email,
            number: staff.number,
            address: staff.address || '',
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error verifying staff token:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PUT: Complete staff account setup with address & password
export async function PUT(request, context) {
  try {
    const resolvedParams = await context?.params;
    const website = await resolveWebsiteFromRequest(request, { params: resolvedParams });

    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Campus portal website not found.' },
        { status: 404 }
      );
    }

    const { token, email, address, password } = await request.json();

    if ((!token && !email) || !password) {
      return NextResponse.json(
        { success: false, error: 'Email/Token and password are required.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    let staffCheck;
    if (token) {
      staffCheck = await queryDb(
        `SELECT id, is_registered, verification_token_expires
         FROM website_staffs
         WHERE website_id = $1 AND verification_token = $2
         LIMIT 1`,
        [website.id, token.trim()]
      );
    } else {
      staffCheck = await queryDb(
        `SELECT id, is_registered, verification_token_expires
         FROM website_staffs
         WHERE website_id = $1 AND LOWER(email) = LOWER($2)
         LIMIT 1`,
        [website.id, email.trim()]
      );
    }

    if (staffCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Staff account not found or invalid verification token.' },
        { status: 404 }
      );
    }

    const staff = staffCheck.rows[0];

    if (staff.is_registered) {
      return NextResponse.json(
        { success: false, error: 'Account setup already completed. Please log in.' },
        { status: 400 }
      );
    }

    if (token && staff.verification_token_expires && new Date() > new Date(staff.verification_token_expires)) {
      return NextResponse.json(
        { success: false, error: 'Verification link has expired. Please contact administration.' },
        { status: 410 }
      );
    }

    const hashedPassword = await hashPassword(password);

    await queryDb(
      `UPDATE website_staffs
       SET address = COALESCE($1, address),
           password = $2,
           is_registered = TRUE,
           is_active = TRUE,
           verification_token = NULL,
           verification_token_expires = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [address ? address.trim() : null, hashedPassword, staff.id]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Account setup completed successfully! You can now log in.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error completing staff setup:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
