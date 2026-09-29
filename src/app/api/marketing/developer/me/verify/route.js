import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';

export async function POST(request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: 'Email and 6-digit verification code are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.toString().trim();

    const adminRes = await queryDb(
      `SELECT id, email, two_factor_code, two_factor_expires 
       FROM developers 
       WHERE LOWER(email) = $1 LIMIT 1`,
      [cleanEmail]
    );

    if (adminRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No developer account found for this email address.' },
        { status: 404 }
      );
    }

    const admin = adminRes.rows[0];

    if (!admin.two_factor_code) {
      return NextResponse.json({
        success: true,
        message: 'Account is already verified. You can log in.',
      });
    }

    if (admin.two_factor_code !== cleanCode) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification code. Please check and try again.' },
        { status: 400 }
      );
    }

    if (admin.two_factor_expires && new Date(admin.two_factor_expires) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This verification code has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    await queryDb(
      `UPDATE developers 
       SET two_factor_code = NULL, two_factor_expires = NULL, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [admin.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Admin account verified successfully! You can now sign in.',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Verification failed.' },
      { status: 500 }
    );
  }
}
