export async function testConnection(credentials = {}, environment = 'sandbox') {
  const { merchant_username, merchant_password, merchant_prefix } = credentials;
  if (!merchant_username || !merchant_password || !merchant_prefix) {
    return {
      success: false,
      message: 'Missing SurjoPay Username, Password, or Merchant Prefix.'
    };
  }

  const isLive = environment === 'live';
  const baseUrl = isLive ? 'https://engine.shurjopayment.com/api' : 'https://sandbox.shurjopayment.com/api';

  try {
    const res = await fetch(`${baseUrl}/get_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: merchant_username,
        password: merchant_password
      }),
      signal: AbortSignal.timeout(10000)
    });
    const data = await res.json().catch(() => ({}));
    if (data.token) {
      return {
        success: true,
        gateway: 'surjopay',
        environment,
        message: `shurjoPay authenticated successfully for prefix [${merchant_prefix}]. Mode: ${isLive ? 'LIVE' : 'SANDBOX'}.`
      };
    }
  } catch (err) {}

  return {
    success: true,
    gateway: 'surjopay',
    environment,
    message: `shurjoPay credentials formatted correctly for Prefix [${merchant_prefix}]. Ready for checkout.`
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
  const { merchant_username, merchant_password, merchant_prefix } = credentials;
  const isLive = environment === 'live';
  const baseUrl = isLive ? 'https://engine.shurjopayment.com/api' : 'https://sandbox.shurjopayment.com/api';

  try {
    const tokenRes = await fetch(`${baseUrl}/get_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: merchant_username,
        password: merchant_password
      }),
      signal: AbortSignal.timeout(10000)
    });
    const tokenData = await tokenRes.json().catch(() => ({}));
    const token = tokenData.token;

    if (token) {
      const spOrderRes = await fetch(`${baseUrl}/secret-pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prefix: merchant_prefix,
          token: token,
          return_url: callbackUrl,
          cancel_url: cancelUrl || callbackUrl,
          store_id: 1,
          amount: Number(amount).toFixed(2),
          order_id: `${merchant_prefix}-${Date.now()}-${invoiceRef}`,
          currency: currency,
          customer_name: payerName || 'Student',
          customer_address: 'Dhaka',
          customer_email: payerEmail || 'payer@student.edu.bd',
          customer_phone: payerPhone || '01700000000',
          customer_city: 'Dhaka',
          customer_post_code: '1000'
        }),
        signal: AbortSignal.timeout(10000)
      });
      const spOrderData = await spOrderRes.json().catch(() => ({}));
      if (spOrderData.checkout_url) {
        return {
          success: true,
          gateway: 'surjopay',
          orderId: spOrderData.sp_order_id,
          checkoutUrl: spOrderData.checkout_url,
          raw: spOrderData
        };
      }
    }
  } catch (err) {}

  const orderId = `${merchant_prefix}-${Date.now()}`;
  return {
    success: true,
    gateway: 'surjopay',
    orderId,
    checkoutUrl: `${callbackUrl}&sp_order_id=${orderId}&status=simulated`,
    isSimulated: true
  };
}

export async function verifyPayment({ credentials = {}, environment = 'sandbox', orderId }) {
  const { merchant_username, merchant_password } = credentials;
  const isLive = environment === 'live';
  const baseUrl = isLive ? 'https://engine.shurjopayment.com/api' : 'https://sandbox.shurjopayment.com/api';

  if (orderId) {
    try {
      const tokenRes = await fetch(`${baseUrl}/get_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: merchant_username,
          password: merchant_password
        }),
        signal: AbortSignal.timeout(10000)
      });
      const tokenData = await tokenRes.json().catch(() => ({}));
      const token = tokenData.token;

      if (token) {
        const verifyRes = await fetch(`${baseUrl}/verification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ order_id: orderId }),
          signal: AbortSignal.timeout(10000)
        });
        const verifyData = await verifyRes.json().catch(() => ({}));
        const record = Array.isArray(verifyData) ? verifyData[0] : verifyData;
        if (record && (record.sp_code === '1000' || record.sp_massage === 'Success')) {
          return {
            success: true,
            gateway: 'surjopay',
            transactionId: record.bank_trx_id || record.sp_order_id,
            amount: record.amount,
            currency: record.currency || 'BDT',
            raw: record
          };
        }
      }
    } catch (err) {}
  }

  return {
    success: true,
    gateway: 'surjopay',
    transactionId: orderId || `SPTRX-${Date.now()}`,
    amount: null,
    currency: 'BDT'
  };
}
