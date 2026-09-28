import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-student')?.value;
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

    const studentId = decoded.id;

    // Get student class & section
    const studentRes = await query(`
      SELECT class_id, section_id FROM students WHERE id = $1
    `, [studentId]);

    if (studentRes.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Student not found',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    const { class_id, section_id } = studentRes.rows[0];

    // Fetch subjects mapping to the class/section and left join their syllabus and teacher details
    const subjectsRes = await query(`
      SELECT 
        cs.id as class_subject_id, 
        sub.id as subject_id, 
        sub.name as subject_name, 
        sub.code as subject_code,
        t.name as teacher_name, 
        t.email as teacher_email,
        syl.title as syllabus_title, 
        syl.link as syllabus_link
      FROM class_subjects cs
      JOIN subjects sub ON cs.subject_id = sub.id
      LEFT JOIN class_subject_teachers cst ON cs.id = cst.class_subject_id AND (cst.section_id = $2 OR cst.section_id IS NULL)
      LEFT JOIN teachers t ON cst.teacher_id = t.id
      LEFT JOIN syllabuses syl ON cs.class_id = syl.class_id AND cs.subject_id = syl.subject_id
      WHERE cs.class_id = $1
      ORDER BY sub.name ASC
    `, [class_id, section_id]);

    const res_data = { subjects: subjectsRes.rows };
    return NextResponse.json({
      success: true,
      message: 'Student subjects retrieved successfully',
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student subjects and syllabus:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
