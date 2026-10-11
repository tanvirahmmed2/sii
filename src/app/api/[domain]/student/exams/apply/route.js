import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStudentSession } from 'src/lib/middleware/students.js';

export async function POST(request, context) {
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

    const body = await request.json();
    const { exam_id } = body;

    if (!exam_id) {
      return NextResponse.json({ success: false, error: 'Examination ID is required.' }, { status: 400 });
    }

    // 1. Fetch Student Info
    const studentRes = await queryDb(
      `SELECT s.id, s.website_id, s.registration_no, s.roll_no,
              s.class_id, s.section_id, s.session_id
       FROM website_students s
       WHERE s.id = $1 AND s.website_id = $2
       LIMIT 1`,
      [session.id, website.id]
    );

    if (studentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student record not found.' }, { status: 404 });
    }
    const student = studentRes.rows[0];

    // 2. Fetch & Validate Exam for Student's Class
    const examRes = await queryDb(
      `SELECT e.*, c.name AS class_name
       FROM website_exams e
       LEFT JOIN website_classes c ON c.id = e.class_id
       WHERE e.id = $1 AND e.website_id = $2
       LIMIT 1`,
      [exam_id, website.id]
    );

    if (examRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Examination not found.' }, { status: 404 });
    }

    const exam = examRes.rows[0];

    if (String(exam.class_id) !== String(student.class_id)) {
      return NextResponse.json(
        {
          success: false,
          error: `You cannot apply for this exam. This exam is for ${exam.class_name || 'another class'}. You can only apply for exams of your own class.`
        },
        { status: 403 }
      );
    }

    if (exam.status === 'cancelled') {
      return NextResponse.json({ success: false, error: 'This examination has been cancelled.' }, { status: 400 });
    }

    // Check application dates if set
    const today = new Date().toISOString().split('T')[0];
    if (exam.application_end_date && today > exam.application_end_date.toISOString?.()?.split('T')[0]) {
      return NextResponse.json(
        { success: false, error: 'The application deadline for this examination has passed.' },
        { status: 400 }
      );
    }

    // 3. Check duplicate application
    const existingCand = await queryDb(
      `SELECT id, candidate_status FROM website_exam_candidates 
       WHERE website_id = $1 AND exam_id = $2 AND student_id = $3`,
      [website.id, exam.id, student.id]
    );

    if (existingCand.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `You have already applied for this exam. Application status: ${existingCand.rows[0].candidate_status}.`
        },
        { status: 409 }
      );
    }

    // 4. Create Candidate record with status 'pending'
    const candInsert = await queryDb(
      `INSERT INTO website_exam_candidates (
        website_id, exam_id, student_id, class_id, session_id,
        roll_no, registration_no, candidate_status, applied_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        website.id,
        exam.id,
        student.id,
        student.class_id,
        student.session_id,
        student.roll_no,
        student.registration_no
      ]
    );

    const candidate = candInsert.rows[0];

    // 5. Query fees for this exam
    const feesRes = await queryDb(
      `SELECT id, fee_title, amount 
       FROM website_exam_fees 
       WHERE website_id = $1 AND exam_id = $2 AND status = 'active'`,
      [website.id, exam.id]
    );

    const createdPayments = [];

    if (feesRes.rows.length > 0) {
      for (const fee of feesRes.rows) {
        const invoiceNo = `INV-EXM-${exam.id}-${student.id}-${Date.now().toString().slice(-4)}`;
        const payRes = await queryDb(
          `INSERT INTO website_exam_fee_payments (
            website_id, exam_id, fee_id, student_id, candidate_id,
            amount, paid_amount, payment_status, invoice_no, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, 0.00, 'pending', $7, $8)
          RETURNING *`,
          [
            website.id,
            exam.id,
            fee.id,
            student.id,
            candidate.id,
            fee.amount,
            invoiceNo,
            `Application Fee for ${exam.name} (${fee.fee_title})`
          ]
        );
        createdPayments.push(payRes.rows[0]);
      }
    } else {
      // Create a default pending payment entry with 0 amount for tracking
      const invoiceNo = `INV-EXM-${exam.id}-${student.id}-${Date.now().toString().slice(-4)}`;
      const payRes = await queryDb(
        `INSERT INTO website_exam_fee_payments (
          website_id, exam_id, fee_id, student_id, candidate_id,
          amount, paid_amount, payment_status, invoice_no, notes
        ) VALUES ($1, $2, NULL, $3, $4, 0.00, 0.00, 'pending', $5, $6)
        RETURNING *`,
        [
          website.id,
          exam.id,
          student.id,
          candidate.id,
          invoiceNo,
          `Standard Registration Fee for ${exam.name}`
        ]
      );
      createdPayments.push(payRes.rows[0]);
    }

    return NextResponse.json({
      success: true,
      message: 'Exam application submitted successfully! Your exam fee payment is now pending verification.',
      candidate,
      payments: createdPayments
    });
  } catch (error) {
    console.error('Error applying for exam:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit exam application.' },
      { status: 500 }
    );
  }
}
