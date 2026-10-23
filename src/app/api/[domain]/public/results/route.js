import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

/**
 * GET /api/[domain]/public/results
 * Public lookup for academic examination results and published exams list.
 * Query parameters:
 *  - reg_no (required for individual student lookup)
 *  - exam_id (optional, filters by specific exam)
 */
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const regNo = searchParams.get('reg_no')?.trim();
    const examIdParam = searchParams.get('exam_id')?.trim();
    const examId = examIdParam ? parseInt(examIdParam, 10) : null;

    // 1. Fetch published exams for dropdown selection
    const publishedExamsRes = await queryDb(`
      SELECT e.id, e.name, e.term, e.start_date, e.end_date,
             c.name AS class_name, ses.name AS session_name
      FROM website_exams e
      LEFT JOIN website_classes c ON c.id = e.class_id
      LEFT JOIN website_sessions ses ON ses.id = e.session_id
      WHERE e.website_id = $1 AND e.is_published = TRUE
      ORDER BY e.start_date DESC, e.id DESC
      LIMIT 20
    `, [website.id]);

    const publishedExams = publishedExamsRes.rows;

    // If no registration number provided, just return published exams list
    if (!regNo) {
      return NextResponse.json({
        success: true,
        paylod: {
          publishedExams,
          student: null,
          selectedResult: null,
          allResults: []
        },
        payload: {
          publishedExams,
          student: null,
          selectedResult: null,
          allResults: []
        }
      });
    }

    // 2. Lookup student by registration_no or roll_no
    const studentRes = await queryDb(`
      SELECT s.id, s.class_id, s.section_id, s.session_id, s.roll_no, s.registration_no,
             s.email,
             COALESCE(s.name, inf.data->>'name') AS name,
             COALESCE(s.gender, inf.data->>'gender') AS gender,
             COALESCE(s.blood_group, inf.data->>'blood_group') AS blood_group,
             s.date_of_birth,
             c.name AS class_name, sec.name AS section_name, ses.name AS session_name,
             g.data->>'father_name' AS father_name,
             g.data->>'mother_name' AS mother_name,
             g.data->>'guardian_name' AS guardian_name,
             inf.data AS info_data,
             g.data AS guardian_data,
             pic.image_url AS photo_url
      FROM website_students s
      LEFT JOIN website_student_info inf ON inf.student_id = s.id
      LEFT JOIN website_classes c ON c.id = s.class_id
      LEFT JOIN website_sections sec ON sec.id = s.section_id
      LEFT JOIN website_sessions ses ON ses.id = s.session_id
      LEFT JOIN website_student_guardians g ON g.student_id = s.id
      LEFT JOIN website_student_pictures pic ON pic.student_id = s.id AND pic.is_primary = TRUE
      WHERE s.website_id = $1 AND (
        s.registration_no ILIKE $2 OR s.roll_no = $2
      )
      LIMIT 1
    `, [website.id, regNo]);

    if (studentRes.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No student record found matching registration or roll number '${regNo}'.`
      }, { status: 404 });
    }

    const studentRow = studentRes.rows[0];
    const student = {
      ...studentRow,
      ...(studentRow.info_data || {}),
      ...(studentRow.guardian_data || {}),
      roll: studentRow.roll_no,
      registration_number: studentRow.registration_no,
      name: studentRow.name || `Student ${studentRow.registration_no}`
    };

    // 3. Fetch exam results for this student
    let resultsQuery = `
      SELECT r.id, r.exam_id, r.total_marks, r.obtained_marks, r.gpa, r.grade_name,
             r.grade_name AS grade, r.merit_rank, r.result_status, r.result_status AS status,
             r.published_at, r.remarks,
             e.name AS exam_name, e.name, e.term AS exam_term, e.term,
             c.name AS class_name, ses.name AS session_name
      FROM website_student_exam_results r
      JOIN website_exams e ON e.id = r.exam_id
      LEFT JOIN website_classes c ON c.id = r.class_id
      LEFT JOIN website_sessions ses ON ses.id = r.session_id
      WHERE r.website_id = $1 AND r.student_id = $2 AND r.is_published = TRUE
    `;
    const resultsParams = [website.id, student.id];

    if (examId) {
      resultsQuery += ` AND r.exam_id = $3`;
      resultsParams.push(examId);
    }

    resultsQuery += ` ORDER BY e.start_date DESC, r.id DESC`;

    const resultsRes = await queryDb(resultsQuery, resultsParams);
    const allResults = resultsRes.rows;

    let selectedResultRecord = null;
    let selectedExamMarks = [];

    if (allResults.length > 0) {
      selectedResultRecord = allResults[0];

      // 4. Fetch subject breakdown marks for selected exam
      const marksRes = await queryDb(`
        SELECT m.id, m.exam_id, m.subject_id, m.marks_obtained, m.full_marks, m.pass_marks,
               m.full_marks AS total_marks,
               m.grade_name, m.grade_name AS letter_grade, m.grade_name AS grade,
               m.grade_point, m.is_absent, m.remarks,
               sub.name AS subject_name, sub.code AS subject_code
        FROM website_student_exam_marks m
        JOIN website_subjects sub ON sub.id = m.subject_id
        WHERE m.website_id = $1 AND m.student_id = $2 AND m.exam_id = $3
        ORDER BY sub.name ASC, m.id ASC
      `, [website.id, student.id, selectedResultRecord.exam_id]);

      selectedExamMarks = marksRes.rows;
    }

    const selectedResult = selectedResultRecord ? {
      exam: {
        id: selectedResultRecord.exam_id,
        name: selectedResultRecord.exam_name || selectedResultRecord.name,
        term: selectedResultRecord.exam_term || selectedResultRecord.term
      },
      result: selectedResultRecord,
      marks: selectedExamMarks
    } : null;

    const payload = {
      student,
      publishedExams,
      selectedResult,
      allResults
    };

    return NextResponse.json({
      success: true,
      paylod: payload,
      payload
    });
  } catch (error) {
    console.error('Error in GET /public/results:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
