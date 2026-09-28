import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isTeacher } from '@/lib/auth';

export async function POST(request) {
  try {
    const authenticated = (await isAdmin()) || (await isTeacher());
    if (!authenticated) {
      const res_err = { error: 'Unauthorized. Admins/Teachers only.' };
      return NextResponse.json({
        success: false,
        message: res_err.error,
        error: res_err.error,
        paylod: null
      }, { status: 403 });
    }

    const { class_id, section_id, date, subject_id, period_id, records } = await request.json();

    if (!class_id || !date || !subject_id || !period_id || !records || !Array.isArray(records)) {
      const res_err_2869 = { error: 'Class, Date, Subject, Period, and records array are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_2869?.error || res_err_2869?.message || 'An error occurred',
        error: res_err_2869?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Fetch registered students in this class and section
    const studentsResult = await query(
      `SELECT id, registration_number, name 
       FROM students 
       WHERE class_id = $1
       ${section_id ? 'AND section_id = $2' : ''}
       AND is_registered = TRUE`,
      section_id ? [class_id, section_id] : [class_id]
    );

    const studentMap = {};
    for (const student of studentsResult.rows) {
      if (student.registration_number) {
        const regNorm = student.registration_number.trim().toLowerCase();
        studentMap[regNorm] = {
          id: student.id,
          name: student.name
        };
      }
    }

    const warnings = [];
    const savedRecords = [];

    // Process records in sequence
    for (const rec of records) {
      if (!rec.registration_number) continue;

      const regNorm = String(rec.registration_number).trim().toLowerCase();
      const student = studentMap[regNorm];

      if (!student) {
        warnings.push(`Registration number "${rec.registration_number}" not found in the selected class and section.`);
        continue;
      }

      // Map status values: P/1: Present, A/0: Absent, L: Late, V/On Leave: On Leave
      let statusStr = 'Present';
      const s = String(rec.status).trim().toLowerCase();
      if (s === '0' || s === 'absent' || s === 'a') {
        statusStr = 'Absent';
      } else if (s === '1' || s === 'present' || s === 'p') {
        statusStr = 'Present';
      } else if (s === 'late' || s === 'l') {
        statusStr = 'Late';
      } else if (s === 'v' || s === 'leave' || s === 'on leave' || s === 'on_leave') {
        statusStr = 'On Leave';
      }

      // Upsert record into student_attendances
      await query(
        `INSERT INTO student_attendances (student_id, class_id, subject_id, period_id, date, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (student_id, date, subject_id, period_id)
         DO UPDATE SET 
           status = EXCLUDED.status, 
           updated_at = CURRENT_TIMESTAMP`,
        [
          student.id,
          class_id,
          subject_id,
          period_id,
          date,
          statusStr
        ]
      );

      savedRecords.push({
        registration_number: rec.registration_number,
        student_name: student.name,
        status: statusStr
      });
    }

    const res_data = {
      message: 'Student attendance logs imported successfully.',
      successCount: savedRecords.length,
      warningCount: warnings.length,
      warnings,
      savedRecords
    };

    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 200 });

  } catch (error) {
    console.error('Error importing student attendance logs:', error);
    const res_err = { error: 'Failed to import attendance logs. Internal server error.' };
    return NextResponse.json({
      success: false,
      message: res_err.error,
      error: res_err.error,
      paylod: null
    }, { status: 500 });
  }
}
