import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from 'src/lib/database/db.js';
import { verifyEducationFeeAccess } from 'src/lib/middleware/education_fee_auth.js';

// GET: List student education fee payments and dues with pagination and stats
export async function GET(request, context) {
  try {
    const auth = await verifyEducationFeeAccess(request, context, 'view');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const status = searchParams.get('status') || 'all';
    const classId = searchParams.get('class_id');
    const sectionId = searchParams.get('section_id');
    const monthName = searchParams.get('month_name');
    const search = searchParams.get('search')?.trim();

    // Base WHERE conditions
    const whereClauses = ['p.website_id = $1'];
    const params = [website.id];
    let idx = 2;

    if (status && status !== 'all') {
      if (status === 'unpaid') {
        whereClauses.push(`p.payment_status IN ('unpaid', 'partially_paid')`);
      } else {
        whereClauses.push(`p.payment_status = $${idx++}`);
        params.push(status);
      }
    }

    if (classId && classId !== 'all') {
      whereClauses.push(`p.class_id = $${idx++}`);
      params.push(classId);
    }

    if (sectionId && sectionId !== 'all') {
      whereClauses.push(`p.section_id = $${idx++}`);
      params.push(sectionId);
    }

    if (monthName && monthName !== 'all') {
      whereClauses.push(`p.month_name = $${idx++}`);
      params.push(monthName);
    }

    if (search) {
      whereClauses.push(`(
        p.invoice_no ILIKE $${idx} OR
        p.title ILIKE $${idx} OR
        i.name ILIKE $${idx} OR
        s.registration_no ILIKE $${idx} OR
        s.roll_no ILIKE $${idx} OR
        p.transaction_id ILIKE $${idx}
      )`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereString = whereClauses.join(' AND ');

    // 1. Get totals and summary statistics for this filter scope
    const statsQuery = `
      SELECT 
        COUNT(*)::int AS total_records,
        COALESCE(SUM(p.amount + p.fine_amount), 0)::numeric(12, 2) AS total_billed,
        COALESCE(SUM(p.paid_amount), 0)::numeric(12, 2) AS total_collected,
        COALESCE(SUM(CASE WHEN p.payment_status IN ('unpaid', 'partially_paid') THEN (p.amount + p.fine_amount - p.paid_amount) ELSE 0 END), 0)::numeric(12, 2) AS total_pending,
        COUNT(CASE WHEN p.payment_status = 'paid' THEN 1 END)::int AS paid_count,
        COUNT(CASE WHEN p.payment_status IN ('unpaid', 'partially_paid') THEN 1 END)::int AS unpaid_count,
        COUNT(CASE WHEN p.payment_status = 'waived' THEN 1 END)::int AS waived_count
      FROM website_education_fee_payments p
      JOIN website_students s ON s.id = p.student_id AND s.website_id = p.website_id
      LEFT JOIN website_student_info i ON i.student_id = s.id
      WHERE ${whereString}
    `;

    const statsRes = await queryDb(statsQuery, params);
    const stats = statsRes.rows[0] || {
      total_records: 0,
      total_billed: '0.00',
      total_collected: '0.00',
      total_pending: '0.00',
      paid_count: 0,
      unpaid_count: 0,
      waived_count: 0,
    };

    // 2. Fetch paginated records
    const dataQuery = `
      SELECT p.*,
             c.name AS class_name,
             sec.name AS section_name,
             sess.name AS session_name,
             s.roll_no,
             s.registration_no,
             i.name AS student_name,
             i.number AS student_phone,
             (p.amount + p.fine_amount - p.paid_amount) AS net_due
      FROM website_education_fee_payments p
      JOIN website_students s ON s.id = p.student_id AND s.website_id = p.website_id
      LEFT JOIN website_student_info i ON i.student_id = s.id
      LEFT JOIN website_classes c ON c.id = p.class_id AND c.website_id = p.website_id
      LEFT JOIN website_sections sec ON sec.id = p.section_id AND sec.website_id = p.website_id
      LEFT JOIN website_sessions sess ON sess.id = p.session_id AND sess.website_id = p.website_id
      WHERE ${whereString}
      ORDER BY p.id DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    const dataParams = [...params, limit, offset];
    const dataRes = await queryDb(dataQuery, dataParams);

    const totalPages = Math.ceil(stats.total_records / limit) || 1;

    return NextResponse.json({
      success: true,
      data: dataRes.rows,
      pagination: {
        page,
        limit,
        total: stats.total_records,
        totalPages,
      },
      stats,
    });
  } catch (error) {
    console.error('Error listing education fee payments:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list payments.' },
      { status: 500 }
    );
  }
}

// POST: Staff manual collection (e.g. Cash / Bank on-campus payment)
export async function POST(request, context) {
  try {
    const auth = await verifyEducationFeeAccess(request, context, 'edit');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website, actor } = auth;
    const body = await request.json().catch(() => ({}));

    const {
      payment_id,
      paid_amount,
      payment_method = 'cash',
      transaction_id = '',
      notes = '',
    } = body;

    if (!payment_id) {
      return NextResponse.json({ success: false, error: 'payment_id is required.' }, { status: 400 });
    }

    const paymentRes = await queryDb(
      `SELECT * FROM website_education_fee_payments WHERE id = $1 AND website_id = $2`,
      [payment_id, website.id]
    );

    if (paymentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Fee payment record not found.' }, { status: 404 });
    }

    const record = paymentRes.rows[0];
    const totalRequired = parseFloat(record.amount) + parseFloat(record.fine_amount || 0);

    const payingAmount = paid_amount !== undefined && paid_amount !== ''
      ? parseFloat(paid_amount)
      : (totalRequired - parseFloat(record.paid_amount || 0));

    if (isNaN(payingAmount) || payingAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Paid amount must be a positive number.' }, { status: 400 });
    }

    const newPaidAmount = parseFloat(record.paid_amount || 0) + payingAmount;
    const newStatus = newPaidAmount >= totalRequired ? 'paid' : 'partially_paid';
    const txnId = transaction_id ? String(transaction_id).trim() : `REC-${Date.now().toString().slice(-6)}`;

    const updateRes = await queryDb(
      `UPDATE website_education_fee_payments
       SET paid_amount = $1,
           payment_status = $2,
           payment_method = $3,
           transaction_id = COALESCE(NULLIF($4, ''), transaction_id),
           paid_date = CURRENT_TIMESTAMP,
           received_by = $5,
           notes = COALESCE(NULLIF($6, ''), notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND website_id = $8
       RETURNING *`,
      [
        newPaidAmount,
        newStatus,
        payment_method,
        txnId,
        actor?.name || 'Staff Desk',
        notes ? String(notes).trim() : null,
        payment_id,
        website.id,
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Payment of ৳${payingAmount.toFixed(2)} recorded successfully (${newStatus}).`,
      data: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Error recording staff fee collection:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record payment.' },
      { status: 500 }
    );
  }
}

// PATCH: Waive fee or fine adjustments
export async function PATCH(request, context) {
  try {
    const auth = await verifyEducationFeeAccess(request, context, 'edit');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website, actor } = auth;
    const body = await request.json().catch(() => ({}));
    const { payment_id, action = 'waive', notes = '', fine_amount } = body;

    if (!payment_id) {
      return NextResponse.json({ success: false, error: 'payment_id is required.' }, { status: 400 });
    }

    const paymentRes = await queryDb(
      `SELECT * FROM website_education_fee_payments WHERE id = $1 AND website_id = $2`,
      [payment_id, website.id]
    );

    if (paymentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Fee payment record not found.' }, { status: 404 });
    }

    if (action === 'waive') {
      const updateRes = await queryDb(
        `UPDATE website_education_fee_payments
         SET payment_status = 'waived',
             notes = CONCAT(COALESCE(notes, ''), ' [Waived by ', $1::text, ' at ', CURRENT_TIMESTAMP::text, ']'),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND website_id = $3
         RETURNING *`,
        [actor?.name || 'Staff', payment_id, website.id]
      );

      return NextResponse.json({
        success: true,
        message: 'Fee invoice has been waived.',
        data: updateRes.rows[0],
      });
    }

    if (action === 'waive_fine') {
      const updateRes = await queryDb(
        `UPDATE website_education_fee_payments
         SET fine_amount = 0.00,
             notes = CONCAT(COALESCE(notes, ''), ' [Fine waived by ', $1::text, ']'),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND website_id = $3
         RETURNING *`,
        [actor?.name || 'Staff', payment_id, website.id]
      );

      return NextResponse.json({
        success: true,
        message: 'Late fine has been waived.',
        data: updateRes.rows[0],
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action specified.' }, { status: 400 });
  } catch (error) {
    console.error('Error modifying fee payment:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to modify payment record.' },
      { status: 500 }
    );
  }
}

// DELETE: Cancel unpaid fee record
export async function DELETE(request, context) {
  try {
    const auth = await verifyEducationFeeAccess(request, context, 'delete');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Payment record ID is required.' }, { status: 400 });
    }

    const check = await queryDb(
      `SELECT paid_amount FROM website_education_fee_payments WHERE id = $1 AND website_id = $2`,
      [id, website.id]
    );

    if (check.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Record not found.' }, { status: 404 });
    }

    if (parseFloat(check.rows[0].paid_amount || 0) > 0) {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete a fee record that already has payments recorded.',
      }, { status: 400 });
    }

    await queryDb(
      `DELETE FROM website_education_fee_payments WHERE id = $1 AND website_id = $2`,
      [id, website.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Unpaid fee invoice deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting fee payment:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete record.' },
      { status: 500 }
    );
  }
}
