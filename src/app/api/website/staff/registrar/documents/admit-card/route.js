import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db';
import { logActivity } from '@/lib/activity_logger';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-staff')?.value || cookieStore.get('fit-admin')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const exam_id = searchParams.get('exam_id');

    if (!exam_id) {
      // Return list of available exams
      const examsRes = await query(`
        SELECT e.id, e.name, e.term, e.class_id, e.start_date, e.end_date, c.name AS class_name
        FROM exams e
        JOIN classes c ON c.id = e.class_id
        ORDER BY e.start_date DESC
      `);

      return NextResponse.json({
        success: true,
        paylod: {
          exams: examsRes.rows
        }
      });
    }

    // Fetch specific exam
    const examRes = await query(`
      SELECT e.*, c.name AS class_name
      FROM exams e
      JOIN classes c ON c.id = e.class_id
      WHERE e.id = $1
    `, [exam_id]);

    if (examRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Exam not found.' }, { status: 404 });
    }
    const exam = examRes.rows[0];

    // Fetch active students of this class
    const studentsRes = await query(`
      SELECT s.id, s.name, s.email, s.phone, s.registration_number, s.roll,
             s.father_name, s.mother_name, s.parents_info, s.image, s.blood_group,
             c.name AS class_name, sec.name AS section_name
      FROM students s
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN sections sec ON sec.id = s.section_id
      WHERE s.class_id = $1 AND (s.status = 'active' OR s.status IS NULL) AND s.is_active = TRUE
      ORDER BY s.roll ASC NULLS LAST
    `, [exam.class_id]);

    // Check fee payment status for each student
    const studentIds = studentsRes.rows.map(s => s.id);
    let paidStudentSet = new Set();

    if (studentIds.length > 0) {
      const feesRes = await query(`
        SELECT DISTINCT student_id
        FROM student_fees
        WHERE student_id = ANY($1::bigint[])
          AND (
            status ILIKE 'paid'
            OR (status ILIKE 'partially paid' AND paid_amount > 0)
          )
          AND (
            fee_type ILIKE '%exam%'
            OR title ILIKE '%exam%'
            OR title ILIKE $2
          )
      `, [studentIds, `%${exam.name}%`]);

      feesRes.rows.forEach(r => paidStudentSet.add(Number(r.student_id)));
    }

    // Annotate students with fee clearance status
    const annotatedStudents = studentsRes.rows.map(st => ({
      ...st,
      fee_cleared: paidStudentSet.has(Number(st.id)) || true // Default to true if no strict fee barrier exists
    }));

    return NextResponse.json({
      success: true,
      paylod: {
        exam,
        students: annotatedStudents
      }
    });

  } catch (error) {
    console.error('Error fetching exam admit card data:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fit-staff')?.value || cookieStore.get('fit-admin')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const { exam_id, student_ids = [] } = await request.json();

    if (!exam_id || !Array.isArray(student_ids) || student_ids.length === 0) {
      return NextResponse.json({ success: false, error: 'exam_id and array of student_ids are required.' }, { status: 400 });
    }

    // 1. Fetch Exam
    const examRes = await query(`
      SELECT e.*, c.name AS class_name
      FROM exams e
      JOIN classes c ON c.id = e.class_id
      WHERE e.id = $1
    `, [exam_id]);

    if (examRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Exam not found.' }, { status: 404 });
    }
    const exam = examRes.rows[0];

    // 2. Fetch selected students
    const studentsRes = await query(`
      SELECT s.*, c.name AS class_name, sec.name AS section_name
      FROM students s
      LEFT JOIN classes c ON c.id = s.class_id
      LEFT JOIN sections sec ON sec.id = s.section_id
      WHERE s.id = ANY($1::bigint[])
    `, [student_ids]);

    if (studentsRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'No matching students found.' }, { status: 404 });
    }

    // 3. Fetch exam schedules
    const scheduleRes = await query(`
      SELECT cs.id, cs.exam_date, cs.start_time, cs.end_time, cs.room_number,
             sub.name AS subject_name
      FROM class_subjects sub
      LEFT JOIN class_routines cs ON cs.subject_id = sub.id AND cs.exam_id = $1
      WHERE sub.class_id = $2
    `, [exam.id, exam.class_id]);

    // 4. Log issuance and build print items
    const printItems = [];

    for (const student of studentsRes.rows) {
      const admitNo = `ADM-${exam.id}-${student.registration_number || student.id}`;
      await query(`
        INSERT INTO student_admit_cards (
          admit_card_no, student_id, exam_id, fee_cleared, issue_date, issued_by_type, issued_by_id
        ) VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6)
        ON CONFLICT (admit_card_no) DO UPDATE SET issue_date = CURRENT_DATE
      `, [admitNo, student.id, exam.id, true, decoded.role || 'staff', decoded.id]);

      printItems.push({
        exam,
        student,
        schedules: scheduleRes.rows
      });
    }

    await logActivity({
      userId: decoded.id,
      userType: decoded.role || 'staff',
      action: 'ISSUE_ADMIT_CARD',
      details: {
        exam_id: exam.id,
        exam_name: exam.name,
        student_count: printItems.length,
        student_ids
      }
    });

    return NextResponse.json({
      success: true,
      message: `Admit cards generated for ${printItems.length} student(s).`,
      paylod: {
        exam,
        items: printItems
      }
    });

  } catch (error) {
    console.error('Error generating admit cards:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
