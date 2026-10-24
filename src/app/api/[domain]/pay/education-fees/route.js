import { NextResponse } from 'next/server';
import { queryDb, pool } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { fetchAssignedGatewaysForPurpose } from 'src/lib/database/paymentGateways';

export const dynamic = 'force-dynamic';

/**
 * GET /api/[domain]/pay/education-fees
 * Look up student tuition and academic fees.
 */
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution not found.' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const identifier = (searchParams.get('identifier') || '').trim();

    // Fetch assigned gateways specifically for education fees
    const sanitizedGateways = await fetchAssignedGatewaysForPurpose(website.id, 'education_fees');

    if (!identifier) {
      return NextResponse.json({
        success: true,
        message: 'Provide Student ID, Roll No, or Registration No to check education fees.',
        available_gateways: sanitizedGateways
      });
    }

    const maskEmail = (email) => {
      if (!email || typeof email !== 'string') return null;
      const parts = email.split('@');
      if (parts.length !== 2) return '***@***';
      const name = parts[0];
      const host = parts[1];
      if (name.length <= 2) return `${name.charAt(0)}*@${host}`;
      return `${name.slice(0, 2)}****${name.slice(-1)}@${host}`;
    };

    const maskPhone = (phone) => {
      if (!phone || typeof phone !== 'string') return null;
      const clean = phone.trim();
      if (clean.length <= 4) return '****';
      return `${clean.slice(0, 3)}*****${clean.slice(-3)}`;
    };

    const studentRes = await queryDb(`
      SELECT s.id, s.registration_no, s.roll_no, s.student_unique_id,
             COALESCE(s.name, i.data->>'name', 'Student') AS name,
             COALESCE(s.email, i.data->>'email') AS raw_email,
             COALESCE(s.number, i.data->>'phone', i.data->>'number') AS raw_phone,
             c.name AS class_name, c.id AS class_id
      FROM website_students s
      LEFT JOIN website_student_info i ON i.student_id = s.id
      LEFT JOIN website_classes c ON c.id = s.class_id
      WHERE s.website_id = $1
        AND (
          s.student_unique_id = $2 OR
          s.roll_no = $2 OR
          s.registration_no = $2 OR
          s.email = $2 OR
          i.data->>'email' = $2 OR
          s.number = $2 OR
          i.data->>'phone' = $2 OR
          i.data->>'number' = $2
        )
      LIMIT 1
    `, [website.id, identifier]);

    if (studentRes.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No enrolled student found matching "${identifier}".`,
        available_gateways: sanitizedGateways
      }, { status: 404 });
    }

    const row = studentRes.rows[0];
    const student = {
      id: row.id,
      name: row.name,
      student_unique_id: row.student_unique_id,
      roll_no: row.roll_no,
      registration_no: row.registration_no,
      class_name: row.class_name,
      masked_email: maskEmail(row.raw_email),
      masked_phone: maskPhone(row.raw_phone)
    };

    // Fetch unpaid education fees
    const feeRes = await queryDb(`
      SELECT id, invoice_no, title, month_name, amount, fine_amount, paid_amount,
             currency, due_date, payment_status,
             (amount + fine_amount - paid_amount) AS net_due
      FROM website_education_fee_payments
      WHERE website_id = $1 AND student_id = $2
        AND payment_status IN ('unpaid', 'partially_paid')
      ORDER BY id ASC
    `, [website.id, student.id]);

    const educationDues = feeRes.rows.map(r => ({
      ...r,
      category: 'education_fees',
      category_label: 'Education & Tuition Fee',
      amount: parseFloat(r.amount),
      fine_amount: parseFloat(r.fine_amount || 0),
      paid_amount: parseFloat(r.paid_amount || 0),
      net_due: parseFloat(r.net_due)
    }));

    const totalDue = educationDues.reduce((acc, curr) => acc + (curr.net_due || 0), 0);

    return NextResponse.json({
      success: true,
      student,
      dues: { education: educationDues },
      summary: {
        total_unpaid_items: educationDues.length,
        total_due_amount: totalDue,
        currency: 'BDT'
      },
      available_gateways: sanitizedGateways
    });
  } catch (error) {
    console.error('Error in GET /pay/education-fees:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/[domain]/pay/education-fees
 * Process payment for education/tuition fee invoice.
 */
export async function POST(request, context) {
  const client = await pool.connect();
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution not found.' }, { status: 404 });
    }

    const body = await request.json();
    const { invoice_id, gateway_code, gateway_account_id, payment_details = {} } = body;

    if (!invoice_id) {
      return NextResponse.json({ success: false, error: 'Missing invoice ID.' }, { status: 400 });
    }
    if (!gateway_code) {
      return NextResponse.json({ success: false, error: 'Please choose a payment gateway.' }, { status: 400 });
    }

    const gw = gateway_code.toLowerCase();

    await client.query('BEGIN');

    const invRes = await client.query(`
      SELECT p.*, s.student_unique_id, s.full_name, s.email, s.mobile_number
      FROM website_education_fee_payments p
      JOIN website_students s ON s.id = p.student_id
      WHERE p.id = $1 AND p.website_id = $2
      FOR UPDATE OF p
    `, [invoice_id, website.id]);

    if (invRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: 'Education fee invoice not found.' }, { status: 404 });
    }

    const inv = invRes.rows[0];
    if (inv.payment_status === 'paid') {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: 'This invoice has already been settled.' }, { status: 400 });
    }

    const dueAmount = parseFloat(inv.amount) + parseFloat(inv.fine_amount || 0) - parseFloat(inv.paid_amount || 0);
    const txnId = `TXN-${gw.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const payerPhone = payment_details.account_number || payment_details.phone || inv.mobile_number;

    let finalAccountId = gateway_account_id || null;
    if (!finalAccountId) {
      const assigned = await fetchAssignedGatewaysForPurpose(website.id, 'education_fees');
      const match = assigned.find(g => g.code === gw);
      if (match) finalAccountId = match.id;
    }

    // Update invoice record
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

    // Record in transaction audit ledger
    await client.query(`
      INSERT INTO website_payment_transactions (
        website_id, gateway_account_id, gateway_code, purpose, invoice_ref,
        student_id, payer_name, payer_email, payer_phone, amount,
        currency, status, transaction_id, gateway_reference, notes
      ) VALUES (
        $1, $2, $3, 'education_fees', $4,
        $5, $6, $7, $8, $9,
        $10, 'completed', $11, $12, $13
      )
    `, [
      website.id, finalAccountId, gw, inv.invoice_no,
      inv.student_id, inv.full_name, inv.email, payerPhone, dueAmount,
      inv.currency || 'BDT', txnId, `ONLINE-GATEWAY-${gw.toUpperCase()}`,
      `Paid tuition fee for ${inv.title || inv.month_name}`
    ]);

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: 'Education fee settled successfully!',
      transaction_id: txnId,
      receipt: {
        invoice_no: inv.invoice_no,
        title: inv.title || 'Tuition Fee',
        payer_name: inv.full_name,
        student_id: inv.student_unique_id,
        amount: dueAmount,
        currency: inv.currency || 'BDT',
        transaction_id: txnId,
        payment_date: new Date().toISOString()
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in POST /pay/education-fees:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
