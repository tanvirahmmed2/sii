import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const regNo = searchParams.get('reg_no');
    const examId = searchParams.get('exam_id');

    if (!regNo) {
      const allPublishedExamsRes = await query(`
        SELECT e.id, e.name, e.term, c.name AS class_name, rp.published_at
        FROM exams e
        JOIN result_publish rp ON rp.exam_id = e.id
        JOIN classes c ON c.id = e.class_id
        WHERE rp.is_published = TRUE
        ORDER BY e.start_date DESC
      `);
      return NextResponse.json({
        success: true,
        message: 'Fetched published exams list',
        paylod: {
          publishedExams: allPublishedExamsRes.rows
        }
      }, { status: 200 });
    }

    // 1. Find Student by registration number
    const studentRes = await query(`
      SELECT s.id, s.name, s.father_name, s.mother_name, s.parents_info, s.registration_number, s.roll, s.class_id, s.section_id,
             c.name AS class_name, sec.name AS section_name
      FROM students s
      JOIN classes c ON c.id = s.class_id
      LEFT JOIN sections sec ON sec.id = s.section_id
      WHERE LOWER(s.registration_number) = LOWER($1) AND s.is_active = TRUE
    `, [regNo.trim()]);

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
      FROM exams e
      JOIN result_publish rp ON rp.exam_id = e.id
      WHERE e.class_id = $1 AND rp.is_published = TRUE
      ORDER BY e.start_date DESC
    `, [student.class_id]);

    const publishedExams = examsRes.rows;
    let selectedResult = null;

    // 3. If an exam_id is specified or if published exams exist, load result details
    const targetExamId = examId || (publishedExams.length > 0 ? publishedExams[0].id : null);

    if (targetExamId) {
      const selectedExam = publishedExams.find(e => String(e.id) === String(targetExamId)) || null;

      // Query compiled result summary
      const resultRes = await query(`
        SELECT * FROM results
        WHERE student_id = $1 AND exam_id = $2
      `, [student.id, targetExamId]);

      // Calculate merit rank across all compiled results for this exam
      const allExamResultsRes = await query(`
        SELECT r.student_id, r.gpa, r.total_marks, r.status, r.grade
        FROM results r
        WHERE r.exam_id = $1
        ORDER BY r.gpa DESC, r.total_marks DESC
      `, [targetExamId]);

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
        FROM marks m
        JOIN subjects sub ON sub.id = m.subject_id
        WHERE m.student_id = $1 AND m.exam_id = $2
        ORDER BY sub.name ASC
      `, [student.id, targetExamId]);

      // Query dynamic grading scale from mark_grades
      const gradesRes = await query('SELECT * FROM mark_grades ORDER BY min_mark DESC');
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

    return NextResponse.json({
      success: true,
      message: 'Fetched public student results successfully',
      paylod: {
        student,
        publishedExams,
        selectedResult
      }
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
