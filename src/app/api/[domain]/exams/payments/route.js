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
    const feeId = searchParams.get('fee_id');
    const studentId = searchParams.get('student_id');
    const paymentStatus = searchParams.get('payment_status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE p.website_id = $1';
    const params = [auth.website.id];

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (info.name ILIKE $${params.length} OR s.roll_no ILIKE $${params.length} OR s.registration_no ILIKE $${params.length} OR p.invoice_no ILIKE $${params.length} OR p.transaction_id ILIKE $${params.length} OR e.name ILIKE $${params.length})`;
    }

    if (examId && examId !== 'all') {
      params.push(examId);
      whereClause += ` AND p.exam_id = $${params.length}`;
    }

    if (feeId && feeId !== 'all') {
      params.push(feeId);
      whereClause += ` AND p.fee_id = $${params.length}`;
    }

    if (studentId && studentId !== 'all') {
      params.push(studentId);
      whereClause += ` AND p.student_id = $${params.length}`;
    }

    if (paymentStatus && paymentStatus !== 'all') {
      params.push(paymentStatus);
      whereClause += ` AND p.payment_status = $${params.length}`;
    }

    const countRes = await queryDb(
      `SELECT COUNT(*)::int AS total 
       FROM website_exam_fee_payments p
       LEFT JOIN website_students s ON s.id = p.student_id AND s.website_id = p.website_id
       LEFT JOIN website_student_info info ON info.student_id = s.id AND info.website_id = p.website_id
       LEFT JOIN website_exams e ON e.id = p.exam_id AND e.website_id = p.website_id
       ${whereClause}`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    const dataQuery = `
      SELECT p.*,
             e.name AS exam_name,
             e.term AS exam_term,
             COALESCE(f.fee_title, 'General Exam Registration') AS fee_title,
             info.name AS student_name,
             info.email AS student_email,
             info.number AS student_phone,
             s.roll_no,
             s.registration_no,
             c.name AS class_name,
             c.code AS class_code,
             cand.candidate_status,
             cand.admit_card_number
      FROM website_exam_fee_payments p
      LEFT JOIN website_exams e ON e.id = p.exam_id AND e.website_id = p.website_id
      LEFT JOIN website_exam_fees f ON f.id = p.fee_id AND f.website_id = p.website_id
      LEFT JOIN website_students s ON s.id = p.student_id AND s.website_id = p.website_id
      LEFT JOIN website_student_info info ON info.student_id = s.id AND info.website_id = p.website_id
      LEFT JOIN website_classes c ON c.id = s.class_id AND c.website_id = p.website_id
      LEFT JOIN website_exam_candidates cand ON cand.id = p.candidate_id AND cand.website_id = p.website_id
      ${whereClause}
      ORDER BY p.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataRes = await queryDb(dataQuery, [...params, limit, offset]);

    return NextResponse.json({
      success: true,
      payments: dataRes.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching exam payments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch exam fee payments.' },
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
      fee_id,
      student_id,
      candidate_id,
      amount,
      paid_amount = 0,
      fine_amount = 0,
      payment_status = 'pending',
      payment_method = 'cash',
      transaction_id,
      notes = ''
    } = body;

    if (!exam_id || !student_id || amount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Exam ID, Student ID, and amount are required.' },
        { status: 400 }
      );
    }

    const numAmount = parseFloat(amount);
    const numPaid = parseFloat(paid_amount || 0);
    const numFine = parseFloat(fine_amount || 0);

    let finalStatus = payment_status;
    if (finalStatus === 'pending' && numPaid >= numAmount + numFine && numAmount > 0) {
      finalStatus = 'paid';
    } else if (numPaid > 0 && numPaid < numAmount + numFine) {
      finalStatus = 'partially_paid';
    }

    const invoiceNo = `INV-EXM-${exam_id}-${student_id}-${Date.now().toString().slice(-4)}`;
    const receivedBy = auth.actor?.name || 'Staff Member';

    const insertRes = await queryDb(
      `INSERT INTO website_exam_fee_payments (
        website_id, exam_id, fee_id, student_id, candidate_id,
        amount, paid_amount, fine_amount, payment_status,
        payment_method, transaction_id, paid_date, received_by,
        invoice_no, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 
        CASE WHEN $9 = 'paid' THEN CURRENT_TIMESTAMP ELSE NULL END, $12, $13, $14)
      RETURNING *`,
      [
        auth.website.id,
        exam_id,
        fee_id || null,
        student_id,
        candidate_id || null,
        numAmount,
        numPaid,
        numFine,
        finalStatus,
        payment_method || 'cash',
        transaction_id || null,
        receivedBy,
        invoiceNo,
        notes?.trim() || null
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Payment record created successfully.',
      payment: insertRes.rows[0]
    });
  } catch (error) {
    console.error('Error creating exam payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record payment.' },
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
    const {
      id,
      paid_amount,
      fine_amount,
      payment_status,
      payment_method,
      transaction_id,
      notes,
      mark_paid
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Payment ID is required.' }, { status: 400 });
    }

    // Get current record
    const currRes = await queryDb(
      `SELECT * FROM website_exam_fee_payments WHERE id = $1 AND website_id = $2`,
      [id, auth.website.id]
    );

    if (currRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Payment record not found.' }, { status: 404 });
    }
    const curr = currRes.rows[0];

    let newPaid = paid_amount !== undefined ? parseFloat(paid_amount) : parseFloat(curr.paid_amount);
    let newFine = fine_amount !== undefined ? parseFloat(fine_amount) : parseFloat(curr.fine_amount);
    let newStatus = payment_status || curr.payment_status;

    if (mark_paid) {
      newPaid = parseFloat(curr.amount) + newFine;
      newStatus = 'paid';
    } else if (newPaid >= parseFloat(curr.amount) + newFine && parseFloat(curr.amount) > 0) {
      newStatus = 'paid';
    } else if (newPaid > 0 && newPaid < parseFloat(curr.amount) + newFine) {
      newStatus = 'partially_paid';
    }

    const receivedBy = auth.actor?.name || curr.received_by || 'Staff Member';

    const updateRes = await queryDb(
      `UPDATE website_exam_fee_payments
       SET paid_amount = $3,
           fine_amount = $4,
           payment_status = $5,
           payment_method = COALESCE($6, payment_method),
           transaction_id = COALESCE($7, transaction_id),
           paid_date = CASE WHEN $5 = 'paid' AND paid_date IS NULL THEN CURRENT_TIMESTAMP ELSE paid_date END,
           received_by = $8,
           notes = COALESCE($9, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND website_id = $2
       RETURNING *`,
      [
        id,
        auth.website.id,
        newPaid,
        newFine,
        newStatus,
        payment_method || null,
        transaction_id || null,
        receivedBy,
        notes !== undefined ? notes?.trim() : null
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Payment updated successfully.',
      payment: updateRes.rows[0]
    });
  } catch (error) {
    console.error('Error updating exam payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update payment record.' },
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
      return NextResponse.json({ success: false, error: 'Payment ID is required.' }, { status: 400 });
    }

    const deleteRes = await queryDb(
      `DELETE FROM website_exam_fee_payments WHERE id = $1 AND website_id = $2 RETURNING id`,
      [id, auth.website.id]
    );

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Payment record not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment record deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete payment record.' },
      { status: 500 }
    );
  }
}
