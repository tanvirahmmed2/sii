import { NextResponse } from 'next/server';
import { authenticateDeveloper } from 'src/lib/middleware/developer';
import { DEVELOPER_TOKEN } from 'src/lib/database/secret';

export async function POST(request) {
  try {
    const body = await request.json();
    const identifier = (body.identifier || body.email || body.phone || '').trim();
    const password = body.password;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: 'Email or phone number and password are required.' },
        { status: 400 }
      );
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    const result = await authenticateDeveloper(identifier, password, { ip, userAgent });

    const response = NextResponse.json({
      success: true,
      developer: result.developer,
      admin: result.admin,
      token: result.token,
      message: 'Logged in successfully.',
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    };

    response.cookies.set(DEVELOPER_TOKEN, result.token, cookieOptions);

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Authentication failed.',
        unverified: Boolean(error.unverified),
        email: error.email || undefined,
        deactivated: Boolean(error.deactivated),
      },
      { status: error.unverified || error.deactivated ? 403 : 401 }
    );
  }
}
