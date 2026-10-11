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
      `SELECT s.id, s.website_id, s.registration_no, s.roll_no, s.class_id, s.section_id,
              i.name, i.email, i.number,
              c.name AS class_name, sec.name AS section_name
       FROM website_students s
       JOIN website_student_info i ON i.student_id = s.id
       LEFT JOIN website_classes c ON c.id = s.class_id AND c.website_id = s.website_id
       LEFT JOIN website_sections sec ON sec.id = s.section_id AND sec.website_id = s.website_id
       WHERE s.id = $1 AND s.website_id = $2
       LIMIT 1`,
      [session.id, website.id]
    );

    if (studentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student record not found.' }, { status: 404 });
    }
    const student = studentRes.rows[0];

    // 1. Fetch Class Education Fee Payments & Dues
    const eduFeesRes = await queryDb(
      `SELECT p.id,
              p.website_id,
              p.education_fee_id,
              p.student_id,
              p.class_id,
              p.section_id,
              p.invoice_no,
              p.title,
              p.fee_type,
              p.month_name,
              p.amount,
              p.fine_amount,
              p.paid_amount,
              p.due_date,
              p.payment_status AS status,
              p.payment_method,
              p.transaction_id,
              p.paid_date,
              p.created_at,
              'Education Fee' AS type,
              c.name AS class_name
       FROM website_education_fee_payments p
       LEFT JOIN website_classes c ON c.id = p.class_id AND c.website_id = p.website_id
       WHERE p.student_id = $1 AND p.website_id = $2
       ORDER BY p.id DESC`,
      [student.id, website.id]
    );

    // 2. Fetch Exam Fee Payments
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
              'exam' AS fee_type,
              e.name AS exam_name,
              e.term AS exam_term,
              'Exam Fee' AS type
       FROM website_exam_fee_payments p
       LEFT JOIN website_exams e ON e.id = p.exam_id AND e.website_id = p.website_id
       LEFT JOIN website_exam_fees f ON f.id = p.fee_id AND f.website_id = p.website_id
       WHERE p.student_id = $1 AND p.website_id = $2
       ORDER BY p.id DESC`,
      [student.id, website.id]
    );

    // Combine education fees and exam fees
    const allFees = [
      ...eduFeesRes.rows.map(item => ({
        id: item.id,
        payment_id: item.id,
        title: item.title,
        fee_type: item.fee_type,
        month_name: item.month_name,
        amount: parseFloat(item.amount),
        fine_amount: parseFloat(item.fine_amount || 0),
        paid_amount: parseFloat(item.paid_amount || 0),
        status: item.status,
        due_date: item.due_date,
        invoice_no: item.invoice_no,
        transaction_id: item.transaction_id,
        payment_method: item.payment_method,
        paid_date: item.paid_date,
        created_at: item.created_at,
        class_name: item.class_name,
        type: 'Education Fee',
        can_pay_online: item.status === 'unpaid' || item.status === 'partially_paid',
      })),
      ...examPaymentsRes.rows.map(item => ({
        id: `exam-${item.id}`,
        payment_id: item.id,
        title: item.title,
        fee_type: item.fee_type,
        month_name: item.exam_term,
        amount: parseFloat(item.amount),
        fine_amount: parseFloat(item.fine_amount || 0),
        paid_amount: parseFloat(item.paid_amount || 0),
        status: item.status,
        due_date: item.due_date,
        invoice_no: item.invoice_no,
        transaction_id: item.transaction_id,
        payment_method: item.payment_method,
        paid_date: item.paid_date,
        created_at: item.created_at,
        exam_name: item.exam_name,
        exam_term: item.exam_term,
        type: 'Exam Fee',
        can_pay_online: item.status === 'pending' || item.status === 'unpaid',
      })),
    ];

    // Summary calculations
    const totalOutstanding = allFees
      .filter(f => f.status !== 'paid' && f.status !== 'waived')
      .reduce((sum, f) => sum + (f.amount + f.fine_amount - f.paid_amount), 0);

    const totalPaid = allFees
      .reduce((sum, f) => sum + f.paid_amount, 0);

    const stats = {
      totalOutstanding,
      totalPaid,
      unpaidCount: allFees.filter(f => f.status !== 'paid' && f.status !== 'waived').length,
      paidCount: allFees.filter(f => f.status === 'paid').length,
    };

    return NextResponse.json({
      success: true,
      paylod: {
        fees: allFees,
        fines: [],
        student: {
          id: student.id,
          name: student.name,
          registration_no: student.registration_no,
          roll_no: student.roll_no,
          class_name: student.class_name,
          section_name: student.section_name,
        },
        stats,
      },
      fees: allFees,
      fines: [],
      stats,
    });
  } catch (error) {
    console.error('Error fetching student fees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch student fees.' },
      { status: 500 }
    );
  }
}
