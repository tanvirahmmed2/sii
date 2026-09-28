import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// GET all class teacher assignments
export async function GET() {
  try {
    const result = await query(`
      SELECT 
        tc.*, 
        t.name AS teacher_name, 
        c.name AS class_name, 
        c.code AS class_code,
        s.name AS section_name
      FROM teacher_classes tc
      JOIN teachers t ON tc.teacher_id = t.id
      JOIN classes c ON tc.class_id = c.id
      LEFT JOIN sections s ON tc.section_id = s.id
      ORDER BY c.numeric_name ASC, s.name ASC, t.name ASC
    `);
    const res_data = { assignments: result.rows };
    return NextResponse.json({
      success: true,
      message: 'Class teacher assignments fetched successfully',
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching class teacher assignments:', error);
    const res_err = { error: 'Failed to retrieve class teacher assignments. Internal server error.' };
    return NextResponse.json({
      success: false,
      message: res_err.error,
      error: res_err.error,
      paylod: null
    }, { status: 500 });
  }
}

// POST assign a class teacher (Admin only)
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

    const { teacher_id, class_id, section_id } = await request.json();

    if (!teacher_id || !class_id) {
      const res_err = { error: 'Teacher ID and Class ID are required.' };
      return NextResponse.json({
        success: false,
        message: res_err.error,
        error: res_err.error,
        paylod: null
      }, { status: 400 });
    }

    const teachId = parseInt(teacher_id, 10);
    const clsId = parseInt(class_id, 10);
    const sectId = section_id ? parseInt(section_id, 10) : null;

    // Verify uniqueness for class_id and section_id
    let checkDup;
    if (sectId === null) {
      checkDup = await query(
        'SELECT id FROM teacher_classes WHERE class_id = $1 AND section_id IS NULL',
        [clsId]
      );
    } else {
      checkDup = await query(
        'SELECT id FROM teacher_classes WHERE class_id = $1 AND section_id = $2',
        [clsId, sectId]
      );
    }

    if (checkDup.rows.length > 0) {
      const res_err = { error: 'A class teacher is already assigned to this class/section.' };
      return NextResponse.json({
        success: false,
        message: res_err.error,
        error: res_err.error,
        paylod: null
      }, { status: 400 });
    }

    const newAssignment = await query(
      `INSERT INTO teacher_classes (teacher_id, class_id, section_id) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [teachId, clsId, sectId]
    );

    const res_data = { message: 'Class teacher assigned successfully.', assignment: newAssignment.rows[0] };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 201 });
  } catch (error) {
    console.error('Error assigning class teacher:', error);
    const res_err = { error: 'Failed to create class teacher assignment. Internal server error.' };
    return NextResponse.json({
      success: false,
      message: res_err.error,
      error: res_err.error,
      paylod: null
    }, { status: 500 });
  }
}
