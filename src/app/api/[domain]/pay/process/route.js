import { NextResponse } from 'next/server';
import { queryDb, pool } from '@/lib/database/db';
import { resolveDomain } from '@/lib/domain/tenant';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const client = await pool.connect();
  try {
    const { domain } = await params;
    const website = await resolveDomain(domain);

    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Target academic domain not found.' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      category,           // 'education_fees' | 'exam_fees' | 'admission_fees' | 'residential_fees'
      invoice_id,         // record id or 'alloc-{id}'
      gateway_code,       // 'bkash' | 'nagad' | 'rocket' | 'sslcommerz' | 'stripe' | 'sonali_gateway' | 'surjopay' | 'eps'
      gateway_account_id, // optional
      payment_details = {}// account_number, otp, pin, card_number, exp_month, exp_year, cvc, etc.
    } = body;

    // Normalizing category code
    let purpose = category;
    if (purpose === 'education') purpose = 'education_fees';
    if (purpose === 'exam') purpose = 'exam_fees';
    if (purpose === 'admission') purpose = 'admission_fees';
    if (purpose === 'residential') purpose = 'residential_fees';

    const validPurposes = ['education_fees', 'exam_fees', 'admission_fees', 'residential_fees'];
    if (!validPurposes.includes(purpose)) {
      return NextResponse.json(
        { success: false, error: `Invalid payment category: ${category}` },
        { status: 400 }
      );
    }

    if (!gateway_code) {
      return NextResponse.json(
        { success: false, error: 'Please choose an active payment gateway.' },
        { status: 400 }
      );
    }

    // Basic gateway input verification
    const gw = gateway_code.toLowerCase();
    if (['bkash', 'nagad', 'rocket'].includes(gw)) {
      if (!payment_details.account_number || payment_details.account_number.trim().length < 10) {
        return NextResponse.json(
          { success: false, error: `Valid ${gw.toUpperCase()} mobile account number is required.` },
          { status: 400 }
        );
      }
      if (!payment_details.pin || payment_details.pin.trim().length < 4) {
        return NextResponse.json(
          { success: false, error: 'Please enter your secure 4-5 digit PIN.' },
          { status: 400 }
        );
      }
    } else if (gw === 'stripe') {
      if (!payment_details.card_number || payment_details.card_number.replace(/\s+/g, '').length < 14) {
        return NextResponse.json(
          { success: false, error: 'Valid 16-digit card number is required.' },
          { status: 400 }
        );
      }
      if (!payment_details.cvc || payment_details.cvc.length < 3) {
        return NextResponse.json(
          { success: false, error: 'Valid CVC code is required.' },
          { status: 400 }
        );
      }
    } else if (gw === 'sonali_gateway') {
      if (!payment_details.account_number) {
        return NextResponse.json(
          { success: false, error: 'Sonali Bank account / wallet number is required.' },
          { status: 400 }
        );
      }
    }

    await client.query('BEGIN');

    const txnId = `TXN-${gw.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const payerPhone = payment_details.account_number || payment_details.phone || null;
    let paymentResult = null;

    // =========================================================================
    // 1. EDUCATION FEES PAYMENT
    // =========================================================================
    if (purpose === 'education_fees') {
      const invRes = await client.query(`
        SELECT p.*, s.student_unique_id, s.full_name, s.email, s.mobile_number
        FROM website_education_fee_payments p
        JOIN website_students s ON s.id = p.student_id
        WHERE p.id = $1 AND p.website_id = $2
        FOR UPDATE
      `, [invoice_id, website.id]);

      if (invRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'Education fee invoice not found.' }, { status: 404 });
      }

      const inv = invRes.rows[0];
      if (inv.payment_status === 'paid') {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'This education invoice has already been settled.' }, { status: 400 });
      }

      const dueAmount = parseFloat(inv.amount) + parseFloat(inv.fine_amount || 0) - parseFloat(inv.paid_amount || 0);

      // Update invoice
      await client.query(`
        UPDATE website_education_fee_payments
        SET payment_status = 'paid',
            paid_amount = amount + fine_amount,
            payment_method = 'online',
            gateway_code = $1,
            transaction_id = $2,
            paid_date = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [gw, txnId, inv.id]);

      // Record in website_payment_transactions
      await client.query(`
        INSERT INTO website_payment_transactions (
          website_id, gateway_account_id, gateway_code, purpose, invoice_ref,
          student_id, payer_name, payer_email, payer_phone, amount,
          currency, status, transaction_id, gateway_reference, notes
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, 'completed', $12, $13, $14
        )
      `, [
        website.id, gateway_account_id || null, gw, purpose, inv.invoice_no,
        inv.student_id, inv.full_name, inv.email, payerPhone || inv.mobile_number, dueAmount,
        inv.currency || 'BDT', txnId, `ONLINE-GATEWAY-${gw.toUpperCase()}`, `Paid tuition for ${inv.title || inv.month_name}`
      ]);

      paymentResult = {
        invoice_no: inv.invoice_no,
        title: inv.title || 'Tuition Fee',
        payer_name: inv.full_name,
        student_id: inv.student_unique_id,
        amount: dueAmount,
        currency: inv.currency || 'BDT',
        transaction_id: txnId,
        payment_date: new Date().toISOString()
      };
    }

    // =========================================================================
    // 2. EXAM FEES PAYMENT
    // =========================================================================
    else if (purpose === 'exam_fees') {
      const invRes = await client.query(`
        SELECT p.*, s.student_unique_id, s.full_name, s.email, s.mobile_number
        FROM website_exam_fee_payments p
        JOIN website_students s ON s.id = p.student_id
        WHERE p.id = $1 AND p.website_id = $2
        FOR UPDATE
      `, [invoice_id, website.id]);

      if (invRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'Examination fee record not found.' }, { status: 404 });
      }

      const inv = invRes.rows[0];
      if (inv.payment_status === 'paid') {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'This examination fee has already been settled.' }, { status: 400 });
      }

      const dueAmount = parseFloat(inv.amount);

      // Update invoice
      await client.query(`
        UPDATE website_exam_fee_payments
        SET payment_status = 'paid',
            paid_amount = amount,
            payment_method = 'online',
            gateway_code = $1,
            transaction_id = $2,
            paid_date = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [gw, txnId, inv.id]);

      // Automatically issue admit card if candidate record exists
      if (inv.exam_id && inv.student_id) {
        await client.query(`
          UPDATE website_exam_candidates
          SET admit_issued = true, updated_at = CURRENT_TIMESTAMP
          WHERE website_id = $1 AND exam_id = $2 AND student_id = $3
        `, [website.id, inv.exam_id, inv.student_id]);
      }

      // Record transaction
      await client.query(`
        INSERT INTO website_payment_transactions (
          website_id, gateway_account_id, gateway_code, purpose, invoice_ref,
          student_id, payer_name, payer_email, payer_phone, amount,
          currency, status, transaction_id, gateway_reference, notes
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, 'completed', $12, $13, $14
        )
      `, [
        website.id, gateway_account_id || null, gw, purpose, inv.invoice_no,
        inv.student_id, inv.full_name, inv.email, payerPhone || inv.mobile_number, dueAmount,
        inv.currency || 'BDT', txnId, `ONLINE-GATEWAY-${gw.toUpperCase()}`, `Paid examination fee for ${inv.title}`
      ]);

      paymentResult = {
        invoice_no: inv.invoice_no,
        title: inv.title || 'Examination Fee',
        payer_name: inv.full_name,
        student_id: inv.student_unique_id,
        amount: dueAmount,
        currency: inv.currency || 'BDT',
        transaction_id: txnId,
        admit_issued: true,
        payment_date: new Date().toISOString()
      };
    }

    // =========================================================================
    // 3. ADMISSION APPLICATION FEES PAYMENT
    // =========================================================================
    else if (purpose === 'admission_fees') {
      const invRes = await client.query(`
        SELECT p.*, a.application_no, a.applicant_name, a.email, a.phone, a.id AS applicant_record_id,
               c.title AS circular_title
        FROM website_admission_fee_payments p
        JOIN website_admission_applicants a ON a.id = p.applicant_id
        LEFT JOIN website_admissions c ON c.id = p.admission_id
        WHERE p.id = $1 AND p.website_id = $2
        FOR UPDATE
      `, [invoice_id, website.id]);

      if (invRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'Admission fee invoice not found.' }, { status: 404 });
      }

      const inv = invRes.rows[0];
      if (inv.payment_status === 'paid') {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'Admission application fee has already been settled.' }, { status: 400 });
      }

      const dueAmount = parseFloat(inv.amount);

      // Update admission fee payment
      await client.query(`
        UPDATE website_admission_fee_payments
        SET payment_status = 'paid',
            gateway_code = $1,
            transaction_id = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [gw, txnId, inv.id]);

      // Update applicant status and advance to step 2 (Upload documents & photo)
      await client.query(`
        UPDATE website_admission_applicants
        SET status = 'fee_paid',
            step = 2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [inv.applicant_record_id]);

      // Record transaction
      await client.query(`
        INSERT INTO website_payment_transactions (
          website_id, gateway_account_id, gateway_code, purpose, invoice_ref,
          payer_name, payer_email, payer_phone, amount,
          currency, status, transaction_id, gateway_reference, notes
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, 'completed', $11, $12, $13
        )
      `, [
        website.id, gateway_account_id || null, gw, purpose, inv.invoice_no,
        inv.applicant_name, inv.email, payerPhone || inv.phone, dueAmount,
        inv.currency || 'BDT', txnId, `ONLINE-GATEWAY-${gw.toUpperCase()}`, `Admission Fee for ${inv.application_no} (${inv.circular_title})`
      ]);

      paymentResult = {
        invoice_no: inv.invoice_no,
        title: `Admission Fee — ${inv.circular_title || 'Application'}`,
        application_no: inv.application_no,
        applicant_id: inv.applicant_record_id,
        payer_name: inv.applicant_name,
        amount: dueAmount,
        currency: inv.currency || 'BDT',
        transaction_id: txnId,
        redirect_url: `/admission/upload/${inv.applicant_record_id}`,
        payment_date: new Date().toISOString()
      };
    }

    // =========================================================================
    // 4. RESIDENTIAL / HALL FEES PAYMENT (using website_hall_fee_payments)
    // =========================================================================
    else if (purpose === 'residential_fees') {
      let inv = null;
      let dueAmount = 0;

      // Case A: Existing invoice record in website_hall_fee_payments
      if (!String(invoice_id).startsWith('alloc-')) {
        const invRes = await client.query(`
          SELECT p.*, s.student_unique_id, s.full_name, s.email, s.mobile_number,
                 h.name AS hall_name, r.room_number, st.seat_number
          FROM website_hall_fee_payments p
          JOIN website_students s ON s.id = p.student_id
          LEFT JOIN website_halls h ON h.id = p.hall_id
          LEFT JOIN website_hall_rooms r ON r.id = p.room_id
          LEFT JOIN website_hall_room_seats st ON st.id = p.seat_id
          WHERE p.id = $1 AND p.website_id = $2
          FOR UPDATE
        `, [invoice_id, website.id]);

        if (invRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json({ success: false, error: 'Hall fee invoice not found.' }, { status: 404 });
        }

        inv = invRes.rows[0];
        if (inv.payment_status === 'paid') {
          await client.query('ROLLBACK');
          return NextResponse.json({ success: false, error: 'This hall fee invoice has already been settled.' }, { status: 400 });
        }

        dueAmount = parseFloat(inv.amount) + parseFloat(inv.fine_amount || 0) - parseFloat(inv.paid_amount || 0);

        await client.query(`
          UPDATE website_hall_fee_payments
          SET payment_status = 'paid',
              paid_amount = amount + fine_amount,
              payment_method = 'online',
              gateway_code = $1,
              transaction_id = $2,
              paid_date = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `, [gw, txnId, inv.id]);
      }
      // Case B: Dynamic allocation invoice creation
      else {
        const allocId = parseInt(String(invoice_id).replace('alloc-', ''), 10);
        const allocRes = await client.query(`
          SELECT a.*, s.student_unique_id, s.full_name, s.email, s.mobile_number,
                 h.name AS hall_name, r.room_number, st.seat_number
          FROM website_hall_seat_allocations a
          JOIN website_students s ON s.id = a.student_id
          JOIN website_halls h ON h.id = a.hall_id
          JOIN website_hall_rooms r ON r.id = a.room_id
          JOIN website_hall_room_seats st ON st.id = a.seat_id
          WHERE a.id = $1 AND a.website_id = $2 AND a.status = 'active'
        `, [allocId, website.id]);

        if (allocRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json({ success: false, error: 'Active hall seat allocation not found.' }, { status: 404 });
        }

        const alloc = allocRes.rows[0];
        dueAmount = parseFloat(alloc.fee_monthly) || 0;
        const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
        const generatedInv = `INV-HALL-${alloc.student_unique_id || alloc.student_id}-${Date.now().toString().slice(-4)}`;

        const insertRes = await client.query(`
          INSERT INTO website_hall_fee_payments (
            website_id, allocation_id, student_id, hall_id, room_id, seat_id,
            invoice_no, title, month_name, amount, fine_amount, paid_amount,
            currency, due_date, payment_status, payment_method, gateway_code,
            transaction_id, paid_date
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, 0.00, $10,
            'BDT', CURRENT_DATE, 'paid', 'online', $11,
            $12, CURRENT_TIMESTAMP
          ) RETURNING *
        `, [
          website.id, alloc.id, alloc.student_id, alloc.hall_id, alloc.room_id, alloc.seat_id,
          generatedInv, `Hall Seat Rent — ${alloc.hall_name}`, currentMonth, dueAmount,
          gw, txnId
        ]);

        inv = {
          ...insertRes.rows[0],
          student_unique_id: alloc.student_unique_id,
          full_name: alloc.full_name,
          email: alloc.email,
          mobile_number: alloc.mobile_number,
          hall_name: alloc.hall_name,
          room_number: alloc.room_number,
          seat_number: alloc.seat_number
        };
      }

      // Record transaction
      await client.query(`
        INSERT INTO website_payment_transactions (
          website_id, gateway_account_id, gateway_code, purpose, invoice_ref,
          student_id, payer_name, payer_email, payer_phone, amount,
          currency, status, transaction_id, gateway_reference, notes
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, 'completed', $12, $13, $14
        )
      `, [
        website.id, gateway_account_id || null, gw, purpose, inv.invoice_no,
        inv.student_id, inv.full_name, inv.email, payerPhone || inv.mobile_number, dueAmount,
        inv.currency || 'BDT', txnId, `ONLINE-GATEWAY-${gw.toUpperCase()}`, `Paid hall fee for ${inv.hall_name || 'Hostel'} Seat`
      ]);

      paymentResult = {
        invoice_no: inv.invoice_no,
        title: inv.title || 'Hall & Residential Fee',
        payer_name: inv.full_name,
        student_id: inv.student_unique_id,
        amount: dueAmount,
        currency: inv.currency || 'BDT',
        transaction_id: txnId,
        payment_date: new Date().toISOString()
      };
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: 'Payment verified and cleared successfully!',
      transaction_id: txnId,
      receipt: paymentResult
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in POST /pay/process:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Payment processing failed.' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
