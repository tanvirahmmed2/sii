import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';
import { syncExamStatuses } from '@/lib/exams';

export async function GET() {
  try {
    await syncExamStatuses();

    const cookieStore = await cookies();
    const token = cookieStore.get('fit-student')?.value;

    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Not authenticated',
        error: 'Unauthorized',
        paylod: null
      }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json({
        success: false,
        message: 'Invalid token',
        error: 'Unauthorized',
        paylod: null
      }, { status: 401 });
    }

    const studentId = decoded.id;

    // Fetch student profile
    const studentRes = await query(`
      SELECT s.id, s.name, s.registration_number, s.roll, s.date_of_birth, s.gender, s.class_id, s.section_id,
             s.father_name, s.mother_name, s.parents_info, s.image, s.blood_group,
             c.name AS class_name, sec.name AS section_name
      FROM students s
      JOIN classes c ON c.id = s.class_id
      LEFT JOIN sections sec ON sec.id = s.section_id
      WHERE s.id = $1
    `, [studentId]);

    if (studentRes.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Student profile not found',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    const student = studentRes.rows[0];

    // Fetch exams for student's class
    const examsRes = await query(`
      SELECT e.*, c.name AS class_name
      FROM exams e
      JOIN classes c ON c.id = e.class_id
      WHERE e.class_id = $1
      ORDER BY e.start_date DESC
    `, [student.class_id]);

    // Fetch all admit card issuance logs for this student
    const admitLogRes = await query(`
      SELECT * FROM student_admit_cards
      WHERE student_id = $1
    `, [studentId]);

    const issuedExamMap = new Map();
    admitLogRes.rows.forEach(log => {
      issuedExamMap.set(Number(log.exam_id), log);
    });

    const examList = [];

    for (const exam of examsRes.rows) {
      // Fetch schedules
      const schedulesRes = await query(`
        SELECT cs.id, cs.exam_date, cs.start_time, cs.end_time, cs.room_number,
               sub.name AS subject_name, sub.code AS subject_code
        FROM class_subjects sub
        LEFT JOIN class_routines cs ON cs.subject_id = sub.id AND cs.exam_id = $1
        WHERE sub.class_id = $2
      `, [exam.id, student.class_id]);

      const issueRecord = issuedExamMap.get(Number(exam.id)) || null;
      const isProvided = !!issueRecord;

      examList.push({
        ...exam,
        schedules: schedulesRes.rows,
        issueRecord,
        isProvided
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Admit cards retrieved successfully',
      paylod: {
        student,
        exams: examList
      }
    });

  } catch (error) {
    console.error('Error fetching student admit cards:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
      paylod: null
    }, { status: 500 });
  }
}
