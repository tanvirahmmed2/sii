import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// GET all provost assignments
export async function GET() {
  try {
    const result = await query(`
      SELECT hp.id, hp.hostel_id, hp.teacher_id, hp.created_at, h.name as hostel_name, t.name as teacher_name, t.email as teacher_email 
      FROM hostel_provost hp
      JOIN hostels h ON hp.hostel_id = h.id
      JOIN teachers t ON hp.teacher_id = t.id
      ORDER BY h.name ASC, t.name ASC
    `);
    const res_data = { provosts: result.rows };
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched provosts list',
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching provosts list:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve provosts list. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// POST assign provost
export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 403 });
    }

    const { hostel_id, teacher_id } = await request.json();

    if (!hostel_id || !teacher_id) {
      return NextResponse.json({
        success: false,
        message: 'Hostel and Teacher are required.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    // Check duplicate assignment
    const check = await query(
      'SELECT id FROM hostel_provost WHERE hostel_id = $1 AND teacher_id = $2',
      [hostel_id, teacher_id]
    );
    if (check.rows.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'This teacher is already assigned as a provost for this hostel.',
        error: 'Conflict',
        paylod: null
      }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO hostel_provost (hostel_id, teacher_id) 
       VALUES ($1, $2) 
       RETURNING id, hostel_id, teacher_id, created_at`,
      [hostel_id, teacher_id]
    );

    const res_data = { message: 'Provost assigned successfully.', provost: result.rows[0] };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 201 });
  } catch (error) {
    console.error('Error assigning provost:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to assign provost. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
