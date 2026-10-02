import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';

export const dynamic = 'force-dynamic';

/**
 * GET: Direct verification link handler from email
 * Example: /api/marketing/developer/me/verify?token=...&email=...
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token')?.trim();
    const email = searchParams.get('email')?.trim().toLowerCase();

    if (!token) {
      return NextResponse.redirect(
        new URL('/developer-auth/verify?error=missing_token', request.url)
      );
    }

    const whereConditions = ['(verification_token = $1 OR two_factor_code = $1)'];
    const params = [token];

    if (email) {
      params.push(email);
      whereConditions.push(`LOWER(email) = $${params.length}`);
    }

    const devRes = await queryDb(
      `SELECT id, name, email, email_verified, verification_token, verification_token_expires, two_factor_code, two_factor_expires
       FROM developers 
       WHERE ${whereConditions.join(' AND ')}
       LIMIT 1`,
      params
    );

    if (devRes.rows.length === 0) {
      return NextResponse.redirect(
        new URL(`/developer-auth/verify?error=invalid_token&email=${encodeURIComponent(email || '')}`, request.url)
      );
    }

    const dev = devRes.rows[0];

    // Check expiration
    const expiry = dev.verification_token_expires || dev.two_factor_expires;
    if (expiry && new Date(expiry) < new Date()) {
      return NextResponse.redirect(
        new URL(`/developer-auth/verify?error=expired_token&email=${encodeURIComponent(dev.email)}`, request.url)
      );
    }

    // Mark verified
    await queryDb(
      `UPDATE developers 
       SET email_verified = TRUE,
           verification_token = NULL,
           verification_token_expires = NULL,
           two_factor_code = NULL,
           two_factor_expires = NULL,
           is_active = TRUE,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [dev.id]
    );

    return NextResponse.redirect(
      new URL(`/developer-auth/login?verified=true&email=${encodeURIComponent(dev.email)}`, request.url)
    );
  } catch (error) {
    console.error('Error in GET /api/marketing/developer/me/verify:', error);
    return NextResponse.redirect(
      new URL('/developer-auth/verify?error=server_error', request.url)
    );
  }
}

/**
 * POST: API verification handler (called from frontend verify form)
 * Accepts { token, email } or { code, email }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const token = (body.token || body.code)?.toString().trim();
    const email = body.email?.trim().toLowerCase();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Verification token or code is required.' },
        { status: 400 }
      );
    }

    const whereConditions = ['(verification_token = $1 OR two_factor_code = $1)'];
    const params = [token];

    if (email) {
      params.push(email);
      whereConditions.push(`LOWER(email) = $${params.length}`);
    }

    const devRes = await queryDb(
      `SELECT id, name, email, email_verified, verification_token, verification_token_expires, two_factor_code, two_factor_expires
       FROM developers 
       WHERE ${whereConditions.join(' AND ')}
       LIMIT 1`,
      params
    );

    if (devRes.rows.length === 0) {
      // Check if already verified
      if (email) {
        const checkEmail = await queryDb(
          `SELECT id, email_verified FROM developers WHERE LOWER(email) = $1 LIMIT 1`,
          [email]
        );
        if (checkEmail.rows[0]?.email_verified) {
          return NextResponse.json({
            success: true,
            alreadyVerified: true,
            email,
            message: 'Your developer account is already verified! You can sign in.',
          });
        }
      }

      return NextResponse.json(
        { success: false, error: 'Invalid verification token or code. Please check your link or request a new one.' },
        { status: 400 }
      );
    }

    const dev = devRes.rows[0];

    // Check expiration
    const expiry = dev.verification_token_expires || dev.two_factor_expires;
    if (expiry && new Date(expiry) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This verification link has expired. Please request a new verification link.', expired: true },
        { status: 400 }
      );
    }

    // Mark verified and active
    await queryDb(
      `UPDATE developers 
       SET email_verified = TRUE,
           verification_token = NULL,
           verification_token_expires = NULL,
           two_factor_code = NULL,
           two_factor_expires = NULL,
           is_active = TRUE,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [dev.id]
    );

    return NextResponse.json({
      success: true,
      email: dev.email,
      message: 'Developer account verified successfully! Redirecting to login...',
    });
  } catch (error) {
    console.error('Error in POST /api/marketing/developer/me/verify:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Verification failed.' },
      { status: 500 }
    );
  }
}
