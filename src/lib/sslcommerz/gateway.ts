import { SSLCOMMERZ_STORE_ID, SSLCOMMERZ_STORE_PASSWORD, SSLCOMMERZ_IS_LIVE, getBaseUrl } from 'src/lib/database/secret';
import { queryDb } from 'src/lib/database/db';

export function getSslcommerzConfig() {
  const storeId = SSLCOMMERZ_STORE_ID || 'testbox';
  const storePasswd = SSLCOMMERZ_STORE_PASSWORD || 'qwerty';
  const isLive = Boolean(SSLCOMMERZ_IS_LIVE);
  const baseUrl = isLive
    ? 'https://securepay.sslcommerz.com'
    : 'https://sandbox.sslcommerz.com';

  return {
    storeId,
    storePasswd,
    isLive,
    baseUrl,
    initUrl: `${baseUrl}/gwprocess/v4/api.php`,
    validateUrl: `${baseUrl}/validator/api/validationserverAPI.php`,
  };
}

export interface SslcommerzInitiateParams {
  purchaseId?: number | string | null;
  paymentId: number | string;
  creatorId: number | string;
  amount: number;
  currency: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  productName?: string;
  request?: any;
}

export async function initiateSslcommerzPayment(params: SslcommerzInitiateParams) {
  const config = getSslcommerzConfig();
  const origin = getBaseUrl(params.request);

  const tranId = `SSL-${params.paymentId}-${Date.now().toString().slice(-6)}`;

  await queryDb(
    `UPDATE payments SET transaction_id = $1, payment_gateway = 'sslcommerz' WHERE id = $2`,
    [tranId, Number(params.paymentId)]
  );

  const form = new URLSearchParams();
  form.append('store_id', config.storeId);
  form.append('store_passwd', config.storePasswd);
  form.append('total_amount', String(Number(params.amount).toFixed(2)));
  form.append('currency', (params.currency || 'BDT').toUpperCase());
  form.append('tran_id', tranId);
  form.append('success_url', `${origin}/api/payment/sslcommerz/success`);
  form.append('fail_url', `${origin}/api/payment/sslcommerz/fail`);
  form.append('cancel_url', `${origin}/api/payment/sslcommerz/cancel`);
  form.append('ipn_url', `${origin}/api/payment/sslcommerz/ipn`);

  form.append('shipping_method', 'NO');
  form.append('product_name', params.productName || 'SaaS Subscription');
  form.append('product_category', 'Subscription');
  form.append('product_profile', 'non-physical-goods');

  form.append('cus_name', params.customerName || 'Creator');
  form.append('cus_email', params.customerEmail || 'creator@disibin.com');
  form.append('cus_add1', params.customerAddress || 'Dhaka, Bangladesh');
  form.append('cus_city', params.customerCity || 'Dhaka');
  form.append('cus_country', 'Bangladesh');
  form.append('cus_phone', params.customerPhone || '01700000000');

  form.append('value_a', String(params.purchaseId || '0'));
  form.append('value_b', String(params.paymentId));
  form.append('value_c', String(params.creatorId));

  const response = await fetch(config.initUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });

  const data = await response.json();

  if (data.status === 'SUCCESS' && data.GatewayPageURL) {
    await queryDb(
      `UPDATE payments SET gateway_order_id = $1, gateway_response = $2 WHERE id = $3`,
      [data.sessionkey || '', JSON.stringify(data), Number(params.paymentId)]
    );

    return {
      success: true,
      gatewayUrl: data.GatewayPageURL,
      sessionKey: data.sessionkey,
      tranId,
      raw: data,
    };
  }

  throw new Error(data.failedreason || data.message || 'SSLCommerz initiation failed');
}

export async function validateSslcommerzPayment(valId: string) {
  const config = getSslcommerzConfig();
  const url = `${config.validateUrl}?val_id=${encodeURIComponent(valId)}&store_id=${encodeURIComponent(
    config.storeId
  )}&store_passwd=${encodeURIComponent(config.storePasswd)}&v=1&format=json`;

  const response = await fetch(url, { method: 'GET' });
  const data = await response.json();

  const isValid = data.status === 'VALID' || data.status === 'VALIDATED';

  return {
    isValid,
    status: data.status,
    tranId: data.tran_id,
    amount: Number(data.amount || 0),
    currency: data.currency,
    cardType: data.card_type,
    bankTranId: data.bank_tran_id,
    cardIssuer: data.card_issuer,
    cardBrand: data.card_brand,
    raw: data,
  };
}

export async function processSuccessfulPayment({
  paymentId,
  purchaseId,
  tranId,
  valId,
  gatewayResponse,
  processedByDeveloperId,
  paymentMethod = 'sslcommerz',
  manualNotes,
}: {
  paymentId: number;
  purchaseId?: number;
  tranId?: string;
  valId?: string;
  gatewayResponse?: any;
  processedByDeveloperId?: number | null;
  paymentMethod?: string;
  manualNotes?: string;
}) {
  const payRes = await queryDb(
    `SELECT pay.*, 
            COALESCE(pay.billing_cycle, pu.billing_cycle, 'monthly') AS resolved_billing_cycle,
            COALESCE(pay.package_id, pu.package_id) AS resolved_package_id,
            pu.id AS pur_id, pu.status AS pur_status,
            p.name AS package_name
     FROM payments pay
     LEFT JOIN purchases pu ON pay.purchase_id = pu.id
     LEFT JOIN packages p ON COALESCE(pay.package_id, pu.package_id) = p.id
     WHERE pay.id = $1 LIMIT 1`,
    [paymentId]
  );

  if (payRes.rows.length === 0) {
    throw new Error('Payment record not found');
  }

  const payment = payRes.rows[0];
  const pId = purchaseId || payment.purchase_id || payment.pur_id || null;
  const targetPackageId = payment.resolved_package_id || payment.package_id;
  const billingCycle = payment.resolved_billing_cycle || payment.billing_cycle || 'monthly';

  if (payment.status === 'successful') {
    return { success: true, message: 'Payment already processed successfully', payment };
  }

  const isYearly = String(billingCycle).toLowerCase() === 'yearly';
  const durationDays = isYearly ? 365 : 30;
  const payAmount = Number(payment.amount);
  const payCurrency = (payment.currency || 'BDT').toUpperCase();
  const effectiveTranId = tranId || payment.transaction_id || `TXN-${Date.now()}`;

  await queryDb('BEGIN');
  try {
    await queryDb(
      `UPDATE payments 
       SET status = 'successful',
           transaction_id = COALESCE($1, transaction_id),
           gateway_order_id = COALESCE($2, gateway_order_id),
           gateway_response = COALESCE($3, gateway_response),
           payment_method = $4,
           processed_by_developer_id = $5,
           manual_payment_notes = COALESCE($6, manual_payment_notes),
           payment_date = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [
        effectiveTranId,
        valId || null,
        gatewayResponse ? JSON.stringify(gatewayResponse) : null,
        paymentMethod,
        processedByDeveloperId || null,
        manualNotes || null,
        paymentId,
      ]
    );

    await queryDb(
      `INSERT INTO payment_transactions (
        payment_id, creator_id, transaction_id, amount, currency,
        payment_gateway, payment_method, gateway_transaction_id,
        gateway_order_id, gateway_response, processed_by_developer_id,
        manual_payment_notes, status, paid_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10, $11,
        $12, 'successful', CURRENT_TIMESTAMP
      )`,
      [
        paymentId,
        payment.creator_id,
        effectiveTranId,
        payAmount,
        payCurrency,
        payment.payment_gateway || 'sslcommerz',
        paymentMethod,
        effectiveTranId,
        valId || null,
        gatewayResponse ? JSON.stringify(gatewayResponse) : null,
        processedByDeveloperId || null,
        manualNotes || null,
      ]
    );

    if (pId) {
      await queryDb(
        `UPDATE purchases
         SET status = 'completed',
             period_start = CURRENT_TIMESTAMP,
             period_end = CURRENT_TIMESTAMP + ($1 || ' days')::interval,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [durationDays, pId]
      );
    }

    if (targetPackageId) {
      const subCheck = await queryDb(
        `SELECT id FROM subscriptions WHERE creator_id = $1 AND package_id = $2 ORDER BY id DESC LIMIT 1`,
        [payment.creator_id, targetPackageId]
      );

      if (subCheck.rows.length > 0) {
        await queryDb(
          `UPDATE subscriptions
           SET status = 'active',
               payment_id = $1,
               purchase_id = $2,
               billing_cycle = $3,
               current_period_start = CURRENT_TIMESTAMP,
               current_period_end = CURRENT_TIMESTAMP + ($4 || ' days')::interval,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $5`,
          [paymentId, pId || null, billingCycle, durationDays, subCheck.rows[0].id]
        );
      } else {
        await queryDb(
          `INSERT INTO subscriptions (
            creator_id, package_id, payment_id, purchase_id, status, billing_cycle,
            current_period_start, current_period_end
          ) VALUES ($1, $2, $3, $4, 'active', $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ($6 || ' days')::interval)`,
          [payment.creator_id, targetPackageId, paymentId, pId || null, billingCycle, durationDays]
        );
      }
    }

    const balRes = await queryDb(
      `SELECT available_balance FROM platform_balances WHERE currency = $1 LIMIT 1`,
      [payCurrency]
    );
    const prevBalance = balRes.rows.length > 0 ? Number(balRes.rows[0].available_balance) : 0;
    const newBalance = prevBalance + payAmount;

    await queryDb(
      `INSERT INTO platform_balances (currency, total_revenue, available_balance, pending_balance, total_withdrawn)
       VALUES ($1, $2, $2, 0.00, 0.00)
       ON CONFLICT (currency) DO UPDATE 
       SET total_revenue = platform_balances.total_revenue + EXCLUDED.total_revenue,
           available_balance = platform_balances.available_balance + EXCLUDED.available_balance,
           updated_at = CURRENT_TIMESTAMP`,
      [payCurrency, payAmount]
    );

    await queryDb(
      `INSERT INTO cashflows (
        title, category, flow_type, amount, currency, balance_after,
        reference_type, reference_id, creator_id, developer_id,
        payment_method, metadata
      ) VALUES (
        $1, 'subscription', 'inflow', $2, $3, $4,
        'payment', $5, $6, $7,
        $8, $9
      )`,
      [
        `Subscription Payment for Invoice #${payment.invoice_no || paymentId}`,
        payAmount,
        payCurrency,
        newBalance,
        paymentId,
        payment.creator_id,
        processedByDeveloperId || null,
        paymentMethod,
        JSON.stringify({
          payment_id: paymentId,
          package_id: targetPackageId,
          billing_cycle: billingCycle,
          tran_id: effectiveTranId,
          val_id: valId,
        }),
      ]
    );

    await queryDb('COMMIT');
    return { success: true, message: 'Payment successfully settled, transaction recorded and subscription activated' };
  } catch (err: any) {
    await queryDb('ROLLBACK');
    throw err;
  }
}
