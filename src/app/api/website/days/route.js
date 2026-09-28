import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query('SELECT * FROM days ORDER BY id ASC');
    const res_data = { days: result.rows };
    return NextResponse.json({
      success: true,
      message: 'Days retrieved successfully',
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching days:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve academic days.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
