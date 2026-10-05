import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';

export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Tenant website not found' }, { status: 404 });
    }
    const websiteId = website.id;

    const result = await queryDb(
      'SELECT * FROM website_notices WHERE website_id = $1 ORDER BY is_pinned DESC, created_at DESC LIMIT 6',
      [websiteId]
    ).catch(() =>
      queryDb('SELECT * FROM notices WHERE website_id = $1 ORDER BY is_pinned DESC, created_at DESC LIMIT 6', [websiteId]).catch(() =>
        queryDb('SELECT * FROM notices ORDER BY is_pinned DESC, created_at DESC LIMIT 6')
      )
    );

    const res_data = { notices: result.rows };
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched home notices',
      paylod: res_data,
      payload: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching home notices:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve home notices. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

