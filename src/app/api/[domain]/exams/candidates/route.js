import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyExamAccess } from 'src/lib/middleware/exam_auth.js';

export async function GET(request, context) {
  try {
    const auth = await verifyExamAccess(request, context, 'view');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const examId = searchParams.get('exam_id');
    const classId = searchParams.get('class_id');
    const candidateStatus = searchParams.get('candidate_status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE cand.website_id = $1';
    const params = [auth.website.id];

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (info.name ILIKE $${params.length} OR cand.roll_no ILIKE $${params.length} OR cand.registration_no ILIKE $${params.length} OR cand.admit_card_number ILIKE $${params.length} OR e.name ILIKE $${params.length})`;
    }

    if (examId && examId !== 'all') {
      params.push(examId);
      whereClause += ` AND cand.exam_id = $${params.length}`;
    }

    if (classId && classId !== 'all') {
      params.push(classId);
      whereClause += ` AND cand.class_id = $${params.length}`;
    }

    if (candidateStatus && candidateStatus !== 'all') {
      params.push(candidateStatus);
      whereClause += ` AND cand.candidate_status = $${params.length}`;
    }

    const countRes = await queryDb(
      `SELECT COUNT(*)::int AS total 
       FROM website_exam_candidates cand
       LEFT JOIN website_students s ON s.id = cand.student_id AND s.website_id = cand.website_id
       LEFT JOIN website_student_info info ON info.student_id = s.id AND info.website_id = cand.website_id
       LEFT JOIN website_exams e ON e.id = cand.exam_id AND e.website_id = cand.website_id
       ${whereClause}`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    const dataQuery = `
      SELECT cand.*,
             e.name AS exam_name,
             e.term AS exam_term,
             e.start_date AS exam_start_date,
             e.end_date AS exam_end_date,
             info.name AS student_name,
             info.email AS student_email,
             info.number AS student_phone,
             c.name AS class_name,
             c.code AS class_code,
             ses.name AS session_name,
             st.name AS approver_name,
             COALESCE(pay.total_fee, 0)::numeric AS total_fee,
             COALESCE(pay.total_paid, 0)::numeric AS total_paid,
             COALESCE(pay.payment_status, 'unpaid') AS payment_status
      FROM website_exam_candidates cand
      LEFT JOIN website_exams e ON e.id = cand.exam_id AND e.website_id = cand.website_id
      LEFT JOIN website_students s ON s.id = cand.student_id AND s.website_id = cand.website_id
      LEFT JOIN website_student_info info ON info.student_id = s.id AND info.website_id = cand.website_id
      LEFT JOIN website_classes c ON c.id = cand.class_id AND c.website_id = cand.website_id
      LEFT JOIN website_sessions ses ON ses.id = cand.session_id AND ses.website_id = cand.website_id
      LEFT JOIN website_staffs st ON st.id = cand.approved_by AND st.website_id = cand.website_id
      LEFT JOIN (
        SELECT candidate_id,
               SUM(amount)::numeric AS total_fee,
               SUM(paid_amount)::numeric AS total_paid,
               CASE
                 WHEN BOOL_AND(payment_status = 'paid') THEN 'paid'
                 WHEN BOOL_OR(payment_status IN ('paid', 'partially_paid')) THEN 'partially_paid'
                 ELSE 'pending'
               END AS payment_status
        FROM website_exam_fee_payments
        WHERE website_id = $1 AND candidate_id IS NOT NULL
        GROUP BY candidate_id
      ) pay ON pay.candidate_id = cand.id
      ${whereClause}
      ORDER BY cand.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataRes = await queryDb(dataQuery, [...params, limit, offset]);

    return NextResponse.json({
      success: true,
      candidates: dataRes.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching exam candidates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch exam candidates.' },
      { status: 500 }
    );
  }
}

export async function POST(request, context) {
  try {
    const auth = await verifyExamAccess(request, context, 'create');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const {
      exam_id,
      student_id,
      candidate_status = 'pending',
      admit_card_number,
      remarks = ''
    } = body;

    if (!exam_id || !student_id) {
      return NextResponse.json(
        { success: false, error: 'Exam ID and Student ID are required.' },
        { status: 400 }
      );
    }

    // Verify student exists and belongs to this website
    const studentRes = await queryDb(
      `SELECT s.id, s.class_id, s.session_id, s.roll_no, s.registration_no 
       FROM website_students s 
       WHERE s.id = $1 AND s.website_id = $2`,
      [student_id, auth.website.id]
    );

    if (studentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student not found.' }, { status: 404 });
    }
    const student = studentRes.rows[0];

    // Check duplicate
    const existing = await queryDb(
      `SELECT id FROM website_exam_candidates WHERE website_id = $1 AND exam_id = $2 AND student_id = $3`,
      [auth.website.id, exam_id, student_id]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Student is already registered as candidate for this exam.' },
        { status: 409 }
      );
    }

    const resolvedAdmitCard =
      admit_card_number?.trim() ||
      (candidate_status === 'admit_issued'
        ? `ADM-${exam_id}-${student.roll_no || student.id}-${Date.now().toString().slice(-4)}`
        : null);

    const approverStaffId = auth.actor?.type === 'staff' ? auth.actor.id : null;

    // Insert candidate
    const candRes = await queryDb(
      `INSERT INTO website_exam_candidates (
        website_id, exam_id, student_id, class_id, session_id,
        roll_no, registration_no, candidate_status, admit_card_number,
        applied_date, approved_by, approved_at, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10, 
        CASE WHEN $8 IN ('approved', 'admit_issued') THEN CURRENT_TIMESTAMP ELSE NULL END, $11)
      RETURNING *`,
      [
        auth.website.id,
        exam_id,
        student.id,
        student.class_id,
        student.session_id,
        student.roll_no,
        student.registration_no,
        candidate_status,
        resolvedAdmitCard,
        approverStaffId,
        remarks?.trim() || null
      ]
    );

    const candidate = candRes.rows[0];

    // Check exam fees and create pending payment records
    const feesRes = await queryDb(
      `SELECT id, amount FROM website_exam_fees WHERE website_id = $1 AND exam_id = $2 AND status = 'active'`,
      [auth.website.id, exam_id]
    );

    if (feesRes.rows.length > 0) {
      for (const fee of feesRes.rows) {
        const invoiceNo = `INV-EXM-${exam_id}-${student.id}-${Date.now().toString().slice(-4)}`;
        await queryDb(
          `INSERT INTO website_exam_fee_payments (
            website_id, exam_id, fee_id, student_id, candidate_id,
            amount, paid_amount, payment_status, invoice_no
          ) VALUES ($1, $2, $3, $4, $5, $6, 0.00, 'pending', $7)`,
          [
            auth.website.id,
            exam_id,
            fee.id,
            student.id,
            candidate.id,
            fee.amount,
            invoiceNo
          ]
        );
      }
    } else {
      // Default zero pending payment item for tracking
      const invoiceNo = `INV-EXM-${exam_id}-${student.id}-${Date.now().toString().slice(-4)}`;
      await queryDb(
        `INSERT INTO website_exam_fee_payments (
          website_id, exam_id, student_id, candidate_id,
          amount, paid_amount, payment_status, invoice_no, notes
        ) VALUES ($1, $2, $3, $4, 0.00, 0.00, 'pending', $5, 'Standard Candidate Registration')`,
        [auth.website.id, exam_id, student.id, candidate.id, invoiceNo]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Exam candidate added successfully with pending fee ledger.',
      candidate
    });
  } catch (error) {
    console.error('Error creating exam candidate:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create exam candidate.' },
      { status: 500 }
    );
  }
}

export async function PUT(request, context) {
  try {
    const auth = await verifyExamAccess(request, context, 'edit');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { id, candidate_status, admit_card_number, remarks, auto_generate_admit } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Candidate ID is required.' }, { status: 400 });
    }

    let finalAdmitCard = admit_card_number;
    if (auto_generate_admit || candidate_status === 'admit_issued') {
      if (!finalAdmitCard) {
        finalAdmitCard = `ADM-${Date.now().toString().slice(-6)}-${id}`;
      }
    }

    const approverStaffId = auth.actor?.type === 'staff' ? auth.actor.id : null;

    const updateRes = await queryDb(
      `UPDATE website_exam_candidates
       SET candidate_status = COALESCE($3, candidate_status),
           admit_card_number = CASE 
             WHEN $4 IS NOT NULL THEN $4 
             WHEN $3 = 'admit_issued' AND admit_card_number IS NULL THEN CONCAT('ADM-', id, '-', EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::bigint % 100000)
             ELSE admit_card_number 
           END,
           remarks = COALESCE($5, remarks),
           approved_by = CASE WHEN $3 IN ('approved', 'admit_issued') THEN COALESCE(approved_by, $6) ELSE approved_by END,
           approved_at = CASE WHEN $3 IN ('approved', 'admit_issued') THEN COALESCE(approved_at, CURRENT_TIMESTAMP) ELSE approved_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND website_id = $2
       RETURNING *`,
      [
        id,
        auth.website.id,
        candidate_status || null,
        finalAdmitCard || null,
        remarks !== undefined ? remarks?.trim() : null,
        approverStaffId
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Candidate not found or forbidden.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Candidate record updated successfully.',
      candidate: updateRes.rows[0]
    });
  } catch (error) {
    console.error('Error updating candidate:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update candidate record.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const auth = await verifyExamAccess(request, context, 'delete');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Candidate ID is required.' }, { status: 400 });
    }

    const deleteRes = await queryDb(
      `DELETE FROM website_exam_candidates WHERE id = $1 AND website_id = $2 RETURNING id`,
      [id, auth.website.id]
    );

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Candidate not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Candidate registration deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting candidate:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete candidate registration.' },
      { status: 500 }
    );
  }
}
