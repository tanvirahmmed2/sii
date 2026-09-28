import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-teacher')?.value;
    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Not authenticated',
        error: 'Unauthorized',
        paylod: null
      }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json({
        success: false,
        message: 'Invalid token',
        error: 'Unauthorized',
        paylod: null
      }, { status: 401 });
    }

    const teacherId = decoded.id;

    // Fetch subjects assigned to this teacher
    const subjectsRes = await query(`
      SELECT 
        cs.id, 
        cs.class_id, 
        cst.section_id, 
        cs.subject_id,
        c.name as class_name, 
        sec.name as section_name,
        sub.name as subject_name, 
        sub.code as subject_code
      FROM class_subject_teachers cst
      JOIN class_subjects cs ON cst.class_subject_id = cs.id
      JOIN classes c ON cs.class_id = c.id
      LEFT JOIN sections sec ON cst.section_id = sec.id
      JOIN subjects sub ON cs.subject_id = sub.id
      WHERE cst.teacher_id = $1
      ORDER BY c.numeric_name ASC, sec.name ASC, sub.name ASC
    `, [teacherId]);

    const res_data = { subjects: subjectsRes.rows };
    return NextResponse.json({
      success: true,
      message: 'Teacher subjects retrieved successfully',
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching teacher subjects:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
