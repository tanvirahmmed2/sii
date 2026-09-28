import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query('SELECT * FROM events ORDER BY event_date ASC LIMIT 3');
    const res_data = { events: result.rows };
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched home events',
      paylod: res_data
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
