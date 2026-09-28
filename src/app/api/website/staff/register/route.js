import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

// POST: Verify staff using unique verification token
export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ success: false, error: 'Verification token is required.' }, { status: 400 });
    }

    const result = await query(
      `SELECT id, name, email, number, role, is_registered, verification_token_expires
       FROM staffs
       WHERE verification_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid verification token.' }, { status: 404 });
    }

    const staff = result.rows[0];

    if (staff.is_registered) {
      return NextResponse.json({ success: false, error: 'This account has already completed setup. Please log in.' }, { status: 400 });
    }

    // Check expiry
    if (new Date() > new Date(staff.verification_token_expires)) {
      return NextResponse.json({ success: false, error: 'This verification link has expired.' }, { status: 410 });
    }

    return NextResponse.json({
      success: true,
      message: 'Token verified successfully.',
      paylod: {
        staff: {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          number: staff.number,
          role: staff.role
        }
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error verifying staff token:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Complete staff account setup using verification token
export async function PUT(request) {
  try {
    const { token, address, password } = await request.json();

    if (!token || !address || !password) {
      return NextResponse.json({ success: false, error: 'All fields (address, password) are required.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const staffCheck = await query(
      `SELECT id, is_registered, verification_token_expires
       FROM staffs
       WHERE verification_token = $1`,
      [token]
    );

    if (staffCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid verification token.' }, { status: 404 });
    }

    if (staffCheck.rows[0].is_registered) {
      return NextResponse.json({ success: false, error: 'Account setup already completed.' }, { status: 400 });
    }

    if (new Date() > new Date(staffCheck.rows[0].verification_token_expires)) {
      return NextResponse.json({ success: false, error: 'Verification link has expired.' }, { status: 410 });
    }

    // Hash password
    const hashedPass = await hashPassword(password);

    // Save and activate
    const result = await query(
      `UPDATE staffs
       SET address = $1, 
           password_hash = $2,
           is_registered = TRUE,
           is_active = TRUE,
           verification_token = NULL,
           verification_token_expires = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE verification_token = $3
       RETURNING id, name, email, role, is_active, is_registered`,
      [address.trim(), hashedPass, token]
    );

    return NextResponse.json({
      success: true,
      message: 'Staff account setup completed successfully. You can now login.',
      paylod: { staff: result.rows[0] }
    }, { status: 200 });
  } catch (error) {
    console.error('Error completing staff setup:', error);
    return NextResponse.json({ success: false, error: 'Failed to complete account registration.' }, { status: 500 });
  }
}
