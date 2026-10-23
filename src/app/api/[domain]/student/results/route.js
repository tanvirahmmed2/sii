import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStudentSession } from 'src/lib/middleware/students.js';

export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const session = await getStudentSession(request);
    if (!session || !session.isActive || !session.isVerified) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Active verified student session required.' },
        { status: 401 }
      );
    }

    const studentId = session.id;

    // Fetch student's class
    const studentRes = await queryDb(
      `SELECT s.id, s.class_id, s.section_id, s.session_id, s.roll_no, s.registration_no,
              COALESCE(s.name, i.data->>'name') AS student_name,
              COALESCE(s.name, i.data->>'name') AS name,
              COALESCE(g.data->>'father_name', '') AS father_name,
              COALESCE(g.data->>'mother_name', '') AS mother_name,
              c.name AS class_name, ses.name AS session_name, sec.name AS section_name
       FROM website_students s
       LEFT JOIN website_student_info i ON i.student_id = s.id
       LEFT JOIN website_student_guardians g ON g.student_id = s.id
       LEFT JOIN website_classes c ON c.id = s.class_id
       LEFT JOIN website_sections sec ON sec.id = s.section_id
       LEFT JOIN website_sessions ses ON ses.id = s.session_id
       WHERE s.id = $1 AND s.website_id = $2
       LIMIT 1`,
      [studentId, website.id]
    );

    if (studentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student not found.' }, { status: 404 });
    }

    const student = {
      ...studentRes.rows[0],
      roll: studentRes.rows[0].roll_no,
      registration_number: studentRes.rows[0].registration_no
    };

    // 1. Fetch Exam Results
    let results = [];
    try {
      const resultsRes = await queryDb(
        `SELECT r.id, r.exam_id, r.total_marks, r.obtained_marks, r.gpa, r.grade_name,
                r.grade_name AS grade,
                r.merit_rank, r.result_status, r.published_at, r.remarks,
                e.name AS exam_name, e.term AS exam_term,
                c.name AS class_name, ses.name AS session_name
         FROM website_student_exam_results r
         JOIN website_exams e ON e.id = r.exam_id
         LEFT JOIN website_classes c ON c.id = r.class_id
         LEFT JOIN website_sessions ses ON ses.id = r.session_id
         WHERE r.website_id = $1 AND r.student_id = $2 AND r.is_published = TRUE
         ORDER BY e.start_date DESC`,
        [website.id, studentId]
      );
      results = resultsRes.rows;
    } catch {}

    // 2. Fetch Detailed Subject Marks
    let marks = [];
    try {
      const marksRes = await queryDb(
        `SELECT m.id, m.exam_id, m.subject_id, m.marks_obtained, m.full_marks, m.pass_marks,
                m.full_marks AS total_marks,
                m.grade_name, m.grade_name AS grade, m.grade_name AS letter_grade,
                m.grade_point, m.is_absent, m.remarks,
                sub.name AS subject_name, sub.code AS subject_code
         FROM website_student_exam_marks m
         JOIN website_subjects sub ON sub.id = m.subject_id
         WHERE m.website_id = $1 AND m.student_id = $2
         ORDER BY sub.name ASC`,
        [website.id, studentId]
      );
      marks = marksRes.rows;
    } catch {}

    // 3. If no official exam results yet, also look up published exams for this class
    if (results.length === 0) {
      const fallbackExamsRes = await queryDb(
        `SELECT e.id AS exam_id, e.name AS exam_name, e.term AS exam_term,
                c.name AS class_name, ses.name AS session_name,
                0.00 AS total_marks, 0.00 AS obtained_marks, 0.00 AS gpa,
                'Pending' AS grade_name, NULL AS merit_rank, 'published' AS result_status
         FROM website_exams e
         LEFT JOIN website_classes c ON c.id = e.class_id
         LEFT JOIN website_sessions ses ON ses.id = e.session_id
         WHERE e.website_id = $1 AND e.class_id = $2 AND e.is_published = TRUE
         ORDER BY e.start_date DESC
         LIMIT 5`,
        [website.id, student.class_id || 0]
      );
      results = fallbackExamsRes.rows;
    }

    const payload = {
      student,
      results,
      marks
    };

    return NextResponse.json({
      success: true,
      student,
      results,
      marks,
      payload,
      paylod: payload
    });
  } catch (error) {
    console.error('Error fetching student results:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
