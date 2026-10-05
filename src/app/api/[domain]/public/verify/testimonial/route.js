import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';

export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Tenant website not found' }, { status: 404 });
    }

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
             s.id AS student_id, s.name AS student_name, s.registration_number,
             si.roll, si.father_name, si.mother_name, si.date_of_birth,
             c.name AS class_name
      FROM website_student_testimonials st
      JOIN website_students s ON s.id = st.student_id AND s.website_id = $1
      LEFT JOIN website_student_information si ON si.student_id = s.id AND si.website_id = $1
      LEFT JOIN website_classes c ON c.id = si.class_id AND c.website_id = $1
      WHERE st.website_id = $1
        AND (LOWER(st.testimonial_no) LIKE $2 OR LOWER(s.registration_number) LIKE $2)
      ORDER BY st.id DESC
      LIMIT 1
    `, [website.id, qTerm]);

    if (testRes.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No Character Testimonial record found for the provided search query.'
      }, { status: 404 });
    }

    const res_data = { testimonial: testRes.rows[0] };
    return NextResponse.json({
      success: true,
      message: 'Character Testimonial verified successfully.',
      payload: res_data,
      paylod: res_data
    });

  } catch (error) {
    console.error('Error verifying testimonial:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error'
    }, { status: 500 });
  }
}
