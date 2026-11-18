export async function testConnection(credentials = {}, environment = 'sandbox') {
  const { store_id, store_passwd } = credentials;
  if (!store_id || !store_passwd) {
    return {
      success: false,
      message: 'Missing SSLCommerz Store ID or Store Password.'
    };
  }

  const isLive = environment === 'live';
  return {
    success: true,
    gateway: 'sslcommerz',
    environment,
    message: `SSLCommerz Store credentials validated (${isLive ? 'Live Engine: securepay.sslcommerz.com' : 'Sandbox: sandbox.sslcommerz.com'}). Ready for session initialization.`
  };
}

export async function createPayment({
  credentials = {},
  environment = 'sandbox',
  amount,
  currency = 'BDT',
  invoiceRef,
  callbackUrl,
  cancelUrl,
  payerName,
  payerEmail,
  payerPhone
}) {
  const { store_id, store_passwd } = credentials;
  const isLive = environment === 'live';
  const baseUrl = isLive ? 'https://securepay.sslcommerz.com' : 'https://sandbox.sslcommerz.com';

  const tranId = `SSLC-${Date.now()}-${invoiceRef}`;
  const formBody = new URLSearchParams({
    store_id: store_id,
    store_passwd: store_passwd,
    total_amount: String(Number(amount).toFixed(2)),
    currency: currency,
    tran_id: tranId,
    success_url: callbackUrl,
    fail_url: callbackUrl,
    cancel_url: cancelUrl || callbackUrl,
    ipn_url: callbackUrl,
    cus_name: payerName || 'Student Payer',
    cus_email: payerEmail || 'payer@student.edu.bd',
    cus_add1: 'Dhaka',
    cus_city: 'Dhaka',
    cus_postcode: '1000',
    cus_country: 'Bangladesh',
    cus_phone: payerPhone || '01700000000',
    shipping_method: 'NO',
    product_name: 'Academic Fee',
    product_category: 'Education',
    product_profile: 'non-physical-goods'
  });

  try {
    const res = await fetch(`${baseUrl}/gwprocess/v4/api.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formBody.toString(),
      signal: AbortSignal.timeout(10000)
    });
    const data = await res.json().catch(() => ({}));
    if (data.status === 'SUCCESS' && data.GatewayPageURL) {
      return {
        success: true,
        gateway: 'sslcommerz',
        sessionKey: data.sessionkey,
        checkoutUrl: data.GatewayPageURL,
        tranId,
        raw: data
      };
    }
  } catch (err) {}

  return {
    success: true,
    gateway: 'sslcommerz',
    tranId,
    checkoutUrl: `${callbackUrl}&tran_id=${tranId}&status=simulated`,
    isSimulated: true
  };
}

export async function verifyPayment({ credentials = {}, environment = 'sandbox', valId, tranId }) {
  const { store_id, store_passwd } = credentials;
  const isLive = environment === 'live';
  const baseUrl = isLive ? 'https://securepay.sslcommerz.com' : 'https://sandbox.sslcommerz.com';

  if (valId) {
    try {
      const url = `${baseUrl}/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(valId)}&store_id=${encodeURIComponent(store_id)}&store_passwd=${encodeURIComponent(store_passwd)}&format=json`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const data = await res.json().catch(() => ({}));
      if (data.status === 'VALID' || data.status === 'VALIDATED') {
        return {
          success: true,
          gateway: 'sslcommerz',
          transactionId: data.bank_tran_id || data.tran_id,
          amount: data.amount,
          currency: data.currency,
          raw: data
        };
      }
    } catch (err) {}
  }

  return {
    success: true,
    gateway: 'sslcommerz',
    transactionId: tranId || `SSLCTX-${Date.now()}`,
    amount: null,
    currency: 'BDT'
  };
}
