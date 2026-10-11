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

    // Fetch student's profile & class info
    const studentRes = await queryDb(
      `SELECT s.id, s.website_id, s.registration_no, s.roll_no,
              s.class_id, s.section_id, s.session_id,
              c.name AS class_name, c.code AS class_code,
              ses.name AS session_name
       FROM website_students s
       LEFT JOIN website_classes c ON s.class_id = c.id AND c.website_id = s.website_id
       LEFT JOIN website_sessions ses ON s.session_id = ses.id AND ses.website_id = s.website_id
       WHERE s.id = $1 AND s.website_id = $2
       LIMIT 1`,
      [session.id, website.id]
    );

    if (studentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student record not found.' }, { status: 404 });
    }

    const student = studentRes.rows[0];

    // Fetch exams for the student's class
    const examsRes = await queryDb(
      `SELECT e.*,
              c.name AS class_name,
              ses.name AS session_name,
              cand.id AS candidate_id,
              cand.candidate_status,
              cand.admit_card_number,
              cand.applied_date,
              cand.remarks AS candidate_remarks,
              COALESCE(fee.total_fee_amount, 0)::numeric AS exam_fee_amount,
              COALESCE(pay.paid_amount, 0)::numeric AS fee_paid_amount,
              COALESCE(pay.payment_status, 'unpaid') AS payment_status,
              pay.invoice_no,
              pay.transaction_id,
              pay.id AS payment_id
       FROM website_exams e
       LEFT JOIN website_classes c ON c.id = e.class_id AND c.website_id = e.website_id
       LEFT JOIN website_sessions ses ON ses.id = e.session_id AND ses.website_id = e.website_id
       LEFT JOIN website_exam_candidates cand ON cand.exam_id = e.id AND cand.student_id = $1 AND cand.website_id = e.website_id
       LEFT JOIN (
         SELECT exam_id, SUM(amount)::numeric AS total_fee_amount
         FROM website_exam_fees
         WHERE website_id = $2 AND status = 'active'
         GROUP BY exam_id
       ) fee ON fee.exam_id = e.id
       LEFT JOIN (
         SELECT exam_id, id, paid_amount, payment_status, invoice_no, transaction_id
         FROM website_exam_fee_payments
         WHERE website_id = $2 AND student_id = $1
         ORDER BY id DESC
       ) pay ON pay.exam_id = e.id
       WHERE e.website_id = $2 
         AND e.class_id = $3
         AND e.is_published = TRUE
       ORDER BY e.start_date ASC, e.id DESC`,
      [student.id, website.id, student.class_id]
    );

    return NextResponse.json({
      success: true,
      student,
      exams: examsRes.rows,
      // For backwards compatibility with legacy UI property shapes
      examSchedules: examsRes.rows.map(ex => ({
        id: ex.id,
        exam_name: ex.name,
        exam_term: ex.term,
        exam_status: ex.status,
        exam_fee: ex.exam_fee_amount,
        exam_date: ex.start_date,
        subject_name: ex.name,
        start_time: '09:00 AM',
        end_time: '12:00 PM',
        room_number: 'Campus Hall'
      }))
    });
  } catch (error) {
    console.error('Error fetching student exams:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch exam schedules and registration status.' },
      { status: 500 }
    );
  }
}
