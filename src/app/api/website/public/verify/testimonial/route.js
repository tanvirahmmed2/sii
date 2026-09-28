import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('q') || searchParams.get('testimonial_no') || searchParams.get('reg_no') || '';

    if (!searchQuery.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Please enter a Testimonial Reference Number or Registration Number.'
      }, { status: 400 });
    }

    const qTerm = `%${searchQuery.trim().toLowerCase()}%`;

    const testRes = await query(`
      SELECT st.id, st.testimonial_no, st.issue_date, st.academic_character, st.conduct, st.remarks,
             s.id AS student_id, s.name AS student_name, s.registration_number, s.roll,
             s.father_name, s.mother_name, s.date_of_birth,
             c.name AS class_name
      FROM student_testimonials st
      JOIN students s ON s.id = st.student_id
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE LOWER(st.testimonial_no) LIKE $1
         OR LOWER(s.registration_number) LIKE $1
      ORDER BY st.id DESC
      LIMIT 1
    `, [qTerm]);

    if (testRes.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No Character Testimonial record found for the provided search query.'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Character Testimonial verified successfully.',
      paylod: {
        testimonial: testRes.rows[0]
      }
    });

  } catch (error) {
    console.error('Error verifying testimonial:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error'
    }, { status: 500 });
  }
}
