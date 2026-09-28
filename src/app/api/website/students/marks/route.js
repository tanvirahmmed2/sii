import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isTeacher } from '@/lib/auth';

// GET student marks for entry screen
export async function GET(request) {
  try {
    const authenticated = (await isAdmin()) || (await isTeacher());
    if (!authenticated) {
      const res_err_318 = { error: 'Unauthorized. Admins/Teachers only.' };
      return NextResponse.json({
        success: false,
        message: res_err_318?.error || res_err_318?.message || 'An error occurred',
        error: res_err_318?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('exam_id');
    const classId = searchParams.get('class_id');
    const sectionId = searchParams.get('section_id');
    const subjectId = searchParams.get('subject_id');
    const mode = searchParams.get('mode');
    const sortBy = searchParams.get('sort_by') || 'gpa'; // 'gpa' or 'total'

    // Matrix / Master Broadsheet Mode
    if (mode === 'matrix') {
      if (!examId || !classId) {
        return NextResponse.json({
          success: false,
          message: 'Parameters exam_id and class_id are required for matrix mode.',
          error: 'Bad Request',
          paylod: null
        }, { status: 400 });
      }

      // Fetch dynamic grading scale from mark_grades
      const gradesRes = await query('SELECT * FROM mark_grades ORDER BY min_mark DESC');
      const markGrades = gradesRes.rows;

      // Helper function to calculate subject grade and point using mark_grades or standard fallback
      const getSubjectGradePoint = (percentage) => {
        if (markGrades.length > 0) {
          const matched = markGrades.find(
            g => percentage >= parseFloat(g.min_mark) && percentage <= parseFloat(g.max_mark)
          );
          if (matched) {
            return { point: parseFloat(matched.point), letter: matched.letter_grade };
          }
        }
        // Fallback grading scale
        if (percentage >= 80) return { point: 5.00, letter: 'A+' };
        if (percentage >= 70) return { point: 4.00, letter: 'A' };
        if (percentage >= 60) return { point: 3.50, letter: 'A-' };
        if (percentage >= 50) return { point: 3.00, letter: 'B' };
        if (percentage >= 40) return { point: 2.00, letter: 'C' };
        if (percentage >= 33) return { point: 1.00, letter: 'D' };
        return { point: 0.00, letter: 'F' };
      };

      // Fetch Exam details
      const examRes = await query(`
        SELECT e.*, c.name AS class_name 
        FROM exams e
        JOIN classes c ON c.id = e.class_id
        WHERE e.id = $1
      `, [examId]);
      const exam = examRes.rows[0] || null;

      // Fetch scheduled subjects for the exam & class with full_marks
      const subjectsRes = await query(`
        SELECT DISTINCT sub.id, sub.name, sub.code, COALESCE(es.full_marks, 100.00) AS full_marks
        FROM exam_schedules es
        JOIN subjects sub ON sub.id = es.subject_id
        WHERE es.exam_id = $1
        ORDER BY sub.name ASC
      `, [examId]);

      let subjects = subjectsRes.rows;

      // Fallback: if no exam_schedules mapped yet, query subjects mapped to class
      if (subjects.length === 0) {
        const classSubRes = await query(`
          SELECT sub.id, sub.name, sub.code, 100.00 AS full_marks
          FROM class_subjects cs
          JOIN subjects sub ON sub.id = cs.subject_id
          WHERE cs.class_id = $1
          ORDER BY sub.name ASC
        `, [classId]);
        subjects = classSubRes.rows;
      }

      // Fetch active students in class/section
      let studentSql = `
        SELECT s.id AS student_id, s.name, s.registration_number, s.roll, sec.name AS section_name
        FROM students s
        LEFT JOIN sections sec ON sec.id = s.section_id
        WHERE s.class_id = $1 AND s.is_active = TRUE
      `;
      const studentParams = [classId];
      if (sectionId && sectionId !== 'all') {
        studentSql += ` AND s.section_id = $2`;
        studentParams.push(sectionId);
      }
      studentSql += ` ORDER BY s.roll ASC, s.name ASC`;
      const studentsRes = await query(studentSql, studentParams);
      const students = studentsRes.rows;

      // Fetch all marks recorded for this exam
      const marksRes = await query(`
        SELECT student_id, subject_id, marks_obtained, total_marks, remarks
        FROM marks
        WHERE exam_id = $1
      `, [examId]);

      // Map marks by student_id and subject_id
      const markMap = {};
      marksRes.rows.forEach(m => {
        if (!markMap[m.student_id]) markMap[m.student_id] = {};
        markMap[m.student_id][m.subject_id] = m;
      });

      // Aggregate student matrix entries
      const studentMatrix = students.map(student => {
        const subjectMarks = {};
        let totalObtained = 0.00;
        let totalMax = 0.00;
        let sumGradePoints = 0.00;
        let subjectCount = 0;
        let hasFailedSubject = false;

        subjects.forEach(sub => {
          const markEntry = markMap[student.student_id]?.[sub.id];
          if (markEntry && markEntry.marks_obtained !== null && markEntry.marks_obtained !== undefined) {
            const obtained = parseFloat(markEntry.marks_obtained);
            const maxMarks = parseFloat(sub.full_marks || markEntry.total_marks || 100);
            const pct = maxMarks > 0 ? (obtained / maxMarks) * 100 : 0;
            const { point, letter } = getSubjectGradePoint(pct);

            subjectMarks[sub.id] = {
              obtained,
              maxMarks,
              pct: parseFloat(pct.toFixed(2)),
              point,
              letter
            };

            totalObtained += obtained;
            totalMax += maxMarks;
            sumGradePoints += point;
            subjectCount += 1;

            if (point === 0.00 || letter === 'F') {
              hasFailedSubject = true;
            }
          } else {
            subjectMarks[sub.id] = null;
          }
        });

        // Compute overall Average GPA across subjects
        let averageGPA = 0.00;
        let overallGrade = 'F';
        let status = 'Fail';

        if (subjectCount > 0) {
          if (hasFailedSubject) {
            averageGPA = 0.00;
            overallGrade = 'F';
            status = 'Fail';
          } else {
            averageGPA = parseFloat((sumGradePoints / subjectCount).toFixed(2));
            // Match overall GPA to overall grade
            if (averageGPA >= 5.00) overallGrade = 'A+';
            else if (averageGPA >= 4.00) overallGrade = 'A';
            else if (averageGPA >= 3.50) overallGrade = 'A-';
            else if (averageGPA >= 3.00) overallGrade = 'B';
            else if (averageGPA >= 2.00) overallGrade = 'C';
            else overallGrade = 'F';

            status = averageGPA >= 2.00 ? 'Pass' : 'Fail';
          }
        }

        return {
          student_id: student.student_id,
          name: student.name,
          registration_number: student.registration_number,
          roll: student.roll,
          section_name: student.section_name,
          subject_marks: subjectMarks,
          total_obtained: parseFloat(totalObtained.toFixed(2)),
          total_max: parseFloat(totalMax.toFixed(2)),
          gpa: averageGPA,
          overall_grade: overallGrade,
          status,
          has_failed_subject: hasFailedSubject
        };
      });

      // Calculate Merit Rank: sort by GPA DESC, Total Obtained DESC
      const sortedForRank = [...studentMatrix].sort((a, b) => b.gpa - a.gpa || b.total_obtained - a.total_obtained);
      let rankCounter = 1;

      // Assign merit_rank: numeric integer for Pass students, null for F grade / Fail students
      const rankMap = {};
      sortedForRank.forEach(st => {
        if (st.status === 'Pass' && !st.has_failed_subject && st.overall_grade !== 'F') {
          rankMap[st.student_id] = rankCounter++;
        } else {
          rankMap[st.student_id] = null;
        }
      });

      // Attach merit_rank to studentMatrix items
      studentMatrix.forEach(st => {
        st.merit_rank = rankMap[st.student_id];
      });

      // Sort student matrix by selected criteria for display
      if (sortBy === 'total') {
        studentMatrix.sort((a, b) => b.total_obtained - a.total_obtained || b.gpa - a.gpa);
      } else {
        // Default sort by GPA
        studentMatrix.sort((a, b) => b.gpa - a.gpa || b.total_obtained - a.total_obtained);
      }

      return NextResponse.json({
        success: true,
        message: 'Successfully fetched master mark sheet matrix',
        paylod: {
          exam,
          subjects,
          students: studentMatrix,
          gradingRules: markGrades
        }
      }, { status: 200 });
    }

    if (!examId || !classId || !subjectId) {
      const res_err_955 = { error: 'Parameters exam_id, class_id, and subject_id are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_955?.error || res_err_955?.message || 'An error occurred',
        error: res_err_955?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Retrieve students matching filters with their marks (left join marks table)
    let dbQuery = `
      SELECT s.id AS student_id, s.name, s.registration_number,
             m.marks_obtained, m.total_marks, m.remarks
      FROM students s
      LEFT JOIN marks m ON m.student_id = s.id AND m.exam_id = $1 AND m.subject_id = $2
      WHERE s.class_id = $3
    `;
    const params = [examId, subjectId, classId];

    if (sectionId && sectionId !== 'all') {
      dbQuery += ` AND s.section_id = $4`;
      params.push(sectionId);
    }

    dbQuery += ` ORDER BY s.name ASC`;

    const result = await query(dbQuery, params);

    const res_data_1528 = { students: result.rows };
      return NextResponse.json({
        success: true,
        message: res_data_1528?.message || 'Successfully fecthed data',
        paylod: res_data_1528
      }, { status: 200 });
  } catch (error) {
    console.error('Error fetching students marks:', error);
    const res_err_2355 = { error: 'Failed to retrieve students marks. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_2355?.error || res_err_2355?.message || 'An error occurred',
        error: res_err_2355?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// POST batch upload / upsert marks
export async function POST(request) {
  try {
    const authenticated = (await isAdmin()) || (await isTeacher());
    if (!authenticated) {
      const res_err_2891 = { error: 'Unauthorized. Admins/Teachers only.' };
      return NextResponse.json({
        success: false,
        message: res_err_2891?.error || res_err_2891?.message || 'An error occurred',
        error: res_err_2891?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const body = await request.json();
    const { marks } = body; // Array: [{ student_id, exam_id, subject_id, marks_obtained, total_marks, remarks }]

    if (!marks || !Array.isArray(marks)) {
      const res_err_3426 = { error: 'Invalid payload. An array of marks is required.' };
      return NextResponse.json({
        success: false,
        message: res_err_3426?.error || res_err_3426?.message || 'An error occurred',
        error: res_err_3426?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Start database loop updates
    for (const entry of marks) {
      const { student_id, exam_id, subject_id, marks_obtained, total_marks, remarks } = entry;

      if (!student_id || !exam_id || !subject_id || marks_obtained === undefined) {
        continue; // skip incomplete entries
      }

      await query(
        `INSERT INTO marks (student_id, exam_id, subject_id, marks_obtained, total_marks, remarks)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (student_id, exam_id, subject_id)
         DO UPDATE SET marks_obtained = EXCLUDED.marks_obtained,
                       total_marks = EXCLUDED.total_marks,
                       remarks = EXCLUDED.remarks,
                       updated_at = CURRENT_TIMESTAMP`,
        [
          student_id,
          exam_id,
          subject_id,
          parseFloat(marks_obtained),
          total_marks ? parseFloat(total_marks) : 100.00,
          remarks ? remarks.trim() : null
        ]
      );
    }

    const res_data_3648 = {
      message: 'Student marks registered and saved successfully.'
    };
      return NextResponse.json({
        success: true,
        message: res_data_3648?.message || 'Successfully fecthed data',
        paylod: res_data_3648
      }, { status: 200 });
  } catch (error) {
    console.error('Error saving student marks:', error);
    const res_err_5216 = { error: 'Failed to register student marks. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_5216?.error || res_err_5216?.message || 'An error occurred',
        error: res_err_5216?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
