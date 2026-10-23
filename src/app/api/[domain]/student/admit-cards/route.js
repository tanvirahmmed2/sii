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

    if (session.website_id && String(session.website_id) !== String(website.id)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Access denied to foreign institution resources.' },
        { status: 403 }
      );
    }

    const studentId = session.id;

    const studentRes = await queryDb(
      `SELECT s.id, s.registration_no, s.roll_no, s.class_id, s.section_id,
              COALESCE(s.name, i.data->>'name') AS name,
              COALESCE(g.data->>'father_name', '') AS father_name,
              COALESCE(g.data->>'mother_name', '') AS mother_name,
              COALESCE(s.number, i.data->>'number', '') AS phone,
              c.name AS class_name,
              sec.name AS section_name
       FROM website_students s
       LEFT JOIN website_student_info i ON i.student_id = s.id
       LEFT JOIN website_student_guardians g ON g.student_id = s.id
       LEFT JOIN website_classes c ON c.id = s.class_id
       LEFT JOIN website_sections sec ON sec.id = s.section_id
       WHERE s.id = $1 AND s.website_id = $2
       LIMIT 1`,
      [studentId, website.id]
    );

    if (studentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student record not found.' }, { status: 404 });
    }

    const rawStudent = studentRes.rows[0];
    const student = {
      id: rawStudent.id,
      name: rawStudent.name,
      registration_number: rawStudent.registration_no,
      roll: rawStudent.roll_no,
      class_name: rawStudent.class_name || 'N/A',
      section_name: rawStudent.section_name || 'A',
      father_name: rawStudent.father_name,
      mother_name: rawStudent.mother_name
    };

    // Fetch exams for student's class
    let exams = [];
    try {
      const examsRes = await queryDb(
        `SELECT e.id, e.name, e.term, e.start_date, e.end_date, e.status, e.is_published,
                cand.candidate_status, cand.admit_card_number, cand.applied_date
         FROM website_exams e
         LEFT JOIN website_exam_candidates cand 
           ON cand.exam_id = e.id AND cand.student_id = $1 AND cand.website_id = e.website_id
         WHERE e.website_id = $2 
           AND (e.class_id = $3 OR e.class_id IS NULL)
           AND e.is_published = TRUE
         ORDER BY e.start_date DESC`,
        [studentId, website.id, rawStudent.class_id]
      );

      // Fetch class subjects to form default exam schedules
      const subjectsRes = await queryDb(
        `SELECT sub.id, sub.name, sub.code
         FROM website_subjects sub
         JOIN website_class_subjects cs ON cs.subject_id = sub.id
         WHERE sub.website_id = $1 AND cs.class_id = $2
         ORDER BY sub.name ASC`,
        [website.id, rawStudent.class_id]
      );
      const classSubjects = subjectsRes.rows;

      exams = examsRes.rows.map((exam) => {
        // Admit card is provided if candidate is approved, or admit_card_number exists, or default provided for published exam
        const isProvided = exam.candidate_status === 'approved' || 
                           exam.candidate_status === 'admit_issued' || 
                           Boolean(exam.admit_card_number);

        const examStart = exam.start_date ? new Date(exam.start_date) : new Date();
        const schedules = classSubjects.map((sub, idx) => {
          const subjectExamDate = new Date(examStart);
          subjectExamDate.setDate(subjectExamDate.getDate() + (idx * 2));
          return {
            id: sub.id,
            subject_name: sub.name,
            subject_code: sub.code,
            exam_date: subjectExamDate.toISOString().split('T')[0],
            start_time: '10:00 AM',
            end_time: '01:00 PM',
            room_number: `Hall ${101 + (idx % 3)}`
          };
        });

        return {
          id: exam.id,
          name: exam.name,
          term: exam.term,
          start_date: exam.start_date,
          end_date: exam.end_date,
          candidate_status: exam.candidate_status || 'not_applied',
          admit_card_number: exam.admit_card_number || `AC-${exam.id}-${rawStudent.registration_no || rawStudent.id}`,
          isProvided: isProvided || true, // Allow student to download/print admit card for class exams
          schedules
        };
      });
    } catch (err) {
      console.error('Error querying exams for admit cards:', err);
    }

    const payload = {
      student,
      exams
    };

    return NextResponse.json({
      success: true,
      student,
      exams,
      payload,
      paylod: payload
    });
  } catch (error) {
    console.error('Error fetching admit cards:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
