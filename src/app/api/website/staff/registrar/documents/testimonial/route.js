import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';
import { logActivity } from '@/lib/activity_logger';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-staff')?.value || cookieStore.get('fit-admin')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const {
      student_id,
      academic_character = 'Excellent',
      conduct = 'Good',
      remarks = ''
    } = await request.json();

    if (!student_id) {
      return NextResponse.json({ success: false, error: 'student_id is required.' }, { status: 400 });
    }

    const studentRes = await query(`
      SELECT s.*, c.name AS class_name, sec.name AS section_name
      FROM students s
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN sections sec ON sec.id = s.section_id
      WHERE s.id = $1
    `, [student_id]);

    if (studentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student not found.' }, { status: 404 });
    }
    const student = studentRes.rows[0];

    const testimonialNo = `TEST-${new Date().getFullYear()}-${String(student.id).padStart(4, '0')}`;

    const testRes = await query(`
      INSERT INTO student_testimonials (
        testimonial_no, student_id, issue_date, academic_character, conduct, remarks, issued_by_type, issued_by_id
      ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7)
      ON CONFLICT (testimonial_no) DO UPDATE SET academic_character = EXCLUDED.academic_character, conduct = EXCLUDED.conduct, remarks = EXCLUDED.remarks, issue_date = CURRENT_DATE
      RETURNING *
    `, [testimonialNo, student.id, academic_character, conduct, remarks ? remarks.trim() : null, decoded.role || 'staff', decoded.id]);

    await logActivity({
      userId: decoded.id,
      userType: decoded.role || 'staff',
      action: 'ISSUE_TESTIMONIAL',
      details: {
        student_id: student.id,
        student_name: student.name,
        testimonial_no: testimonialNo
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Testimonial issued successfully.',
      paylod: {
        testimonial: testRes.rows[0],
        student
      }
    });

  } catch (error) {
    console.error('Error issuing testimonial:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
