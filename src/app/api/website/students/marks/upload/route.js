import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isTeacher } from '@/lib/auth';

export async function POST(request) {
  try {
    const authenticated = (await isAdmin()) || (await isTeacher());
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins and Teachers only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 403 });
    }

    const body = await request.json();
    const { records } = body; // Array: [{ subject_code, registration_number, mark, exam_id }]

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Invalid request payload. An array of spreadsheet records is required.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    let successCount = 0;
    const warnings = [];
    const savedRecords = [];

    // Pre-fetch subjects map by code for quick lookup
    const subjectsRes = await query('SELECT id, name, code FROM subjects');
    const subjectMapByCode = new Map();
    for (const sub of subjectsRes.rows) {
      if (sub.code) {
        subjectMapByCode.set(String(sub.code).trim().toLowerCase(), sub);
      }
    }

    // Pre-fetch students map by registration_number for quick lookup
    const studentsRes = await query('SELECT id, name, registration_number FROM students');
    const studentMapByReg = new Map();
    for (const st of studentsRes.rows) {
      if (st.registration_number) {
        studentMapByReg.set(String(st.registration_number).trim().toLowerCase(), st);
      }
    }

    // Pre-fetch exams map by id
    const examsRes = await query('SELECT id, name FROM exams');
    const examMapById = new Map();
    for (const ex of examsRes.rows) {
      examMapById.set(String(ex.id), ex);
    }

    for (let index = 0; index < records.length; index++) {
      const row = records[index];
      const rowNum = index + 1;

      const rawSubCode = row.subject_code ? String(row.subject_code).trim() : '';
      const rawRegNum = row.registration_number ? String(row.registration_number).trim() : '';
      const rawMark = row.mark !== undefined && row.mark !== null ? String(row.mark).trim() : '';
      const rawExamId = row.exam_id ? String(row.exam_id).trim() : '';

      if (!rawSubCode || !rawRegNum || rawMark === '' || !rawExamId) {
        warnings.push(`Row ${rowNum}: Incomplete entry (missing subject_code, registration_number, mark, or exam_id).`);
        continue;
      }

      // Check subject
      const subject = subjectMapByCode.get(rawSubCode.toLowerCase());
      if (!subject) {
        warnings.push(`Row ${rowNum}: Subject code "${rawSubCode}" not found in database.`);
        continue;
      }

      // Check student
      const student = studentMapByReg.get(rawRegNum.toLowerCase());
      if (!student) {
        warnings.push(`Row ${rowNum}: Student registration number "${rawRegNum}" not found in database.`);
        continue;
      }

      // Check exam
      const exam = examMapById.get(rawExamId);
      if (!exam) {
        warnings.push(`Row ${rowNum}: Exam ID "${rawExamId}" not found in database.`);
        continue;
      }

      const markObtained = parseFloat(rawMark);
      if (isNaN(markObtained) || markObtained < 0) {
        warnings.push(`Row ${rowNum}: Invalid mark value "${rawMark}". Must be a non-negative number.`);
        continue;
      }

      // Upsert into marks table
      await query(
        `INSERT INTO marks (student_id, exam_id, subject_id, marks_obtained, total_marks)
         VALUES ($1, $2, $3, $4, 100.00)
         ON CONFLICT (student_id, exam_id, subject_id)
         DO UPDATE SET marks_obtained = EXCLUDED.marks_obtained,
                       updated_at = CURRENT_TIMESTAMP`,
        [student.id, exam.id, subject.id, markObtained]
      );

      successCount++;
      savedRecords.push({
        student_name: student.name,
        registration_number: student.registration_number,
        subject_code: subject.code,
        subject_name: subject.name,
        exam_name: exam.name,
        marks_obtained: markObtained
      });
    }

    const summaryPayload = {
      successCount,
      warningCount: warnings.length,
      warnings,
      savedRecords
    };

    return NextResponse.json({
      success: true,
      message: `Processed ${records.length} records: ${successCount} saved, ${warnings.length} warnings.`,
      paylod: summaryPayload
    }, { status: 200 });

  } catch (error) {
    console.error('Error processing spreadsheet marks upload:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to process spreadsheet marks upload.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
