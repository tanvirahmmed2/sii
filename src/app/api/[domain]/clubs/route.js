import { NextResponse } from 'next/server';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';

// GET: Public clubs list for tenant
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      clubs: [],
      payload: { clubs: [] },
      paylod: { clubs: [] },
    });
  } catch (error) {
    console.error('Error fetching tenant clubs:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
