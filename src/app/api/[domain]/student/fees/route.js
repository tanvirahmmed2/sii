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

    // Student profile info
    const studentRes = await queryDb(
      `SELECT s.id, s.website_id, s.registration_no, s.roll_no,
              i.name, i.email, i.number
       FROM website_students s
       JOIN website_student_info i ON i.student_id = s.id
       WHERE s.id = $1 AND s.website_id = $2
       LIMIT 1`,
      [session.id, website.id]
    );

    if (studentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student record not found.' }, { status: 404 });
    }
    const student = studentRes.rows[0];

    // Fetch exam fee payments for this student
    const examPaymentsRes = await queryDb(
      `SELECT p.id,
              p.website_id,
              p.exam_id,
              p.fee_id,
              p.amount,
              p.paid_amount,
              p.fine_amount,
              p.payment_status AS status,
              p.payment_method,
              p.transaction_id,
              p.paid_date,
              p.invoice_no,
              p.created_at,
              COALESCE(f.due_date, e.start_date, p.created_at::date) AS due_date,
              CONCAT(e.name, ' - ', COALESCE(f.fee_title, 'Exam Registration Fee')) AS title,
              e.name AS exam_name,
              e.term AS exam_term
       FROM website_exam_fee_payments p
       LEFT JOIN website_exams e ON e.id = p.exam_id AND e.website_id = p.website_id
       LEFT JOIN website_exam_fees f ON f.id = p.fee_id AND f.website_id = p.website_id
       WHERE p.student_id = $1 AND p.website_id = $2
       ORDER BY p.id DESC`,
      [student.id, website.id]
    );

    const formattedFees = examPaymentsRes.rows.map(item => ({
      id: item.id,
      title: item.title,
      amount: item.amount,
      paid_amount: item.paid_amount,
      status: item.status,
      due_date: item.due_date,
      invoice_no: item.invoice_no,
      transaction_id: item.transaction_id,
      payment_method: item.payment_method,
      paid_date: item.paid_date,
      exam_name: item.exam_name,
      exam_term: item.exam_term,
      type: 'Exam Fee'
    }));

    return NextResponse.json({
      success: true,
      paylod: {
        fees: formattedFees,
        fines: [],
        student: {
          id: student.id,
          name: student.name,
          registration_no: student.registration_no,
          roll_no: student.roll_no
        }
      },
      fees: formattedFees,
      fines: []
    });
  } catch (error) {
    console.error('Error fetching student fees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch student fees.' },
      { status: 500 }
    );
  }
}
