import { NextResponse } from 'next/server';
import { queryDb, pool } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { fetchAssignedGatewaysForPurpose } from 'src/lib/database/paymentGateways';

export const dynamic = 'force-dynamic';

/**
 * GET /api/[domain]/pay/admission-fees/[id]
 * Load applicant invoice details by applicant ID.
 */
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution not found.' }, { status: 404 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing applicant ID.' }, { status: 400 });
    }

    // Active gateways specifically assigned for admission fees
    const sanitizedGateways = await fetchAssignedGatewaysForPurpose(website.id, 'admission_fees');

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

    // Fetch applicant details
    const appRes = await queryDb(`
      SELECT a.id, a.application_no, a.applicant_name, a.email, a.phone,
             a.status, a.admission_id, adm.title AS circular_title,
             COALESCE(af.amount, 500.00) AS fee_amount,
             COALESCE(af.currency, 'BDT') AS fee_currency
      FROM website_admission_applicants a
      LEFT JOIN website_admissions adm ON adm.id = a.admission_id
      LEFT JOIN website_admission_fees af ON af.admission_id = a.admission_id AND af.status = 'active'
      WHERE a.website_id = $1
        AND (
          CAST(a.id AS TEXT) = $2 OR
          a.application_no = $2
        )
      LIMIT 1
    `, [website.id, id]);

    if (appRes.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: `Applicant record #${id} not found.`
      }, { status: 404 });
    }

    const row = appRes.rows[0];
    const applicant = {
      id: row.id,
      application_no: row.application_no,
      applicant_name: row.applicant_name,
      circular_title: row.circular_title,
      fee_amount: row.fee_amount,
      fee_currency: row.fee_currency,
      status: row.status,
      masked_email: maskEmail(row.email),
      masked_phone: maskPhone(row.phone)
    };

    // Fetch fee payment record
    const feeRes = await queryDb(`
      SELECT p.id, p.invoice_no, p.amount, p.currency, p.payment_status,
             a.application_no, a.applicant_name,
             COALESCE(c.title, 'Admission Application Fee') AS title,
             p.amount AS net_due
      FROM website_admission_fee_payments p
      JOIN website_admission_applicants a ON a.id = p.applicant_id
      LEFT JOIN website_admissions c ON c.id = p.admission_id
      WHERE p.website_id = $1 AND p.applicant_id = $2
      ORDER BY p.id DESC LIMIT 1
    `, [website.id, applicant.id]);

    let invoice = feeRes.rows[0] || null;

    if (!invoice) {
      const defaultAmount = parseFloat(applicant.fee_amount || 500);
      invoice = {
        id: `adm-${applicant.id}`,
        applicant_id: applicant.id,
        invoice_no: `INV-ADM-${applicant.application_no}`,
        title: `Admission Fee — ${applicant.circular_title}`,
        amount: defaultAmount,
        net_due: defaultAmount,
        currency: applicant.fee_currency || 'BDT',
        payment_status: applicant.status === 'fee_paid' ? 'paid' : 'pending'
      };
    } else {
      invoice = {
        ...invoice,
        category: 'admission_fees',
        category_label: 'Admission Application Fee',
        amount: parseFloat(invoice.amount),
        net_due: parseFloat(invoice.net_due)
      };
    }

    return NextResponse.json({
      success: true,
      applicant,
      invoice,
      dues: { admission: [invoice] },
      summary: {
        total_unpaid_items: invoice.payment_status === 'paid' ? 0 : 1,
        total_due_amount: invoice.payment_status === 'paid' ? 0 : invoice.net_due,
        currency: applicant.fee_currency || 'BDT'
      },
      available_gateways: sanitizedGateways
    });
  } catch (error) {
    console.error('Error in GET /pay/admission-fees/[id]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/[domain]/pay/admission-fees/[id]
 * Process payment for candidate admission fee.
 */
export async function POST(request, context) {
  const client = await pool.connect();
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution not found.' }, { status: 404 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { gateway_code, gateway_account_id, payment_details = {} } = body;

    if (!gateway_code) {
      return NextResponse.json({ success: false, error: 'Please select a payment gateway.' }, { status: 400 });
    }

    const gw = gateway_code.toLowerCase();

    await client.query('BEGIN');

    // Fetch applicant and invoice
    const appRes = await client.query(`
      SELECT a.id, a.application_no, a.applicant_name, a.email, a.phone, a.status,
             c.title AS circular_title,
             COALESCE(af.amount, 500.00) AS fee_amount,
             COALESCE(af.currency, 'BDT') AS fee_currency,
             p.id AS payment_id, p.payment_status, p.invoice_no
      FROM website_admission_applicants a
      LEFT JOIN website_admissions c ON c.id = a.admission_id
      LEFT JOIN website_admission_fees af ON af.admission_id = a.admission_id AND af.status = 'active'
      LEFT JOIN website_admission_fee_payments p ON p.applicant_id = a.id
      WHERE a.website_id = $1 AND (CAST(a.id AS TEXT) = $2 OR a.application_no = $2)
      FOR UPDATE OF a
    `, [website.id, id]);

    if (appRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: 'Applicant record not found.' }, { status: 404 });
    }

    const app = appRes.rows[0];
    if (app.status === 'fee_paid' || app.payment_status === 'paid') {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: 'This application fee has already been settled.' }, { status: 400 });
    }

    const dueAmount = parseFloat(app.fee_amount || 500);
    const currency = app.fee_currency || 'BDT';
    const txnId = `TXN-${gw.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const payerPhone = payment_details.account_number || payment_details.phone || app.phone;
    const invNo = app.invoice_no || `INV-ADM-${app.application_no}`;

    // Update or Insert into website_admission_fee_payments
    if (app.payment_id) {
      await client.query(`
        UPDATE website_admission_fee_payments
        SET payment_status = 'paid',
            gateway_code = $1,
            transaction_id = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [gw, txnId, app.payment_id]);
    } else {
      await client.query(`
        INSERT INTO website_admission_fee_payments (
          website_id, applicant_id, gateway_code, amount, currency,
          transaction_id, payment_status, invoice_no
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, 'paid', $7
        )
      `, [website.id, app.id, gw, dueAmount, currency, txnId, invNo]);
    }

    // Update applicant updated_at timestamp
    await client.query(`
      UPDATE website_admission_applicants
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [app.id]);

    let finalAccountId = gateway_account_id || null;
    if (!finalAccountId) {
      const assigned = await fetchAssignedGatewaysForPurpose(website.id, 'admission_fees');
      const match = assigned.find(g => g.code === gw);
      if (match) finalAccountId = match.id;
    }

    // Record in transaction audit
    await client.query(`
      INSERT INTO website_payment_transactions (
        website_id, gateway_account_id, gateway_code, purpose, invoice_ref,
        payer_name, payer_email, payer_phone, amount,
        currency, status, transaction_id, gateway_reference, notes
      ) VALUES (
        $1, $2, $3, 'admission_fees', $4,
        $5, $6, $7, $8,
        $9, 'completed', $10, $11, $12
      )
    `, [
      website.id, finalAccountId, gw, invNo,
      app.applicant_name, app.email, payerPhone, dueAmount,
      currency, txnId, `ONLINE-GATEWAY-${gw.toUpperCase()}`,
      `Admission fee payment for ${app.application_no} (${app.circular_title})`
    ]);

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: 'Admission fee verified and settled! Advancing to photo & signature upload.',
      transaction_id: txnId,
      receipt: {
        invoice_no: invNo,
        title: `Admission Fee — ${app.circular_title || 'Application'}`,
        application_no: app.application_no,
        applicant_id: app.id,
        payer_name: app.applicant_name,
        amount: dueAmount,
        currency: currency,
        transaction_id: txnId,
        redirect_url: `/admission/upload/${app.id}`,
        payment_date: new Date().toISOString()
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in POST /pay/admission-fees/[id]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
