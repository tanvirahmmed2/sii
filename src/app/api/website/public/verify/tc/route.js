import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
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
             s.id AS student_id, s.name AS student_name, s.registration_number, s.roll,
             s.father_name, s.mother_name, s.date_of_birth
      FROM student_transfer_certificates stc
      JOIN students s ON s.id = stc.student_id
      WHERE LOWER(stc.tc_number) LIKE $1
         OR LOWER(s.registration_number) LIKE $1
      ORDER BY stc.id DESC
      LIMIT 1
    `, [qTerm]);

    if (tcRes.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid Transfer Certificate found for the provided search query.'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Transfer Certificate verified successfully.',
      paylod: {
        certificate: tcRes.rows[0]
      }
    });

  } catch (error) {
    console.error('Error verifying transfer certificate:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error'
    }, { status: 500 });
  }
}
