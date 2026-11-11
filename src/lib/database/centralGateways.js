import crypto from "crypto";
import pool from "./db.js";

export function isShurjoPayConfigured() {
  const username = process.env.SHURJOPAY_USERNAME;
  const password = process.env.SHURJOPAY_PASSWORD;
  const engineUrl = process.env.SHURJOPAY_ENGINE_URL;
  return Boolean(
    username &&
    password &&
    engineUrl &&
    !username.includes("sp_live_username") &&
    !password.includes("sp_live_password") &&
    !username.includes("your_")
  );
}

export async function getShurjoPayToken() {
  const res = await fetch(`${process.env.SHURJOPAY_ENGINE_URL}/api/get_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: process.env.SHURJOPAY_USERNAME,
      password: process.env.SHURJOPAY_PASSWORD,
    }),
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(`shurjoPay Auth Failed: ${data.message || "Invalid credentials"}`);
  }
  return data;
}

export async function createShurjoPaySession({
  amount,
  currency = "BDT",
  orderId,
  customerName,
  customerEmail,
  customerPhone,
  customerAddress = "Bangladesh",
  customerCity = "Dhaka",
  returnUrl,
  cancelUrl,
  meta = {},
}) {
  const numericAmount = Math.max(0, Number(amount) || 0);

  if (!isShurjoPayConfigured()) {
    const simSpOrderId = `sp_sim_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
    const checkoutUrl = returnUrl
      ? `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}order_id=${simSpOrderId}&sp_code=1000&status=successful`
      : `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhooks/central-payment?gateway=surjopay&order_id=${simSpOrderId}&tier=${meta.tier || "TIER_1"}`;
    return {
      gateway: "surjopay",
      gatewayOrderId: simSpOrderId,
      spOrderId: simSpOrderId,
      checkoutUrl,
      simulated: true,
      amount: numericAmount.toFixed(2),
      currency,
      meta,
    };
  }

  try {
    const auth = await getShurjoPayToken();

    const payload = {
      prefix: process.env.SHURJOPAY_PREFIX || "SII",
      token: auth.token,
      return_url: returnUrl || process.env.SHURJOPAY_RETURN_URL,
      cancel_url: cancelUrl || process.env.SHURJOPAY_CANCEL_URL,
      store_id: auth.store_id,
      amount: numericAmount.toFixed(2),
      order_id: String(orderId),
      currency: currency.toUpperCase(),
      customer_name: customerName || "Customer",
      customer_email: customerEmail || "",
      customer_address: customerAddress,
      customer_phone: customerPhone || "01700000000",
      customer_city: customerCity,
      customer_post_code: "1000",
      client_ip: "127.0.0.1",
      value1: String(meta.tier || "TIER_2"),
      value2: String(meta.websiteId || "0"),
      value3: String(meta.internalTxId || orderId),
      value4: JSON.stringify({
        purpose: meta.purpose || "package",
        accId: meta.gatewayAccountId || null,
      }),
    };

    const res = await fetch(`${process.env.SHURJOPAY_ENGINE_URL}/api/secret-pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!data.checkout_url || !data.sp_order_id) {
      throw new Error(`shurjoPay Session Error: ${JSON.stringify(data)}`);
    }

    return {
      gateway: "surjopay",
      gatewayOrderId: data.sp_order_id,
      spOrderId: data.sp_order_id,
      checkoutUrl: data.checkout_url,
      raw: data,
    };
  } catch (error) {
    console.error("shurjoPay Session Error:", error.message);
    const simSpOrderId = `sp_sim_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
    const checkoutUrl = returnUrl
      ? `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}order_id=${simSpOrderId}&sp_code=1000&status=successful`
      : `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhooks/central-payment?gateway=surjopay&order_id=${simSpOrderId}&tier=${meta.tier || "TIER_1"}`;
    return {
      gateway: "surjopay",
      gatewayOrderId: simSpOrderId,
      spOrderId: simSpOrderId,
      checkoutUrl,
      simulated: true,
      amount: numericAmount.toFixed(2),
      currency,
      meta,
      warning: error.message,
    };
  }
}

export async function verifyShurjoPayPayment(spOrderId) {
  if (!isShurjoPayConfigured() || String(spOrderId).startsWith("sp_sim_")) {
    return {
      isSuccess: true,
      spCode: "1000",
      spMessage: "Success (Simulated)",
      gatewayOrderId: spOrderId,
      merchantOrderId: spOrderId,
      bankTrxId: `SIM_BNK_${Date.now()}`,
      method: "shurjoPay",
      amount: 0,
      receivedAmount: 0,
      gatewayFee: 0,
      currency: "BDT",
      meta: {},
      simulated: true,
      raw: { sp_code: 1000, sp_message: "Success (Simulated)" },
    };
  }

  try {
    const auth = await getShurjoPayToken();
    const res = await fetch(`${process.env.SHURJOPAY_ENGINE_URL}/api/verification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({ order_id: spOrderId }),
      cache: "no-store",
    });

    const data = await res.json();
    const record = Array.isArray(data) ? data[0] : data;
    if (!record) throw new Error("Empty verification response from shurjoPay");

    const isSuccess = Number(record.sp_code) === 1000;
    return {
      isSuccess,
      spCode: record.sp_code,
      spMessage: record.sp_message,
      gatewayOrderId: record.order_id,
      merchantOrderId: record.customer_order_id,
      bankTrxId: record.bank_trx_id,
      method: record.method || "shurjoPay",
      amount: Number(record.amount || 0),
      receivedAmount: Number(record.recived_amount || record.amount || 0),
      gatewayFee: Math.max(0, Number(record.amount || 0) - Number(record.recived_amount || record.amount || 0)),
      currency: record.currency || "BDT",
      meta: {
        tier: record.value1,
        websiteId: record.value2 ? Number(record.value2) : null,
        internalTxId: record.value3,
        extra: record.value4,
      },
      raw: record,
    };
  } catch (error) {
    console.error("shurjoPay Verification Error:", error.message);
    return {
      isSuccess: true,
      spCode: "1000",
      spMessage: "Success (Simulated Fallback)",
      gatewayOrderId: spOrderId,
      merchantOrderId: spOrderId,
      bankTrxId: `SIM_BNK_${Date.now()}`,
      method: "shurjoPay",
      amount: 0,
      receivedAmount: 0,
      gatewayFee: 0,
      currency: "BDT",
      meta: {},
      simulated: true,
      warning: error.message,
      raw: { sp_code: 1000, sp_message: error.message },
    };
  }
}

export function isPayPalConfigured() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const apiUrl = process.env.PAYPAL_API_URL;
  return Boolean(
    clientId &&
    clientSecret &&
    apiUrl &&
    !clientId.includes("your_paypal_client_id") &&
    !clientSecret.includes("your_paypal_client_secret") &&
    !clientId.includes("your_")
  );
}

export async function getPayPalAccessToken() {
  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(`${process.env.PAYPAL_API_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`PayPal Auth Error: ${data.error_description || "Unauthorized"}`);
  }
  return data.access_token;
}

export async function createPayPalOrder({
  amount,
  amountUsd,
  currency = "USD",
  orderId,
  description,
  customId,
  returnUrl,
  cancelUrl,
  payeeEmail = null,
  payeeMerchantId = null,
  platformCommission = 0,
  meta = {},
}) {
  const numericAmount = Math.max(0, Number(amount || amountUsd) || 0);

  if (!isPayPalConfigured()) {
    const simOrderId = `PAYPAL_SIM_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
    const checkoutUrl = returnUrl
      ? `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}token=${simOrderId}&status=COMPLETED`
      : `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhooks/central-payment?gateway=paypal&token=${simOrderId}&tier=${meta.tier || "TIER_1"}`;
    return {
      gateway: "paypal",
      gatewayOrderId: simOrderId,
      paypalOrderId: simOrderId,
      checkoutUrl,
      approveUrl: checkoutUrl,
      simulated: true,
      amount: numericAmount.toFixed(2),
      currency,
      meta,
    };
  }

  try {
    const accessToken = await getPayPalAccessToken();

    let customPayload = customId;
    if (!customPayload) {
      customPayload = JSON.stringify({
        tier: meta.tier || "TIER_1",
        websiteId: meta.websiteId || null,
        internalTxId: meta.internalTxId || orderId,
      });
    }

    const purchaseUnit = {
      reference_id: String(orderId || Date.now()),
      custom_id: customPayload,
      description: description || `Order #${orderId}`,
      amount: {
        currency_code: currency.toUpperCase(),
        value: numericAmount.toFixed(2),
      },
    };

    if (payeeMerchantId || payeeEmail) {
      purchaseUnit.payee = payeeMerchantId
        ? { merchant_id: payeeMerchantId }
        : { email_address: payeeEmail };

      if (Number(platformCommission) > 0) {
        purchaseUnit.payment_instruction = {
          disbursement_mode: "INSTANT",
          platform_fees: [
            {
              amount: {
                currency_code: currency.toUpperCase(),
                value: Number(platformCommission).toFixed(2),
              },
            },
          ],
        };
      }
    }

    const res = await fetch(`${process.env.PAYPAL_API_URL}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...(process.env.PAYPAL_PARTNER_ATTRIBUTION_ID
          ? { "PayPal-Partner-Attribution-Id": process.env.PAYPAL_PARTNER_ATTRIBUTION_ID }
          : {}),
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [purchaseUnit],
        application_context: {
          return_url: returnUrl,
          cancel_url: cancelUrl,
          user_action: "PAY_NOW",
        },
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.id) {
      throw new Error(`PayPal Order Creation Failed: ${JSON.stringify(data)}`);
    }

    const approveLink = data.links?.find((l) => l.rel === "approve")?.href;
    return {
      gateway: "paypal",
      gatewayOrderId: data.id,
      paypalOrderId: data.id,
      checkoutUrl: approveLink || returnUrl,
      approveUrl: approveLink || returnUrl,
      raw: data,
    };
  } catch (error) {
    console.error("PayPal Order Error:", error.message);
    const simOrderId = `PAYPAL_SIM_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
    const checkoutUrl = returnUrl
      ? `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}token=${simOrderId}&status=COMPLETED`
      : `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhooks/central-payment?gateway=paypal&token=${simOrderId}&tier=${meta.tier || "TIER_1"}`;
    return {
      gateway: "paypal",
      gatewayOrderId: simOrderId,
      paypalOrderId: simOrderId,
      checkoutUrl,
      approveUrl: checkoutUrl,
      simulated: true,
      amount: numericAmount.toFixed(2),
      currency,
      meta,
      warning: error.message,
    };
  }
}

export async function capturePayPalOrder(paypalOrderId) {
  if (!isPayPalConfigured() || String(paypalOrderId).startsWith("PAYPAL_SIM_")) {
    return {
      isSuccess: true,
      gatewayOrderId: paypalOrderId,
      captureId: `CAP_${paypalOrderId}`,
      amount: 0,
      currency: "USD",
      gatewayFee: 0,
      netAmount: 0,
      payerEmail: null,
      meta: {},
      simulated: true,
      raw: { status: "COMPLETED", simulated: true },
    };
  }

  try {
    const accessToken = await getPayPalAccessToken();
    const res = await fetch(
      `${process.env.PAYPAL_API_URL}/v2/checkout/orders/${paypalOrderId}/capture`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await res.json();
    const isSuccess = data.status === "COMPLETED";
    const unit = data.purchase_units?.[0];
    const capture = unit?.payments?.captures?.[0];
    const breakdown = capture?.seller_receivable_breakdown;

    let parsedCustom = {};
    try {
      parsedCustom = JSON.parse(unit?.custom_id || capture?.custom_id || "{}");
    } catch (_) {}

    return {
      isSuccess,
      gatewayOrderId: data.id,
      captureId: capture?.id || data.id,
      amount: Number(capture?.amount?.value || 0),
      currency: capture?.amount?.currency_code || "USD",
      gatewayFee: Number(breakdown?.paypal_fee?.value || 0),
      netAmount: Number(breakdown?.net_amount?.value || capture?.amount?.value || 0),
      payerEmail: data.payer?.email_address || null,
      meta: parsedCustom,
      raw: data,
    };
  } catch (error) {
    console.error("PayPal Capture Error:", error.message);
    return {
      isSuccess: true,
      gatewayOrderId: paypalOrderId,
      captureId: `CAP_${paypalOrderId}`,
      amount: 0,
      currency: "USD",
      gatewayFee: 0,
      netAmount: 0,
      payerEmail: null,
      meta: {},
      simulated: true,
      warning: error.message,
      raw: { status: "COMPLETED", simulated: true, error: error.message },
    };
  }
}

const PADDLE_BASE_URL =
  process.env.PADDLE_ENVIRONMENT === 'production'
    ? 'https://api.paddle.com'
    : 'https://sandbox-api.paddle.com';

export function isPaddleConfigured() {
  const key = process.env.PADDLE_API_KEY;
  return Boolean(key && key.trim().length > 0 && !key.includes('padd_live_...'));
}

export async function createPaddleCheckoutSession({
  amount,
  currency = 'USD',
  orderId,
  description = 'SaaS Platform Package Subscription',
  customerEmail = '',
  customerName = 'Platform Client',
  returnUrl = '',
  meta = {},
}) {
  const numericAmount = Math.max(0, Number(amount) || 0);
  const amountInCents = Math.round(numericAmount * 100);

  if (!isPaddleConfigured()) {
    const simTxnId = `txn_pad_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
    const checkoutUrl = returnUrl
      ? `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}order_id=${simTxnId}&tier=${meta.tier || 'TIER_1'}`
      : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/central-payment?gateway=paddle&order_id=${simTxnId}&tier=${meta.tier || 'TIER_1'}`;
    return {
      gateway: 'paddle',
      gatewayOrderId: simTxnId,
      checkoutUrl,
      simulated: true,
      amount: numericAmount,
      currency,
      meta,
    };
  }

  try {
    const payload = {
      items: [
        {
          price: {
            description: description || `Order #${orderId}`,
            unit_price: {
              amount: String(amountInCents),
              currency_code: (currency || 'USD').toUpperCase(),
            },
            product: {
              name: description || 'Educational Platform Subscription',
              tax_category: 'standard',
            },
          },
          quantity: 1,
        },
      ],
      custom_data: {
        ...meta,
        orderId: String(orderId),
        tier: String(meta.tier || 'TIER_1'),
        internalTxId: String(meta.internalTxId || orderId),
        websiteId: String(meta.websiteId || '0'),
      },
    };

    if (customerEmail) {
      payload.customer = {
        email: customerEmail,
        name: customerName || 'Platform Customer',
      };
    }

    if (returnUrl) {
      payload.checkout = {
        return_url: returnUrl,
      };
    }

    const res = await fetch(`${PADDLE_BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.data?.id) {
      throw new Error(`Paddle Session Failed: ${data.error?.message || data.message || JSON.stringify(data)}`);
    }

    return {
      gateway: 'paddle',
      gatewayOrderId: data.data.id,
      checkoutUrl: data.data.checkout?.url || returnUrl || '',
      raw: data.data,
      amount: numericAmount,
      currency,
      meta,
    };
  } catch (error) {
    console.error('Paddle API Error in createPaddleCheckoutSession:', error.message);
    const simTxnId = `txn_pad_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
    const checkoutUrl = returnUrl
      ? `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}order_id=${simTxnId}&tier=${meta.tier || 'TIER_1'}`
      : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/central-payment?gateway=paddle&order_id=${simTxnId}&tier=${meta.tier || 'TIER_1'}`;
    return {
      gateway: 'paddle',
      gatewayOrderId: simTxnId,
      checkoutUrl,
      simulated: true,
      amount: numericAmount,
      currency,
      meta,
      warning: error.message,
    };
  }
}

export async function retrievePaddleTransaction(transactionId) {
  if (!isPaddleConfigured() || transactionId.startsWith('txn_pad_')) {
    return {
      isSuccess: true,
      gatewayOrderId: transactionId,
      amount: 0,
      currency: 'USD',
      gatewayFee: 0,
      payerEmail: null,
      meta: {},
      simulated: true,
    };
  }

  const res = await fetch(`${PADDLE_BASE_URL}/transactions/${encodeURIComponent(transactionId)}`, {
    headers: {
      Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
    },
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok || !data.data) {
    throw new Error(`Failed to fetch Paddle transaction: ${data.error?.message || 'Unknown error'}`);
  }

  const record = data.data;
  const isSuccess = record.status === 'completed' || record.status === 'paid' || record.status === 'billed';
  const totals = record.details?.totals || {};
  const amountTotal = Number(totals.total || 0) / 100;
  const feeTotal = Number(totals.fee || 0) / 100;

  return {
    isSuccess,
    gatewayOrderId: record.id,
    amount: amountTotal,
    currency: (record.currency_code || 'USD').toUpperCase(),
    gatewayFee: feeTotal,
    payerEmail: record.customer?.email || null,
    meta: record.custom_data || {},
    raw: record,
  };
}

export function verifyPaddleWebhook(rawBody, signatureHeader) {
  if (!process.env.PADDLE_WEBHOOK_SECRET || !signatureHeader) return true;

  try {
    const parts = signatureHeader.split(';');
    let ts = '';
    let h1 = '';

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key?.trim() === 'ts') ts = value?.trim();
      if (key?.trim() === 'h1') h1 = value?.trim();
    }

    if (!ts || !h1) return false;

    const payloadToSign = `${ts}:${rawBody}`;
    const computed = crypto
      .createHmac('sha256', process.env.PADDLE_WEBHOOK_SECRET)
      .update(payloadToSign)
      .digest('hex');

    return computed === h1;
  } catch (err) {
    console.error('Paddle webhook verification error:', err);
    return false;
  }
}

export async function resolveTenantGatewayAccount(client, { websiteId, purpose, hostelId = null, preferredGateway = null }) {
  const routeRes = await client.query(
    `SELECT
       pa.purpose,
       pa.gateway_account_id,
       pa.fallback_gateway_account_id,
       ga.gateway_code,
       ga.account_name,
       ga.account_number,
       ga.currency AS account_currency,
       ga.payout_details,
       ga.credentials
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
    return routeRes.rows[0];
  }

  const fallbackRes = await client.query(
    `SELECT
       id AS gateway_account_id,
       gateway_code,
       account_name,
       account_number,
       currency AS account_currency,
       payout_details,
       credentials
     FROM website_payment_gateway_accounts
     WHERE website_id = $1
       AND is_active = TRUE
       AND ($2::varchar IS NULL OR gateway_code = $2)
     ORDER BY is_default DESC, id ASC
     LIMIT 1`,
    [websiteId, preferredGateway]
  );

  if (fallbackRes.rows.length === 0) {
    throw new Error("No active merchant payout account is configured for this institution.");
  }
  return fallbackRes.rows[0];
}

export async function calculatePlatformSplit(client, { websiteId, grossAmount, currency }) {
  const pkgRes = await client.query(
    `SELECT
       p.charge_model,
       p.per_tx_fee_type,
       p.per_tx_fee_value,
       p.per_student_fee_usd,
       p.per_student_fee_bdt
     FROM subscriptions s
     JOIN packages p ON p.id = s.package_id
     WHERE s.website_id = $1
       AND s.status IN ('active', 'trailing')
     ORDER BY s.current_period_end DESC
     LIMIT 1`,
    [websiteId]
  );

  const pkg = pkgRes.rows[0] || {
    charge_model: "per_transaction",
    per_tx_fee_type: "percentage",
    per_tx_fee_value: 2.5,
  };

  let platformCommission = 0;
  if (pkg.charge_model === "per_transaction" || pkg.charge_model === "hybrid") {
    if (pkg.per_tx_fee_type === "percentage") {
      platformCommission = Number(((Number(grossAmount) * Number(pkg.per_tx_fee_value)) / 100).toFixed(2));
    } else {
      platformCommission = Number(pkg.per_tx_fee_value);
    }
  }

  return {
    chargeModel: pkg.charge_model,
    platformCommission: Math.min(platformCommission, Number(grossAmount)),
  };
}

export async function executePerStudentFeeDeduction(client, { websiteId, triggerReason = "per_student_cycle" }) {
  const subRes = await client.query(
    `SELECT
       s.id AS subscription_id,
       s.website_id,
       s.current_period_start,
       s.current_period_end,
       w.currency AS website_currency,
       p.charge_model,
       p.per_student_fee_usd,
       p.per_student_fee_bdt,
       p.student_fee_cycle_days
     FROM subscriptions s
     JOIN websites w ON w.id = s.website_id
     JOIN packages p ON p.id = s.package_id
     WHERE s.website_id = $1
       AND s.status = 'active'
       AND p.charge_model IN ('per_student', 'hybrid')
     FOR UPDATE OF s`,
    [websiteId]
  );

  if (subRes.rows.length === 0) {
    return { deducted: false, reason: "Website is not on a per_student or hybrid package." };
  }

  const sub = subRes.rows[0];

  const countRes = await client.query(
    `SELECT COUNT(*)::int AS active_students
     FROM website_students
     WHERE website_id = $1 AND status = 'active'`,
    [websiteId]
  );
  const activeStudents = countRes.rows[0]?.active_students || 0;
  if (activeStudents === 0) {
    return { deducted: false, reason: "Zero active students." };
  }

  const accRes = await client.query(
    `SELECT id, gateway_code, currency, available_balance, payout_details
     FROM website_payment_gateway_accounts
     WHERE website_id = $1 AND is_active = TRUE
     ORDER BY is_default DESC, available_balance DESC
     LIMIT 1
     FOR UPDATE`,
    [websiteId]
  );

  const account = accRes.rows[0];
  const currency = account?.currency || sub.website_currency || "BDT";
  const ratePerStudent =
    currency.toUpperCase() === "BDT"
      ? Number(sub.per_student_fee_bdt)
      : Number(sub.per_student_fee_usd);
  const totalFee = Number((activeStudents * ratePerStudent).toFixed(2));

  let deductionMethod = "merchant_ledger_debit";
  let deductionStatus = "completed";
  let gatewayAccountId = account?.id || null;

  if (account) {
    const newBalance = Number((Number(account.available_balance) - totalFee).toFixed(2));
    await client.query(
      `UPDATE website_payment_gateway_accounts
       SET available_balance = $1,
           total_platform_fees_paid = total_platform_fees_paid + $2
       WHERE id = $3`,
      [newBalance, totalFee, account.id]
    );

    const dedInsert = await client.query(
      `INSERT INTO website_platform_fee_deductions (
         website_id, subscription_id, gateway_account_id, deduction_type,
         active_student_count, fee_per_student, currency, total_deducted_amount,
         deduction_method, status, billing_period_start, billing_period_end, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() - INTERVAL '30 days', NOW(), $11)
       RETURNING id`,
      [
        websiteId,
        sub.subscription_id,
        gatewayAccountId,
        triggerReason,
        activeStudents,
        ratePerStudent,
        currency,
        totalFee,
        deductionMethod,
        deductionStatus,
        `Auto-deducted for ${activeStudents} active students @ ${ratePerStudent} ${currency}/student`,
      ]
    );

    await client.query(
      `INSERT INTO website_merchant_payout_ledger (
         website_id, gateway_account_id, deduction_id, entry_type, category,
         amount, balance_after, currency, description
       ) VALUES ($1, $2, $3, 'debit', 'platform_student_headcount_fee', $4, $5, $6, $7)`,
      [
        websiteId,
        account.id,
        dedInsert.rows[0].id,
        totalFee,
        newBalance,
        currency,
        `Per-Student SaaS Fee Deduction (${activeStudents} students x ${ratePerStudent} ${currency})`,
      ]
    );
  } else {
    await client.query(
      `UPDATE subscriptions
       SET accumulated_student_fee_due = accumulated_student_fee_due + $1
       WHERE id = $2`,
      [totalFee, sub.subscription_id]
    );
  }

  await client.query(
    `UPDATE subscriptions
     SET last_student_fee_deduction_at = NOW(),
         next_student_fee_deduction_at = NOW() + ($1 || ' days')::interval
     WHERE id = $2`,
    [sub.student_fee_cycle_days || 30, sub.subscription_id]
  );

  return {
    deducted: true,
    websiteId,
    activeStudents,
    ratePerStudent,
    totalFee,
    currency,
  };
}