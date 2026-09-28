import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isTeacher } from '@/lib/auth';

// GET student attendance sheets (Admin/Teachers)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id');
    const sectionId = searchParams.get('section_id');
    const date = searchParams.get('date');
    const subjectId = searchParams.get('subject_id');
    const periodId = searchParams.get('period_id');

    if (!classId || !sectionId || !date || !subjectId || !periodId) {
      const res_err_478 = { error: 'Class ID, Section ID, Date (YYYY-MM-DD), Subject ID, and Period ID are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_478?.error || res_err_478?.message || 'An error occurred',
        error: res_err_478?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    const sql = `
      SELECT 
        s.id AS student_id,
        s.name AS student_name,
        s.registration_number,
        sa.id AS attendance_id,
        COALESCE(sa.status, 'Present') AS status,
        sa.remarks,
        sa.date
      FROM students s
      LEFT JOIN student_attendances sa ON s.id = sa.student_id 
        AND sa.date = $3 
        AND sa.subject_id = $4 
        AND sa.period_id = $5
      WHERE s.class_id = $1 
        AND s.section_id = $2
        AND s.is_registered = TRUE
      ORDER BY s.registration_number ASC
    `;

    const result = await query(sql, [classId, sectionId, date, subjectId, periodId]);
    const res_data_1197 = { attendanceSheet: result.rows };
    return NextResponse.json({
      success: true,
      message: res_data_1197?.message || 'Successfully fetched data',
      paylod: res_data_1197
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student attendance sheet:', error);
    const res_err_1813 = { error: 'Failed to retrieve attendance logs. Internal server error.' };
    return NextResponse.json({
      success: false,
      message: res_err_1813?.error || res_err_1813?.message || 'An error occurred',
      error: res_err_1813?.error || 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// POST bulk log student attendance (Admin/Teachers only)
export async function POST(request) {
  try {
    const authenticated = (await isAdmin()) || (await isTeacher());
    if (!authenticated) {
      const res_err_2372 = { error: 'Unauthorized. Admins/Teachers only.' };
      return NextResponse.json({
        success: false,
        message: res_err_2372?.error || res_err_2372?.message || 'An error occurred',
        error: res_err_2372?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { class_id, section_id, date, subject_id, period_id, records } = await request.json();

    if (!class_id || !section_id || !date || !subject_id || !period_id || !records || !Array.isArray(records)) {
      const res_err_2869 = { error: 'Class, Section, Date, Subject, Period, and records array are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_2869?.error || res_err_2869?.message || 'An error occurred',
        error: res_err_2869?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Process each student record inside database transactions or sequential loops
    for (const rec of records) {
      const { student_id, status, remarks } = rec;
      if (!student_id || !status) continue;

      await query(
        `INSERT INTO student_attendances (student_id, class_id, subject_id, period_id, date, status, remarks)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (student_id, date, subject_id, period_id)
         DO UPDATE SET 
           status = EXCLUDED.status, 
           remarks = EXCLUDED.remarks, 
           updated_at = CURRENT_TIMESTAMP`,
        [
          student_id,
          class_id,
          subject_id,
          period_id,
          date,
          status,
          remarks || null
        ]
      );
    }

    const res_data_2937 = {
      message: 'Student attendance logs saved successfully.'
    };
    return NextResponse.json({
      success: true,
      message: res_data_2937?.message || 'Successfully fetched data',
      paylod: res_data_2937
    }, { status: 200 });
  } catch (error) {
    console.error('Error saving student attendance logs:', error);
    const res_err_4282 = { error: 'Failed to save attendance logs. Internal server error.' };
    return NextResponse.json({
      success: false,
      message: res_err_4282?.error || res_err_4282?.message || 'An error occurred',
      error: res_err_4282?.error || 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
