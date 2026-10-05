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
      'SELECT * FROM website_events WHERE website_id = $1 ORDER BY event_date ASC LIMIT 3',
      [websiteId]
    ).catch(() =>
      queryDb('SELECT * FROM events WHERE website_id = $1 ORDER BY event_date ASC LIMIT 3', [websiteId]).catch(() =>
        queryDb('SELECT * FROM events ORDER BY event_date ASC LIMIT 3')
      )
    );

    const res_data = { events: result.rows };
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched home events',
      paylod: res_data,
      payload: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching home events:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve home events. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

