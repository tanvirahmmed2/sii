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
    const searchQuery = searchParams.get('q') || searchParams.get('tc_number') || searchParams.get('reg_no') || '';

    if (!searchQuery.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Please enter a Transfer Certificate (TC) Number or Registration Number.'
      }, { status: 400 });
    }

    const qTerm = `%${searchQuery.trim().toLowerCase()}%`;

    const tcRes = await query(`
      SELECT stc.id, stc.tc_number, stc.issue_date, stc.reason_for_leaving, stc.destination_school,
             stc.conduct, stc.last_class_attended, stc.promoted_to_class, stc.remarks,
             s.id AS student_id, s.name AS student_name, s.registration_number,
             si.roll, si.father_name, si.mother_name, si.date_of_birth
      FROM website_student_transfer_certificates stc
      JOIN website_students s ON s.id = stc.student_id AND s.website_id = $1
      LEFT JOIN website_student_information si ON si.student_id = s.id AND si.website_id = $1
      WHERE stc.website_id = $1
        AND (LOWER(stc.tc_number) LIKE $2 OR LOWER(s.registration_number) LIKE $2)
      ORDER BY stc.id DESC
      LIMIT 1
    `, [website.id, qTerm]);

    if (tcRes.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid Transfer Certificate found for the provided search query.'
      }, { status: 404 });
    }

    const res_data = { certificate: tcRes.rows[0] };
    return NextResponse.json({
      success: true,
      message: 'Transfer Certificate verified successfully.',
      payload: res_data,
      paylod: res_data
    });

  } catch (error) {
    console.error('Error verifying transfer certificate:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error'
    }, { status: 500 });
  }
}
