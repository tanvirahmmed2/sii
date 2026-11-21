import crypto from 'crypto';

export interface EpsConfig {
  mode: string;
  isSandbox: boolean;
  merchantId: string;
  storeId: string;
  username: string;
  password: string;
  hashKey: string;
  apiUrl: string;
  returnUrl: string;
  cancelUrl: string;
}

export function getEpsConfig(): EpsConfig {
  const mode = String(process.env.EPS_MODE || 'sandbox').toLowerCase().trim();
  const isSandbox = mode !== 'live';
  const defaultApiUrl = isSandbox ? 'https://sandbox.eps.com.bd' : 'https://pg.eps.com.bd';

  return {
    mode: isSandbox ? 'sandbox' : 'live',
    isSandbox,
    merchantId: process.env.EPS_MERCHANT_ID || 'EPS_MERCHANT_TEST_001',
    storeId: process.env.EPS_STORE_ID || 'EPS_STORE_MAIN_01',
    username: process.env.EPS_USERNAME || 'eps_test_user',
    password: process.env.EPS_PASSWORD || 'eps_test_password_2026',
    hashKey: process.env.EPS_HASH_KEY || 'eps_secret_hash_key_super_secure_987654',
    apiUrl: (process.env.EPS_API_URL || defaultApiUrl).replace(/\/$/, ''),
    returnUrl: process.env.EPS_RETURN_URL || 'http://localhost:3000/api/webhooks/eps-ipn',
    cancelUrl: process.env.EPS_CANCEL_URL || 'http://localhost:3000/creator',
  };
}

export function generateEpsSignature(payload: Record<string, any>, hashKey: string): string {
  const sortedKeys = Object.keys(payload).sort();
  const rawString = sortedKeys
    .filter((k) => payload[k] !== undefined && payload[k] !== null && payload[k] !== '')
    .map((k) => `${k}=${payload[k]}`)
    .join('&');

  return crypto
    .createHmac('sha256', hashKey)
    .update(rawString)
    .digest('hex');
}

export function verifyEpsSignature(payload: Record<string, any>, providedSignature: string, hashKey: string): boolean {
  if (!providedSignature) return false;
  const filtered = { ...payload };
  delete filtered.signature;
  delete filtered.hash;
  const computed = generateEpsSignature(filtered, hashKey);
  return computed.toLowerCase() === String(providedSignature).toLowerCase();
}

export async function initiateEpsPayment({
  paymentId,
  purchaseId,
  creatorId,
  amount,
  currency = 'BDT',
  paymentMethod = 'eps_mfs',
  subMethod = 'bkash',
  customerName = 'Creator',
  customerEmail = '',
  customerPhone = '',
  description = 'Platform Subscription',
  redirectUrl = '',
  cancelUrl = '',
}: {
  paymentId: any;
  purchaseId: any;
  creatorId: any;
  amount: number | string;
  currency?: string;
  paymentMethod?: string;
  subMethod?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  description?: string;
  redirectUrl?: string;
  cancelUrl?: string;
}): Promise<any> {
  const config = getEpsConfig();
  const numAmount = Number(Number(amount).toFixed(2));
  const finalCurrency = String(currency || 'BDT').toUpperCase();
  const transactionRef = `EPS-TX-${paymentId}-${Date.now()}`;

  const payload: any = {
    merchantId: config.merchantId,
    storeId: config.storeId,
    transactionRef,
    paymentId: String(paymentId),
    purchaseId: String(purchaseId),
    creatorId: String(creatorId),
    amount: numAmount.toFixed(2),
    currency: finalCurrency,
    paymentMethod,
    subMethod,
    customerName,
    customerEmail,
    customerPhone,
    description,
    returnUrl: redirectUrl || config.returnUrl,
    cancelUrl: cancelUrl || config.cancelUrl,
    timestamp: new Date().toISOString(),
  };

  const signature = generateEpsSignature(payload, config.hashKey);
  payload.signature = signature;

  if (config.isSandbox) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${config.apiUrl}/api/v1/payment/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-EPS-Merchant': config.merchantId,
          'X-EPS-Signature': signature,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          mode: 'sandbox',
          gatewayOrderId: data.gatewayOrderId || data.epsTransactionId || transactionRef,
          redirectUrl: data.redirectUrl || data.paymentUrl || `${config.returnUrl}?eps_ref=${transactionRef}&paymentId=${paymentId}&status=SUCCESS`,
          transactionRef,
          amount: numAmount,
          currency: finalCurrency,
          raw: data,
        };
      }
    } catch {
    }

    return {
      success: true,
      mode: 'sandbox',
      gatewayOrderId: transactionRef,
      redirectUrl: `${config.returnUrl}?eps_ref=${transactionRef}&paymentId=${paymentId}&status=SUCCESS`,
      transactionRef,
      amount: numAmount,
      currency: finalCurrency,
      isSimulated: true,
      raw: {
        status: 'INITIATED',
        mode: 'sandbox',
        transactionRef,
        amount: numAmount,
        currency: finalCurrency,
      },
    };
  }

  const res = await fetch(`${config.apiUrl}/api/v1/payment/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-EPS-Merchant': config.merchantId,
      'X-EPS-Signature': signature,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || 'EPS Live Payment Initiation Failed');
  }

  return {
    success: true,
    mode: 'live',
    gatewayOrderId: data.gatewayOrderId || data.epsTransactionId || transactionRef,
    redirectUrl: data.redirectUrl || data.paymentUrl,
    transactionRef,
    amount: numAmount,
    currency: finalCurrency,
    raw: data,
  };
}

export async function verifyEpsPayment({
  transactionRef,
  paymentId,
  gatewayOrderId,
  rawQuery = {},
}: {
  transactionRef?: string;
  paymentId?: any;
  gatewayOrderId?: string;
  rawQuery?: Record<string, any>;
}): Promise<any> {
  const config = getEpsConfig();

  if (config.isSandbox) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${config.apiUrl}/api/v1/payment/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-EPS-Merchant': config.merchantId,
        },
        body: JSON.stringify({
          merchantId: config.merchantId,
          storeId: config.storeId,
          transactionRef,
          gatewayOrderId: gatewayOrderId || transactionRef,
          paymentId: String(paymentId),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const isSuccess = data.status === 'SUCCESS' || data.statusCode === '0000' || data.paid === true;
        return {
          isSuccess,
          mode: 'sandbox',
          transactionId: data.transactionId || transactionRef,
          amount: Number(data.amount || 0),
          currency: data.currency || 'BDT',
          gatewayFee: Number(data.fee || 0),
          netAmount: Number(data.netAmount || data.amount || 0),
          paymentMethod: data.paymentMethod || 'EPS Sandbox',
          raw: data,
        };
      }
    } catch {
    }

    const simStatus = String(rawQuery.status || 'SUCCESS').toUpperCase();
    const isSuccess = simStatus === 'SUCCESS';
    return {
      isSuccess,
      mode: 'sandbox',
      transactionId: transactionRef || `EPS-MOCK-${Date.now()}`,
      amount: Number(rawQuery.amount || 0),
      currency: rawQuery.currency || 'BDT',
      gatewayFee: 0,
      netAmount: Number(rawQuery.amount || 0),
      paymentMethod: rawQuery.paymentMethod || 'EPS Sandbox Simulator',
      isSimulated: true,
      raw: {
        verified: isSuccess,
        mode: 'sandbox',
        transactionRef,
        query: rawQuery,
      },
    };
  }

  const res = await fetch(`${config.apiUrl}/api/v1/payment/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-EPS-Merchant': config.merchantId,
    },
    body: JSON.stringify({
      merchantId: config.merchantId,
      storeId: config.storeId,
      transactionRef,
      gatewayOrderId,
      paymentId: String(paymentId),
    }),
  });

  const data = await res.json();
  const isSuccess = Boolean(data.success && (data.status === 'SUCCESS' || data.statusCode === '0000'));

  return {
    isSuccess,
    mode: 'live',
    transactionId: data.transactionId || transactionRef,
    amount: Number(data.amount || 0),
    currency: data.currency || 'BDT',
    gatewayFee: Number(data.fee || 0),
    netAmount: Number(data.netAmount || Number(data.amount || 0) - Number(data.fee || 0)),
    paymentMethod: data.paymentMethod || 'EPS Live',
    raw: data,
  };
}
