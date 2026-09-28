import { NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/middleware/developer';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    const result = await authenticateAdmin(email, password, { ip, userAgent });
    return NextResponse.json({
      success: true,
      admin: result.admin,
      token: result.token,
      message: 'Logged in successfully.',
    });
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
