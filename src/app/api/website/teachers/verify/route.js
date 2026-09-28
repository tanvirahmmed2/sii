import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/teachers/verify?token=<token>
// Validates a teacher verification token and returns pre-fill data
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Verification token is required.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    const result = await query(
      `SELECT id, name, email, number, designation, is_registered, verification_token_expires
       FROM teachers
       WHERE verification_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Invalid verification link. This link may not exist or has already been used.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    const teacher = result.rows[0];

    // Check if already registered (link already used)
    if (teacher.is_registered) {
      return NextResponse.json({
        success: false,
        message: 'This account has already been set up. Please go to the Teacher Login page.',
        error: 'Already Registered',
        paylod: null
      }, { status: 400 });
    }

    // Check if the token has expired
    if (new Date() > new Date(teacher.verification_token_expires)) {
      return NextResponse.json({
        success: false,
        message: 'This verification link has expired. Please contact the administration to generate a new link.',
        error: 'Token Expired',
        paylod: null
      }, { status: 410 });
    }

    return NextResponse.json({
      success: true,
      message: 'Verification token is valid. Please complete your profile setup.',
      paylod: {
        teacher: {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          number: teacher.number,
          designation: teacher.designation
        }
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error verifying teacher token:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to verify token. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
