import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/staff/verify?token=<token>
// Validates a staff verification token and returns pre-fill data
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

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
      return NextResponse.json({ success: false, error: 'Invalid verification link or link already used.' }, { status: 404 });
    }

    const staff = result.rows[0];

    // Check if already registered (link already used)
    if (staff.is_registered) {
      return NextResponse.json({ success: false, error: 'This account has already completed setup. Please log in.' }, { status: 400 });
    }

    // Check if expired
    if (new Date() > new Date(staff.verification_token_expires)) {
      return NextResponse.json({ success: false, error: 'This verification link has expired. Please contact administration.' }, { status: 410 });
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
    return NextResponse.json({ success: false, error: 'Failed to verify token. Internal server error.' }, { status: 500 });
  }
}
