import { NextResponse } from 'next/server';
import { getCreatorSession } from '@/lib/middleware/creator';

export async function GET(request) {
  try {
    const current = await getCreatorSession(request);
    if (!current) {
      return NextResponse.json({ success: false, creator: null, error: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.json({
      success: true,
      creator: {
        id: current.id,
        name: current.name,
        email: current.email,
        phone: current.phone,
        bio: current.bio,
        isActive: current.isActive,
        isVerified: current.isVerified,
      },
    });
  } catch (error) {
    console.error('Creator me GET error:', error);
    return NextResponse.json({ success: false, creator: null, error: error.message }, { status: 500 });
  }
}
