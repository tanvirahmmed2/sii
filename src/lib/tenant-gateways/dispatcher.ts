import pool from '@/lib/database/db';
import { decryptCredentials } from './crypto';
import * as bkashGateway from './bkash';
import * as epsGateway from './eps';
import * as sslcommerzGateway from './sslcommerz';
import * as surjopayGateway from './surjopay';
import * as sonaliGateway from './sonali';
import * as stripeGateway from './stripe';
import * as paypalGateway from './paypal';
import * as paddleGateway from './paddle';

export const GATEWAY_DRIVERS: Record<string, any> = {
  bkash: bkashGateway,
  eps: epsGateway,
  sslcommerz: sslcommerzGateway,
  surjopay: surjopayGateway,
  sonali_gateway: sonaliGateway,
  sonali_payment: sonaliGateway,
  stripe: stripeGateway,
  stripe_connect: stripeGateway,
  paypal: paypalGateway,
  paddle: paddleGateway
};

export async function resolveTenantGatewayForTask(client: any, { websiteId, purpose = 'education_fees', hostelId = null, preferredGateway = null }: {
  websiteId: any;
  purpose?: string;
  hostelId?: any;
  preferredGateway?: any;
}): Promise<any> {
  const db = client || pool;

  const routeRes = await db.query(
    `SELECT
       pa.id AS assignment_id,
       pa.purpose,
       pa.gateway_account_id,
       pa.fallback_gateway_account_id,
       ga.id AS account_id,
       ga.gateway_code,
       ga.account_name,
       ga.account_number,
       ga.environment,
       ga.currency AS account_currency,
       ga.credentials,
       ga.payout_details,
       ga.is_active
     FROM website_payment_purpose_assignments pa
     JOIN website_payment_gateway_accounts ga ON ga.id = pa.gateway_account_id
     WHERE pa.website_id = $1
       AND pa.is_active = TRUE
       AND ga.is_active = TRUE
       AND pa.purpose IN ($2, 'all_fees')
       AND ($3::bigint IS NULL OR pa.hostel_id = $3 OR pa.hostel_id IS NULL)
     ORDER BY
       CASE WHEN pa.purpose = $2 THEN 1 ELSE 2 END,
       CASE WHEN pa.hostel_id = $3 THEN 1 ELSE 2 END
     LIMIT 1`,
    [websiteId, purpose, hostelId]
  );

  if (routeRes.rows.length > 0 && (!preferredGateway || routeRes.rows[0].gateway_code === preferredGateway)) {
    const row = routeRes.rows[0];
    return {
      ...row,
      credentials: decryptCredentials(row.credentials)
    };
  }

  const fallbackRes = await db.query(
    `SELECT
       id AS gateway_account_id,
       id AS account_id,
       gateway_code,
       account_name,
       account_number,
       environment,
       currency AS account_currency,
       credentials,
       payout_details,
       is_active
     FROM website_payment_gateway_accounts
     WHERE website_id = $1
       AND is_active = TRUE
       AND ($2::varchar IS NULL OR gateway_code = $2)
     ORDER BY is_default DESC, id ASC
     LIMIT 1`,
    [websiteId, preferredGateway]
  );

  if (fallbackRes.rows.length === 0) {
    throw new Error('No active payment gateway account configured for this institution.');
  }

  const row = fallbackRes.rows[0];
  return {
    ...row,
    credentials: decryptCredentials(row.credentials)
  };
}

export async function testGatewayAccount(gatewayCode: string, credentials: any, environment = 'sandbox'): Promise<any> {
  const driver = GATEWAY_DRIVERS[gatewayCode];
  if (!driver || typeof driver.testConnection !== 'function') {
    return {
      success: false,
      message: `No driver available for gateway code: ${gatewayCode}`
    };
  }
  const plainCredentials = decryptCredentials(credentials);
  return await driver.testConnection(plainCredentials, environment);
}

export async function initiatePayment({
  client,
  websiteId,
  domain,
  purpose = 'education_fees',
  invoiceRef,
  studentId = null,
  amount,
  currency = 'BDT',
  payerName,
  payerEmail,
  payerPhone,
  hostelId = null,
  preferredGateway = null,
  callbackUrl,
  cancelUrl
}: any): Promise<any> {
  const db = client || pool;
  const account = await resolveTenantGatewayForTask(db, {
    websiteId,
    purpose,
    hostelId,
    preferredGateway
  });

  const driver = GATEWAY_DRIVERS[account.gateway_code];
  if (!driver || typeof driver.createPayment !== 'function') {
    throw new Error(`Payment driver for [${account.gateway_code}] is not configured.`);
  }

  const defaultCallback = callbackUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${domain}/pay/callback`;
  const defaultCancel = cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${domain}/pay/callback?status=cancelled`;

  const orderRef = invoiceRef || `INV-${websiteId}-${Date.now().toString(36).toUpperCase()}`;

  const paymentInit = await driver.createPayment({
    credentials: account.credentials,
    environment: account.environment,
    amount: Number(amount),
    currency: account.account_currency || currency,
    invoiceRef: orderRef,
    callbackUrl: defaultCallback,
    cancelUrl: defaultCancel,
    payerName,
    payerEmail,
    payerPhone
  });

  const grossAmount = Number(Number(amount).toFixed(2));
  const txInsert = await db.query(
    `INSERT INTO website_payment_transactions (
       website_id,
       gateway_account_id,
       gateway_code,
       purpose,
       invoice_ref,
       student_id,
       payer_name,
       payer_email,
       payer_phone,
       gross_amount,
       amount,
       currency,
       environment,
       status,
       checkout_url
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, $11, $12, 'pending', $13)
     RETURNING id`,
    [
      websiteId,
      account.account_id,
      account.gateway_code,
      purpose,
      orderRef,
      studentId,
      payerName,
      payerEmail || null,
      payerPhone || null,
      grossAmount,
      account.account_currency || currency,
      account.environment,
      paymentInit.checkoutUrl
    ]
  );

  const txId = txInsert.rows[0].id;

  return {
    success: true,
    transactionRecordId: txId,
    invoiceRef: orderRef,
    gateway: account.gateway_code,
    environment: account.environment,
    currency: account.account_currency || currency,
    amount: grossAmount,
    checkoutUrl: paymentInit.checkoutUrl,
    paymentData: paymentInit
  };
}

export async function verifyPaymentResponse({
  gatewayCode,
  credentials,
  environment = 'sandbox',
  query = {},
  body = {},
  orderId = null,
  tranId = null,
  paymentId = null,
  sessionId = null,
  valId = null
}: any): Promise<any> {
  const driver = GATEWAY_DRIVERS[gatewayCode];
  if (!driver) {
    throw new Error(`Unsupported gateway for verification: ${gatewayCode}`);
  }

  const plainCredentials = decryptCredentials(credentials);

  if (gatewayCode === 'bkash' && typeof driver.executePayment === 'function') {
    return await driver.executePayment({
      credentials: plainCredentials,
      environment,
      paymentId: paymentId || query.paymentID
    });
  }

  if (gatewayCode === 'sslcommerz' && typeof driver.verifyPayment === 'function') {
    return await driver.verifyPayment({
      credentials: plainCredentials,
      environment,
      valId: valId || query.val_id,
      tranId: tranId || query.tran_id
    });
  }

  if (gatewayCode === 'surjopay' && typeof driver.verifyPayment === 'function') {
    return await driver.verifyPayment({
      credentials: plainCredentials,
      environment,
      orderId: orderId || query.order_id || query.sp_order_id
    });
  }

  if ((gatewayCode === 'stripe' || gatewayCode === 'stripe_connect') && typeof driver.verifyPayment === 'function') {
    return await driver.verifyPayment({
      credentials: plainCredentials,
      sessionId: sessionId || query.session_id
    });
  }

  if (gatewayCode === 'paypal' && typeof driver.capturePayment === 'function') {
    return await driver.capturePayment({
      credentials: plainCredentials,
      environment,
      orderId: orderId || query.token
    });
  }

  if (typeof driver.verifyPayment === 'function') {
    return await driver.verifyPayment({
      credentials: plainCredentials,
      environment,
      orderId,
      tranId,
      query,
      body
    });
  }

  return {
    success: true,
    gateway: gatewayCode,
    transactionId: `TX-${Date.now()}`
  };
}
