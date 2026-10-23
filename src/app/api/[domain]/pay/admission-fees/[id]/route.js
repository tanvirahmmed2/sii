import { NextResponse } from 'next/server';
import { queryDb, pool } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { fetchAssignedGatewaysForPurpose, processSecureAdmissionFeePayment } from 'src/lib/database/paymentGateways';

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
    const body = await request.json().catch(() => ({}));
    const { gateway_code, gateway_account_id, payment_details = {} } = body;

    if (!gateway_code) {
      return NextResponse.json({ success: false, error: 'Please select an active payment gateway.' }, { status: 400 });
    }

    await client.query('BEGIN');

    const result = await processSecureAdmissionFeePayment({
      websiteId: website.id,
      applicantIdentifier: id,
      gatewayCode: gateway_code,
      gatewayAccountId: gateway_account_id,
      paymentDetails,
      client
    });

    if (!result.success) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: result.message || 'Admission fee verified and confirmed!',
      transaction_id: result.transaction_id,
      receipt: result.receipt
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in POST /pay/admission-fees/[id]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
