import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// GET periods
export async function GET() {
  try {
    const result = await query('SELECT * FROM periods ORDER BY start_time ASC');
    const res_data = { periods: result.rows };
    return NextResponse.json({
      success: true,
      message: 'Periods fetched successfully',
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching periods:', error);
    const res_err = { error: 'Failed to retrieve periods.' };
    return NextResponse.json({
      success: false,
      message: res_err.error,
      error: res_err.error,
      paylod: null
    }, { status: 500 });
  }
}

// POST create period (Admin only)
export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err.error,
        error: res_err.error,
        paylod: null
      }, { status: 403 });
    }

    const { name, start_time, end_time } = await request.json();

    if (!name || !start_time || !end_time) {
      const res_err = { error: 'All fields (name, start_time, end_time) are required.' };
      return NextResponse.json({
        success: false,
        message: res_err.error,
        error: res_err.error,
        paylod: null
      }, { status: 400 });
    }

    const newPeriod = await query(
      'INSERT INTO periods (name, start_time, end_time) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), start_time.trim(), end_time.trim()]
    );

    const res_data = { message: 'Period created successfully.', period: newPeriod.rows[0] };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating period:', error);
    const res_err = { error: 'Failed to create period.' };
    return NextResponse.json({
      success: false,
      message: res_err.error,
      error: res_err.error,
      paylod: null
    }, { status: 500 });
  }
}
