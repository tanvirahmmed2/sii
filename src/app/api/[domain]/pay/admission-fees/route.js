import { NextResponse } from 'next/server';
import { queryDb, pool } from '@/lib/database/db';
import { resolveWebsiteFromRequest } from '@/lib/middleware/creator';

export const dynamic = 'force-dynamic';

/**
 * GET /api/[domain]/pay/admission-fees
 * Search and check admission application fees.
 */
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution not found.' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const identifier = (searchParams.get('identifier') || '').trim();

    // Fetch active gateways for admission fees
    const gwRes = await queryDb(`
      SELECT ga.id, ga.gateway_code AS code, ga.account_name, ga.account_number,
             ga.environment, ga.currency, ga.is_default,
             gw.name AS label, gw.category, gw.logo_icon
      FROM website_payment_gateway_accounts ga
      JOIN website_payment_gateways gw ON gw.code = ga.gateway_code
      WHERE ga.website_id = $1 AND ga.is_active = TRUE
      ORDER BY ga.is_default DESC, ga.id ASC
    `, [website.id]);

    // Sanitize gateways
    const sanitizedGateways = gwRes.rows.map(gw => ({
      id: gw.id,
      code: gw.code,
      label: gw.label || gw.code.toUpperCase(),
      category: gw.category,
      logo_icon: gw.logo_icon,
      is_default: gw.is_default
    }));

    if (!identifier) {
      return NextResponse.json({
        success: true,
        message: 'Provide Application Tracking No or Phone to check admission fees.',
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

    const appRes = await queryDb(`
      SELECT a.id, a.application_no, a.applicant_name, a.email, a.phone,
             a.status, a.admission_id, adm.title AS circular_title,
             adm.fee_amount, adm.fee_currency
      FROM website_admission_applicants a
      LEFT JOIN website_admissions adm ON adm.id = a.admission_id
      WHERE a.website_id = $1
        AND (
          a.application_no = $2 OR
          a.phone = $2 OR
          a.email = $2 OR
          CAST(a.id AS TEXT) = $2
        )
      ORDER BY a.id DESC LIMIT 1
    `, [website.id, identifier]);

    if (appRes.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No admission applicant found matching "${identifier}".`,
        available_gateways: sanitizedGateways
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

    // Fetch admission fee invoice
    const feeRes = await queryDb(`
      SELECT p.id, p.invoice_no, p.amount, p.currency, p.payment_status,
             a.application_no, a.applicant_name,
             COALESCE(c.title, 'Admission Application Fee') AS title,
             p.amount AS net_due
      FROM website_admission_fee_payments p
      JOIN website_admission_applicants a ON a.id = p.applicant_id
      LEFT JOIN website_admissions c ON c.id = p.admission_id
      WHERE p.website_id = $1 AND p.applicant_id = $2
        AND p.payment_status IN ('pending', 'unpaid')
      ORDER BY p.id ASC
    `, [website.id, applicant.id]);

    const admissionDues = feeRes.rows.map(r => ({
      ...r,
      category: 'admission_fees',
      category_label: 'Admission Application Fee',
      amount: parseFloat(r.amount),
      net_due: parseFloat(r.net_due)
    }));

    const totalDue = admissionDues.reduce((acc, curr) => acc + (curr.net_due || 0), 0);

    return NextResponse.json({
      success: true,
      applicant,
      dues: { admission: admissionDues },
      summary: {
        total_unpaid_items: admissionDues.length,
        total_due_amount: totalDue,
        currency: applicant.fee_currency || 'BDT'
      },
      available_gateways: sanitizedGateways
    });
  } catch (error) {
    console.error('Error in GET /pay/admission-fees:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/[domain]/pay/admission-fees
 * Process payment for admission fee invoice.
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
      SELECT p.*, a.application_no, a.applicant_name, a.email, a.phone,
             a.id AS applicant_record_id, c.title AS circular_title
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
      return NextResponse.json({ success: false, error: 'Admission fee has already been settled.' }, { status: 400 });
    }

    const dueAmount = parseFloat(inv.amount);
    const txnId = `TXN-${gw.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const payerPhone = payment_details.account_number || payment_details.phone || inv.phone;

    // Update fee payment record
    await client.query(`
      UPDATE website_admission_fee_payments
      SET payment_status = 'paid',
          gateway_code = $1,
          transaction_id = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [gw, txnId, inv.id]);

    // Advance applicant status to fee_paid and step = 2 (Upload photo & signature)
    await client.query(`
      UPDATE website_admission_applicants
      SET status = 'fee_paid',
          step = 2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [inv.applicant_record_id]);

    // Record transaction in audit ledger
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
      website.id, gateway_account_id || null, gw, inv.invoice_no,
      inv.applicant_name, inv.email, payerPhone, dueAmount,
      inv.currency || 'BDT', txnId, `ONLINE-GATEWAY-${gw.toUpperCase()}`,
      `Admission Fee for ${inv.application_no} (${inv.circular_title})`
    ]);

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: 'Admission application fee paid successfully! Proceeding to document upload.',
      transaction_id: txnId,
      receipt: {
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
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in POST /pay/admission-fees:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
