import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query('SELECT * FROM news ORDER BY created_at DESC LIMIT 6');
    const res_data = { news: result.rows };
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched home news',
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching home news:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve home news. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
