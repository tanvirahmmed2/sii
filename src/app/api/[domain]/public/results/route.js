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
    const regNo = searchParams.get('reg_no');
    const examId = searchParams.get('exam_id');

    if (!regNo) {
      const allPublishedExamsRes = await query(`
        SELECT e.id, e.name, e.term, c.name AS class_name, rp.published_at
        FROM website_exams e
        JOIN website_result_publish rp ON rp.exam_id = e.id AND rp.website_id = $1
        JOIN website_classes c ON c.id = e.class_id AND c.website_id = $1
        WHERE e.website_id = $1 AND rp.is_published = TRUE
        ORDER BY e.start_date DESC
      `, [website.id]);

      const res_data = { publishedExams: allPublishedExamsRes.rows };
      return NextResponse.json({
        success: true,
        message: 'Fetched published exams list',
        payload: res_data,
        paylod: res_data
      }, { status: 200 });
    }

    // 1. Find Student by registration number
    const studentRes = await query(`
      SELECT s.id, s.name, s.registration_number, s.image,
             si.father_name, si.mother_name, si.parents_info, si.roll, si.class_id, si.section_id,
             c.name AS class_name, sec.name AS section_name
      FROM website_students s
      LEFT JOIN website_student_information si ON si.student_id = s.id AND si.website_id = $1
      LEFT JOIN website_classes c ON c.id = si.class_id AND c.website_id = $1
      LEFT JOIN website_sections sec ON sec.id = si.section_id AND sec.website_id = $1
      WHERE s.website_id = $1 AND LOWER(s.registration_number) = LOWER($2) AND s.is_active = TRUE
    `, [website.id, regNo.trim()]);

    if (studentRes.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Student with this registration number not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    const student = studentRes.rows[0];

    // 2. Fetch list of published exams for this student's class
    const examsRes = await query(`
      SELECT e.id, e.name, e.term, e.start_date, e.end_date, rp.published_at
      FROM website_exams e
      JOIN website_result_publish rp ON rp.exam_id = e.id AND rp.website_id = $1
      WHERE e.website_id = $1 AND e.class_id = $2 AND rp.is_published = TRUE
      ORDER BY e.start_date DESC
    `, [website.id, student.class_id]);

    const publishedExams = examsRes.rows;
    let selectedResult = null;

    // 3. If an exam_id is specified or if published exams exist, load result details
    const targetExamId = examId || (publishedExams.length > 0 ? publishedExams[0].id : null);

    if (targetExamId) {
      const selectedExam = publishedExams.find(e => String(e.id) === String(targetExamId)) || null;

      // Query compiled result summary
      const resultRes = await query(`
        SELECT * FROM website_results
        WHERE website_id = $1 AND student_id = $2 AND exam_id = $3
      `, [website.id, student.id, targetExamId]);

      // Calculate merit rank across all compiled results for this exam
      const allExamResultsRes = await query(`
        SELECT r.student_id, r.gpa, r.total_marks, r.status, r.grade
        FROM website_results r
        WHERE r.website_id = $1 AND r.exam_id = $2
        ORDER BY r.gpa DESC, r.total_marks DESC
      `, [website.id, targetExamId]);

      let rankCounter = 1;
      let meritRank = null;

      allExamResultsRes.rows.forEach(r => {
        if (r.status === 'Pass' && r.grade !== 'F') {
          if (r.student_id === student.id) {
            meritRank = rankCounter;
          }
          rankCounter++;
        }
      });

      const resultObj = resultRes.rows[0] ? {
        ...resultRes.rows[0],
        merit_rank: meritRank
      } : null;

      // Query subject marks
      const marksRes = await query(`
        SELECT m.id, m.subject_id, m.marks_obtained, m.total_marks, m.remarks,
               sub.name AS subject_name, sub.code AS subject_code
        FROM website_marks m
        JOIN website_subjects sub ON sub.id = m.subject_id AND sub.website_id = $1
        WHERE m.website_id = $1 AND m.student_id = $2 AND m.exam_id = $3
        ORDER BY sub.name ASC
      `, [website.id, student.id, targetExamId]);

      // Query dynamic grading scale from website_mark_grades
      const gradesRes = await query(
        'SELECT * FROM website_mark_grades WHERE website_id = $1 ORDER BY min_mark DESC',
        [website.id]
      );
      const markGrades = gradesRes.rows;

      const marksWithGrades = marksRes.rows.map(m => {
        const obtained = parseFloat(m.marks_obtained || 0);
        const max = parseFloat(m.total_marks || 100);
        const pct = max > 0 ? (obtained / max) * 100 : 0;

        let letter = 'F';
        let point = 0.00;

        if (markGrades.length > 0) {
          const matched = markGrades.find(g => pct >= parseFloat(g.min_mark) && pct <= parseFloat(g.max_mark));
          if (matched) {
            letter = matched.letter_grade;
            point = parseFloat(matched.point);
          }
        } else {
          if (pct >= 80) { letter = 'A+'; point = 5.00; }
          else if (pct >= 70) { letter = 'A'; point = 4.00; }
          else if (pct >= 60) { letter = 'A-'; point = 3.50; }
          else if (pct >= 50) { letter = 'B'; point = 3.00; }
          else if (pct >= 40) { letter = 'C'; point = 2.00; }
          else { letter = 'F'; point = 0.00; }
        }

        return {
          ...m,
          letter_grade: letter,
          point
        };
      });

      selectedResult = {
        exam: selectedExam,
        result: resultObj,
        marks: marksWithGrades
      };
    }

    const res_data = {
      student,
      publishedExams,
      selectedResult
    };

    return NextResponse.json({
      success: true,
      message: 'Fetched public student results successfully',
      payload: res_data,
      paylod: res_data
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching public student results:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
