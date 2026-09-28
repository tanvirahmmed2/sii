import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

export async function GET(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_244 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_244?.error || res_err_244?.message || 'An error occurred',
        error: res_err_244?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const examId = searchParams.get('exam_id');

    if (!studentId || !examId) {
      const res_err_756 = { error: 'Parameters student_id and exam_id are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_756?.error || res_err_756?.message || 'An error occurred',
        error: res_err_756?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // 1. Fetch student info
    const studentRes = await query(
      `SELECT s.id, s.name, s.registration_number, s.date_of_birth,
              c.name AS class_name, sec.name AS section_name
       FROM students s
       JOIN classes c ON c.id = s.class_id
       LEFT JOIN sections sec ON sec.id = s.section_id
       WHERE s.id = $1`,
      [studentId]
    );

    if (studentRes.rows.length === 0) {
      const res_err_1508 = { error: 'Student profile not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_1508?.error || res_err_1508?.message || 'An error occurred',
        error: res_err_1508?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const student = studentRes.rows[0];

    // 2. Fetch overall result details
    const resultRes = await query(
      `SELECT gpa, grade, total_marks, status 
       FROM results 
       WHERE student_id = $1 AND exam_id = $2`,
      [studentId, examId]
    );

    const overallResult = resultRes.rows[0] || { gpa: 0.00, grade: 'Pending', total_marks: 0.00, status: 'Unpublished' };

    // 3. Fetch subject-wise score list
    const marksRes = await query(
      `SELECT sub.name AS subject_name, sub.code AS subject_code,
              m.marks_obtained, m.total_marks, m.remarks
       FROM marks m
       JOIN subjects sub ON sub.id = m.subject_id
       WHERE m.student_id = $1 AND m.exam_id = $2
       ORDER BY sub.name ASC`,
      [studentId, examId]
    );

    // 4. Log generation inside transcripts table
    await query(
      `INSERT INTO transcripts (student_id, exam_id, gpa, remarks)
       VALUES ($1, $2, $3, $4)`,
      [
        studentId,
        examId,
        parseFloat(overallResult.gpa),
        `Admin generated transcript card for ${student.name}.`
      ]
    );

    const res_data_2287 = {
      student,
      overallResult,
      subjectMarks: marksRes.rows
    };
      return NextResponse.json({
        success: true,
        message: res_data_2287?.message || 'Successfully fecthed data',
        paylod: res_data_2287
      }, { status: 200 });
  } catch (error) {
    console.error('Error compiling transcript card:', error);
    const res_err_3400 = { error: 'Failed to retrieve transcript details. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_3400?.error || res_err_3400?.message || 'An error occurred',
        error: res_err_3400?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
