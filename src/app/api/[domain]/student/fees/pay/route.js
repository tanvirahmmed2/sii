import { NextResponse } from 'next/server';
import crypto from 'crypto';
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

    const body = await request.json().catch(() => ({}));
    const { payment_id, fee_type = 'Education Fee', payment_method = 'bkash', account_number = '', transaction_id = '' } = body;

    if (!payment_id) {
      return NextResponse.json({ success: false, error: 'payment_id is required.' }, { status: 400 });
    }

    const cleanPaymentId = String(payment_id).replace(/^exam-/, '');
    const isExamFee = fee_type === 'Exam Fee' || String(payment_id).startsWith('exam-');

    const txnId = transaction_id
      ? String(transaction_id).trim()
      : `TXN-${(payment_method || 'ONLINE').toUpperCase()}-${Date.now().toString().slice(-8)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    if (isExamFee) {
      // Handle Exam Fee payment
      const examPayCheck = await queryDb(
        `SELECT * FROM website_exam_fee_payments 
         WHERE id = $1 AND student_id = $2 AND website_id = $3`,
        [cleanPaymentId, session.id, website.id]
      );

      if (examPayCheck.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Exam fee invoice not found.' }, { status: 404 });
      }

      const rec = examPayCheck.rows[0];
      const totalAmount = parseFloat(rec.amount) + parseFloat(rec.fine_amount || 0);

      const updateRes = await queryDb(
        `UPDATE website_exam_fee_payments
         SET paid_amount = $1,
             payment_status = 'paid',
             payment_method = $2,
             transaction_id = $3,
             paid_date = CURRENT_TIMESTAMP,
             notes = CONCAT(COALESCE(notes, ''), ' [Online paid via ', $2::text, ']'),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 AND website_id = $5
         RETURNING *`,
        [totalAmount, payment_method, txnId, cleanPaymentId, website.id]
      );

      return NextResponse.json({
        success: true,
        message: 'Exam registration fee paid successfully.',
        transaction_id: txnId,
        payment: updateRes.rows[0],
      });
    }

    // Handle Education Fee payment
    const eduPayCheck = await queryDb(
      `SELECT * FROM website_education_fee_payments 
       WHERE id = $1 AND student_id = $2 AND website_id = $3`,
      [cleanPaymentId, session.id, website.id]
    );

    if (eduPayCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Education fee invoice not found.' }, { status: 404 });
    }

    const rec = eduPayCheck.rows[0];
    if (rec.payment_status === 'paid') {
      return NextResponse.json({ success: false, error: 'This fee invoice has already been paid in full.' }, { status: 400 });
    }

    const totalAmount = parseFloat(rec.amount) + parseFloat(rec.fine_amount || 0);

    const updateRes = await queryDb(
      `UPDATE website_education_fee_payments
       SET paid_amount = $1,
           payment_status = 'paid',
           payment_method = $2,
           transaction_id = $3,
           paid_date = CURRENT_TIMESTAMP,
           received_by = 'Online Student Payment',
           notes = CONCAT(COALESCE(notes, ''), ' [Online payment from account: ', $4::text, ']'),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND website_id = $6
       RETURNING *`,
      [totalAmount, payment_method, txnId, account_number ? String(account_number).slice(-4) : 'N/A', cleanPaymentId, website.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Education fee paid successfully.',
      transaction_id: txnId,
      payment: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Error processing student fee payment:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Payment processing failed.' },
      { status: 500 }
    );
  }
}
