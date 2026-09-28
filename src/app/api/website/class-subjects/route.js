import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// GET all class-subject mappings
export async function GET() {
  try {
    const result = await query(`
      SELECT 
        cs.id, 
        cs.class_id, 
        cs.subject_id, 
        c.name AS class_name, 
        c.code AS class_code,
        sub.name AS subject_name, 
        sub.code AS subject_code
      FROM class_subjects cs
      JOIN classes c ON cs.class_id = c.id
      JOIN subjects sub ON cs.subject_id = sub.id
      ORDER BY c.numeric_name ASC, sub.name ASC
    `);
    const res_data = { assignments: result.rows };
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched class subjects',
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching class-subjects:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve class subjects.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// POST create a class-subject mapping (Admin only)
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

    const { class_id, subject_id } = await request.json();

    if (!class_id || !subject_id) {
      return NextResponse.json({
        success: false,
        message: 'Class ID and Subject ID are required.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    // Check duplicate mapping
    const checkDup = await query(
      'SELECT id FROM class_subjects WHERE class_id = $1 AND subject_id = $2',
      [class_id, subject_id]
    );

    if (checkDup.rows.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'This subject is already mapped to the selected class.',
        error: 'Conflict',
        paylod: null
      }, { status: 400 });
    }

    const newMapping = await query(
      `INSERT INTO class_subjects (class_id, subject_id) 
       VALUES ($1, $2) 
       RETURNING *`,
      [class_id, subject_id]
    );

    const res_data = { message: 'Class subject allocation created successfully.', assignment: newMapping.rows[0] };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 201 });
  } catch (error) {
    console.error('Error assigning class subject:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create class subject mapping.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
