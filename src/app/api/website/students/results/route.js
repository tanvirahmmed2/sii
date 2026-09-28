import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// Helper to determine GPA and Letter Grade from Percentage
function calculateGPAAndGrade(percentage) {
  if (percentage >= 80.0) return { gpa: 5.00, grade: 'A+' };
  if (percentage >= 70.0) return { gpa: 4.00, grade: 'A' };
  if (percentage >= 60.0) return { gpa: 3.50, grade: 'A-' };
  if (percentage >= 50.0) return { gpa: 3.00, grade: 'B' };
  if (percentage >= 40.0) return { gpa: 2.00, grade: 'C' };
  return { gpa: 0.00, grade: 'F' };
}

// GET all exams and publication status
export async function GET() {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_722 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_722?.error || res_err_722?.message || 'An error occurred',
        error: res_err_722?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const result = await query(`
      SELECT e.id AS exam_id, e.name, e.term, e.start_date, e.end_date, e.status, 
             COALESCE(rp.is_published, FALSE) AS is_published, rp.published_at
      FROM exams e
      LEFT JOIN result_publish rp ON rp.exam_id = e.id
      ORDER BY e.start_date DESC
    `);

    const res_data_1170 = { exams: result.rows };
      return NextResponse.json({
        success: true,
        message: res_data_1170?.message || 'Successfully fecthed data',
        paylod: res_data_1170
      }, { status: 200 });
  } catch (error) {
    console.error('Error fetching exam publications:', error);
    const res_err_1769 = { error: 'Failed to retrieve exam publications. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_1769?.error || res_err_1769?.message || 'An error occurred',
        error: res_err_1769?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// POST toggle publication status & compile marks
export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_2297 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_2297?.error || res_err_2297?.message || 'An error occurred',
        error: res_err_2297?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { exam_id, is_published } = await request.json();

    if (!exam_id || is_published === undefined) {
      const res_err_2737 = { error: 'Parameters exam_id and is_published are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_2737?.error || res_err_2737?.message || 'An error occurred',
        error: res_err_2737?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    if (is_published) {
      // 1. Compile results: Select distinct students with marks in this exam
      const studentsRes = await query(
        'SELECT DISTINCT student_id FROM marks WHERE exam_id = $1',
        [exam_id]
      );

      const studentIds = studentsRes.rows.map(r => r.student_id);

      // Fetch dynamic grading scale from mark_grades
      const gradesRes = await query('SELECT * FROM mark_grades ORDER BY min_mark DESC');
      const markGrades = gradesRes.rows;

      const getSubjectPointGrade = (percentage) => {
        if (markGrades.length > 0) {
          const matched = markGrades.find(g => percentage >= parseFloat(g.min_mark) && percentage <= parseFloat(g.max_mark));
          if (matched) return { point: parseFloat(matched.point), letter: matched.letter_grade };
        }
        if (percentage >= 80) return { point: 5.00, letter: 'A+' };
        if (percentage >= 70) return { point: 4.00, letter: 'A' };
        if (percentage >= 60) return { point: 3.50, letter: 'A-' };
        if (percentage >= 50) return { point: 3.00, letter: 'B' };
        if (percentage >= 40) return { point: 2.00, letter: 'C' };
        if (percentage >= 33) return { point: 1.00, letter: 'D' };
        return { point: 0.00, letter: 'F' };
      };

      for (const studentId of studentIds) {
        // Fetch all subject marks for this student and exam joined with exam_schedules.full_marks
        const marksRes = await query(`
          SELECT m.marks_obtained, m.total_marks, COALESCE(es.full_marks, m.total_marks, 100.00) AS full_marks
          FROM marks m
          LEFT JOIN exam_schedules es ON es.exam_id = m.exam_id AND es.subject_id = m.subject_id
          WHERE m.student_id = $1 AND m.exam_id = $2
        `, [studentId, exam_id]);

        let totalObtained = 0.00;
        let totalMax = 0.00;
        let sumGradePoints = 0.00;
        let subjectCount = 0;
        let hasFailedSubject = false;

        for (const mark of marksRes.rows) {
          const obtained = parseFloat(mark.marks_obtained || 0);
          const fullM = parseFloat(mark.full_marks || mark.total_marks || 100);
          const pct = fullM > 0 ? (obtained / fullM) * 100 : 0;
          const { point, letter } = getSubjectPointGrade(pct);

          totalObtained += obtained;
          totalMax += fullM;
          sumGradePoints += point;
          subjectCount += 1;

          if (point === 0.00 || letter === 'F') {
            hasFailedSubject = true;
          }
        }

        let overallGPA = 0.00;
        let overallGrade = 'F';
        let status = 'Fail';

        if (subjectCount > 0) {
          if (hasFailedSubject) {
            overallGPA = 0.00;
            overallGrade = 'F';
            status = 'Fail';
          } else {
            overallGPA = parseFloat((sumGradePoints / subjectCount).toFixed(2));
            if (overallGPA >= 5.00) overallGrade = 'A+';
            else if (overallGPA >= 4.00) overallGrade = 'A';
            else if (overallGPA >= 3.50) overallGrade = 'A-';
            else if (overallGPA >= 3.00) overallGrade = 'B';
            else if (overallGPA >= 2.00) overallGrade = 'C';
            else overallGrade = 'F';

            status = overallGPA >= 2.00 ? 'Pass' : 'Fail';
          }
        }

        // Upsert summary inside results table
        await query(
          `INSERT INTO results (student_id, exam_id, gpa, grade, total_marks, status)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (student_id, exam_id)
           DO UPDATE SET gpa = EXCLUDED.gpa,
                         grade = EXCLUDED.grade,
                         total_marks = EXCLUDED.total_marks,
                         status = EXCLUDED.status,
                         updated_at = CURRENT_TIMESTAMP`,
          [studentId, exam_id, overallGPA, overallGrade, totalObtained, status]
        );
      }
    }

    // 2. Upsert the publish record
    const publishedAt = is_published ? new Date() : null;
    await query(
      `INSERT INTO result_publish (exam_id, is_published, published_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (exam_id)
       DO UPDATE SET is_published = EXCLUDED.is_published,
                     published_at = EXCLUDED.published_at,
                     updated_at = CURRENT_TIMESTAMP`,
      [exam_id, is_published, publishedAt]
    );

    // Auto-create notice when published
    if (is_published) {
      try {
        const examInfo = await query('SELECT name FROM exams WHERE id = $1', [exam_id]);
        const examName = examInfo.rows[0]?.name || `Exam #${exam_id}`;
        await query(
          `INSERT INTO notices (title, link, is_pinned) 
           VALUES ($1, '/student/results', FALSE)`,
          [`Exam Results Published: ${examName}`]
        );
      } catch (noticeErr) {
        console.error('Failed to auto-create notice for result publication:', noticeErr);
      }
    }

    const res_data_5000 = {
      message: is_published 
        ? 'Results compiled, graded, and published successfully.' 
        : 'Results unpublished successfully.'
    };
      return NextResponse.json({
        success: true,
        message: res_data_5000?.message || 'Successfully fecthed data',
        paylod: res_data_5000
      }, { status: 200 });
  } catch (error) {
    console.error('Error handling exam results compilation/publication:', error);
    const res_err_6441 = { error: 'Failed to process compilation or publication toggles. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_6441?.error || res_err_6441?.message || 'An error occurred',
        error: res_err_6441?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
