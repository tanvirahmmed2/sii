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

    // Verify gateway account if specified
    let targetAccountId = null;
    let gwCode = payment_method || 'bkash';
    if (body.gateway_account_id) {
      const accRes = await queryDb(
        `SELECT id, gateway_code, currency, environment FROM website_payment_gateway_accounts WHERE id = $1 AND website_id = $2 AND is_active = TRUE`,
        [body.gateway_account_id, website.id]
      );
      if (accRes.rows.length > 0) {
        targetAccountId = accRes.rows[0].id;
        gwCode = accRes.rows[0].gateway_code;
      }
    }

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
        [totalAmount, gwCode, txnId, cleanPaymentId, website.id]
      );

      // Record in website_payment_transactions ledger
      try {
        await queryDb(`
          INSERT INTO website_payment_transactions (
            website_id, gateway_code, purpose, invoice_ref, payer_name, payer_phone,
            amount, currency, environment, transaction_id, status, gateway_account_id, created_at
          ) VALUES ($1, $2, 'exam_fees', $3, $4, $5, $6, $7, 'live', $8, 'completed', $9, CURRENT_TIMESTAMP)
        `, [
          website.id,
          gwCode,
          rec.invoice_no || `EXAM-INV-${cleanPaymentId}`,
          session.name || 'Student',
          session.number || account_number || null,
          totalAmount,
          website.currency || 'BDT',
          txnId,
          targetAccountId
        ]);
      } catch (txErr) {
        console.warn('Failed recording transaction in ledger:', txErr?.message);
      }

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
      [totalAmount, gwCode, txnId, account_number ? String(account_number).slice(-4) : 'N/A', cleanPaymentId, website.id]
    );

    // Record in website_payment_transactions ledger
    try {
      await queryDb(`
        INSERT INTO website_payment_transactions (
          website_id, gateway_code, purpose, invoice_ref, payer_name, payer_phone,
          amount, currency, environment, transaction_id, status, gateway_account_id, created_at
        ) VALUES ($1, $2, 'education_fees', $3, $4, $5, $6, $7, 'live', $8, 'completed', $9, CURRENT_TIMESTAMP)
      `, [
        website.id,
        gwCode,
        rec.invoice_no || `EDU-INV-${cleanPaymentId}`,
        session.name || 'Student',
        session.number || account_number || null,
        totalAmount,
        website.currency || 'BDT',
        txnId,
        targetAccountId
      ]);
    } catch (txErr) {
      console.warn('Failed recording transaction in ledger:', txErr?.message);
    }

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
