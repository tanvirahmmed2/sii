import { NextResponse } from 'next/server';
import pool from '@/lib/database/db';
import { verifyPaymentResponse } from '@/lib/tenant-gateways/dispatcher.js';
import { decryptCredentials } from '@/lib/tenant-gateways/crypto.js';

async function handleCallback(request, domain) {
  const client = await pool.connect();
  try {
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());

    let bodyParams = {};
    if (request.method === 'POST') {
      const contentType = request.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        bodyParams = await request.json().catch(() => ({}));
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData().catch(() => new Map());
        bodyParams = Object.fromEntries(formData.entries());
      }
    }

    const merged = { ...searchParams, ...bodyParams };
    const txId = merged.tx || merged.transaction_record_id;
    const invoiceRef = merged.invoiceRef || merged.invoice_ref || merged.order_id || merged.tran_id;
    const paymentID = merged.paymentID || merged.trxID;
    const valId = merged.val_id;
    const tranId = merged.tran_id;
    const spOrderId = merged.sp_order_id || merged.order_id;
    const sessionId = merged.session_id;
    const paypalToken = merged.token;

    let txRow = null;
    if (txId) {
      const res = await client.query(`SELECT * FROM website_payment_transactions WHERE id = $1`, [txId]);
      if (res.rows.length > 0) txRow = res.rows[0];
    }
    if (!txRow && invoiceRef) {
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
      const redirectUrl = `/${domain}/pay?status=error&message=Transaction+record+not+found`;
      return NextResponse.redirect(new URL(redirectUrl, request.url));
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
      body: bodyParams,
      orderId: spOrderId || invoiceRef,
      tranId: tranId,
      paymentId: paymentID,
      sessionId: sessionId,
      valId: valId
    });

    if (verification.success) {
      await client.query('BEGIN');

      await client.query(
        `UPDATE website_payment_transactions
         SET status = 'paid',
             transaction_id = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [verification.transactionId || `TX-${Date.now()}`, txRow.id]
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

      const redirectUrl = `/${domain}/pay?tx=${txRow.id}&status=success&amount=${txRow.gross_amount}`;
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    } else {
      await client.query(
        `UPDATE website_payment_transactions SET status = 'failed', updated_at = NOW() WHERE id = $1`,
        [txRow.id]
      );
      const redirectUrl = `/${domain}/pay?tx=${txRow.id}&status=failed`;
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    const redirectUrl = `/${domain}/pay?status=error&message=${encodeURIComponent(error.message)}`;
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } finally {
    client.release();
  }
}

export async function GET(request, { params }) {
  const { domain } = await params;
  return handleCallback(request, domain);
}

export async function POST(request, { params }) {
  const { domain } = await params;
  return handleCallback(request, domain);
}
