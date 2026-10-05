import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';

// GET single recognition by slug (public)
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, message: 'Tenant website not found', paylod: null }, { status: 404 });
    }

    const params = await context?.params;
    const slug = params?.slug;

    const result = await query(
      'SELECT * FROM website_recognitions WHERE website_id = $1 AND slug = $2',
      [website.id, slug]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Recognition not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    const res_data = { recognition: result.rows[0] };
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched recognition',
      payload: res_data,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching recognition by slug:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve recognition. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
