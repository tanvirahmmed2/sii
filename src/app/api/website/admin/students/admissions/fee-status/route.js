import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { isAdmin, isRegister, isCashier, verifyJWT } from '@/lib/auth';
import { sendEmail } from '@/lib/brevo';

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
      const transactionNo = `TXN-ADM-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
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
      const origin = request.headers.get('origin') || 'http://localhost:3000';
      const uploadLink = `${origin}/admission/upload/${applicant.id}`;

      try {
        await sendEmail({
          to: applicant.email,
          toName: applicant.applicant_name,
          subject: `Payment Completed - Action Required: Upload Photo & Signature`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
              <div style="text-align: center; padding-bottom: 16px; border-b: 1px solid #f1f5f9;">
                <h2 style="color: #16a34a; margin: 0;">Payment Confirmed!</h2>
                <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Admission fee payment has been successfully recorded</p>
              </div>

              <div style="margin: 20px 0; background: #f0fdf4; padding: 16px; border-radius: 12px; border: 1px solid #bbf7d0;">
                <p style="margin: 6px 0; font-size: 14px;"><strong>Applicant Name:</strong> ${applicant.applicant_name}</p>
                <p style="margin: 6px 0; font-size: 14px;"><strong>Applicant Number:</strong> APP-1000${applicant.id}</p>
                <p style="margin: 6px 0; font-size: 14px;"><strong>Amount Paid:</strong> BDT ${actualAmountPaid.toFixed(2)} (${method})</p>
                <p style="margin: 6px 0; font-size: 14px;"><strong>Status:</strong> <span style="color: #15803d; font-weight: bold;">PAID</span></p>
              </div>

              <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 16px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
                <h3 style="color: #0f172a; margin: 0 0 8px 0;">Final Step: Provide Photo & Signature</h3>
                <p style="color: #475569; font-size: 13px; margin: 0 0 16px 0;">
                  Please click the link below to upload your profile photo and candidate signature so your application can be reviewed for final approval by administration.
                </p>
                <a href="${uploadLink}" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 9999px; font-weight: bold; font-size: 14px;">
                  Upload Photo & Signature
                </a>
              </div>

              <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
                School Academic Administration Board
              </p>
            </div>
          `
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
