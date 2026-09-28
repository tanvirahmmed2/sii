import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query('SELECT * FROM notices ORDER BY is_pinned DESC, created_at DESC LIMIT 6');
    const res_data = { notices: result.rows };
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched home notices',
      paylod: res_data
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
