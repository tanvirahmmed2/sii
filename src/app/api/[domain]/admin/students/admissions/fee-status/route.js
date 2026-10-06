import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from 'src/lib/database/db';
import { isAdmin, isRegister, isCashier, verifyJWT } from 'src/lib/middleware/developer';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo';
import { getBaseUrl } from 'src/lib/database/secret';
import { generateToken } from 'src/lib/utils/random';

export async function PUT(request) {
  let client;
  try {
    const authorized = (await isAdmin()) || (await isRegister()) || (await isCashier());
    if (!authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('fit-staff')?.value;
    let staffEmail = null;
    if (token) {
      const decoded = verifyJWT(token);
      staffEmail = decoded?.email || null;
    }

    const body = await request.json();
    const { 
      student_admission_id, 
      status, 
      amount_paid, 
      payment_method, 
      transaction_id, 
      remarks 
    } = body;
    const normStatus = status ? status.toLowerCase() : '';

    if (!student_admission_id || !normStatus || !['unpaid', 'pending', 'paid', 'cancelled'].includes(normStatus)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Student Admission ID and valid fee status (unpaid/pending/paid/cancelled) are required.' 
      }, { status: 400 });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    // Fetch applicant info
    const admRes = await client.query(`
      SELECT sa.id, sa.applicant_name, sa.email, sa.phone, adm.title AS circular_title, adm.fees 
      FROM student_admissions sa
      LEFT JOIN admissions adm ON sa.admission_id = adm.id
      WHERE sa.id = $1
    `, [parseInt(student_admission_id, 10)]);

    if (admRes.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return NextResponse.json({ success: false, error: 'Admission application not found.' }, { status: 404 });
    }

    const applicant = admRes.rows[0];

    // Check if fee is already paid
    const currentFee = await client.query(
      'SELECT status FROM admission_fees WHERE student_admission_id = $1',
      [parseInt(student_admission_id, 10)]
    );
    if (currentFee.rows.length > 0 && currentFee.rows[0].status === 'paid' && normStatus !== 'paid') {
      await client.query('ROLLBACK');
      client.release();
      return NextResponse.json({ success: false, error: 'Payment is already completed and cannot be reverted.' }, { status: 400 });
    }

    // Update the admission fee status
    let feeResult = await client.query(`
      UPDATE admission_fees
      SET status = $1, billed_by = $2, updated_at = CURRENT_TIMESTAMP
      WHERE student_admission_id = $3
      RETURNING *
    `, [normStatus, staffEmail, parseInt(student_admission_id, 10)]);

    let feeRecord;

    if (feeResult.rows.length === 0) {
      const fees = applicant.fees || 0.00;
      const insertResult = await client.query(`
        INSERT INTO admission_fees (student_admission_id, amount, status, billed_by)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [parseInt(student_admission_id, 10), fees, normStatus, staffEmail]);
      
      feeRecord = insertResult.rows[0];
    } else {
      feeRecord = feeResult.rows[0];
    }

    // If status is Paid, automatically set application status in student_admissions to 'pending'
    if (normStatus === 'paid') {
      await client.query(`
        UPDATE student_admissions
        SET status = 'pending', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [parseInt(student_admission_id, 10)]);

      const actualAmountPaid = amount_paid !== undefined ? parseFloat(amount_paid) : parseFloat(feeRecord.amount);
      const method = payment_method || 'Cash';
      const rmk = remarks || `Collected admission fee for candidate #${student_admission_id}`;

      // Insert into unified transactions ledger (Credit transaction)
      const transactionNo = generateToken(12);
      await client.query(`
        INSERT INTO payment_transactions (
          transaction_number, payment_method, amount, transaction_type, category, 
          reference_id, status, remarks, billed_by, payment_date
        ) VALUES ($1, $2, $3, 'Credit', 'Admission Fee', $4, 'Success', $5, $6, CURRENT_TIMESTAMP)
      `, [
        transactionNo,
        method,
        actualAmountPaid,
        applicant.id,
        rmk,
        staffEmail
      ]);

      // Send email to applicant with upload link for candidate image & signature
      const baseUrl = getBaseUrl(request);
      const uploadLink = `${baseUrl}/admission/upload/${applicant.id}`;

      try {
        const emailHtml = buildStyledEmail({
          title: 'Admission Fee Payment Recorded',
          subtitle: `Application #${applicant.id}`,
          recipientName: applicant.applicant_name,
          bodyParagraphs: [
            `Your admission fee payment of BDT ${actualAmountPaid.toFixed(2)} (${method}) has been confirmed.`,
            'To complete your admission application, please submit your candidate photo and signature using the secure link below.'
          ],
          actionText: 'Upload Photo & Signature',
          actionUrl: uploadLink,
          footerNote: 'Please submit your documents promptly so academic administration can finalize your admission review.'
        });

        await sendEmail({
          to: applicant.email,
          toName: applicant.applicant_name,
          subject: 'Admission Fee Payment Completed - Document Upload Required',
          html: emailHtml,
        });
      } catch (mailErr) {
        console.error('Failed to send upload link email to applicant:', mailErr);
      }
    }

    await client.query('COMMIT');
    client.release();

    return NextResponse.json({
      success: true,
      message: `Admission fee status updated to ${status} successfully. Email sent to applicant.`,
      paylod: { fee: feeRecord }
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('Error during rollback:', rollbackErr);
      }
      client.release();
    }
    console.error('Error updating admission fee status:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
