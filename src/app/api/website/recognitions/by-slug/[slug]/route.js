import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET single recognition by slug (public)
export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    const result = await query('SELECT * FROM recognitions WHERE slug = $1', [slug]);
    if (result.rows.length === 0) {
      const res_err_349 = { error: 'Recognition not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_349?.error || res_err_349?.message || 'An error occurred',
        error: res_err_349?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }
    const res_data_481 = { recognition: result.rows[0] };
      return NextResponse.json({
        success: true,
        message: res_data_481?.message || 'Successfully fecthed data',
        paylod: res_data_481
      }, { status: 200 });
  } catch (error) {
    console.error('Error fetching recognition by slug:', error);
    const res_err_1085 = { error: 'Failed to retrieve recognition. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_1085?.error || res_err_1085?.message || 'An error occurred',
        error: res_err_1085?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
