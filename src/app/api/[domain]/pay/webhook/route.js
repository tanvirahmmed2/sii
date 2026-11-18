import { NextResponse } from 'next/server';
import pool from '@/lib/database/db';
import { verifyPaymentResponse } from '@/lib/tenant-gateways/dispatcher.js';
import { decryptCredentials } from '@/lib/tenant-gateways/crypto.js';

export async function POST(request, { params }) {
  const { domain } = await params;
  const client = await pool.connect();

  try {
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());

    let body = {};
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await request.json().catch(() => ({}));
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData().catch(() => new Map());
      body = Object.fromEntries(formData.entries());
    }

    const merged = { ...searchParams, ...body };
    const invoiceRef = merged.invoiceRef || merged.invoice_ref || merged.order_id || merged.tran_id || merged.data?.object?.client_reference_id;
    const paymentID = merged.paymentID || merged.trxID;
    const valId = merged.val_id;
    const tranId = merged.tran_id;
    const spOrderId = merged.sp_order_id || merged.order_id;
    const sessionId = merged.session_id || (merged.data?.object?.id?.startsWith('cs_') ? merged.data.object.id : null);
    const orderId = merged.resource?.id || merged.token || spOrderId;

    let txRow = null;
    if (invoiceRef) {
      const res = await client.query(
        `SELECT * FROM website_payment_transactions WHERE invoice_ref = $1 ORDER BY id DESC LIMIT 1`,
        [invoiceRef]
      );
      if (res.rows.length > 0) txRow = res.rows[0];
    }
    if (!txRow && tranId) {
      const res = await client.query(
        `SELECT * FROM website_payment_transactions WHERE invoice_ref LIKE $1 ORDER BY id DESC LIMIT 1`,
        [`%${tranId}%`]
      );
      if (res.rows.length > 0) txRow = res.rows[0];
    }

    if (!txRow) {
      return NextResponse.json({ received: true, note: 'No matching transaction ledger' }, { status: 200 });
    }

    if (txRow.status === 'paid') {
      return NextResponse.json({ received: true, note: 'Already settled' }, { status: 200 });
    }

    let credentials = {};
    let environment = 'sandbox';
    if (txRow.gateway_account_id) {
      const accRes = await client.query(
        `SELECT credentials, environment FROM website_payment_gateway_accounts WHERE id = $1`,
        [txRow.gateway_account_id]
      );
      if (accRes.rows.length > 0) {
        credentials = decryptCredentials(accRes.rows[0].credentials);
        environment = accRes.rows[0].environment || 'sandbox';
      }
    }

    const verification = await verifyPaymentResponse({
      gatewayCode: txRow.gateway_code,
      credentials,
      environment,
      query: merged,
      body,
      orderId: orderId || invoiceRef,
      tranId,
      paymentId: paymentID,
      sessionId,
      valId
    });

    if (verification.success) {
      await client.query('BEGIN');

      await client.query(
        `UPDATE website_payment_transactions
         SET status = 'paid',
             transaction_id = $1,
             raw_response = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [verification.transactionId || `TX-${Date.now()}`, JSON.stringify(merged), txRow.id]
      );

      if (txRow.purpose === 'admission_fees' && txRow.invoice_ref) {
        await client.query(
          `UPDATE website_admission_applicants
           SET payment_status = 'paid', updated_at = NOW()
           WHERE application_number = $1 OR tracking_number = $1`,
          [txRow.invoice_ref]
        ).catch(() => {});
      }

      await client.query('COMMIT');
    }

    return NextResponse.json({ received: true, status: verification.success ? 'paid' : 'unverified' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    return NextResponse.json({ received: false, error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
