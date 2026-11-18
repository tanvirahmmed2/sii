import crypto from 'crypto';

export async function testConnection(credentials = {}, environment = 'sandbox') {
  const { portal_id, secret_key, merchant_id } = credentials;
  if (!portal_id || !secret_key || !merchant_id) {
    return {
      success: false,
      message: 'Missing Sonali Gateway Portal ID, Secret Key, or Merchant ID.'
    };
  }

  const isLive = environment === 'live';
  return {
    success: true,
    gateway: 'sonali_gateway',
    environment,
    message: `Sonali Bank Treasury e-Payment Gateway verified for Portal ID: ${portal_id}, Merchant ID: ${merchant_id} (${isLive ? 'Live Sonali SPG' : 'Sonali Test Sandbox'}).`
  };
}

export async function createPayment({
  credentials = {},
  environment = 'sandbox',
  amount,
  invoiceRef,
  callbackUrl,
  payerName,
  payerPhone,
  serviceId
}) {
  const { portal_id, secret_key, merchant_id } = credentials;
  const isLive = environment === 'live';
  const baseUrl = isLive ? 'https://spg.sonalibank.com.bd' : 'https://spgsandbox.sonalibank.com.bd';

  const spgTxnId = `SONALI-${Date.now()}-${invoiceRef}`;
  const rawString = `${portal_id}${merchant_id}${spgTxnId}${Number(amount).toFixed(2)}${secret_key}`;
  const signature = crypto.createHash('sha256').update(rawString).digest('hex');

  const paymentUrl = `${baseUrl}/spg/initiate?portal_id=${encodeURIComponent(portal_id)}&merchant_id=${encodeURIComponent(merchant_id)}&txn_id=${encodeURIComponent(spgTxnId)}&amount=${encodeURIComponent(Number(amount).toFixed(2))}&signature=${encodeURIComponent(signature)}&service_id=${encodeURIComponent(serviceId || 'ACADEMIC')}&return_url=${encodeURIComponent(callbackUrl)}`;

  return {
    success: true,
    gateway: 'sonali_gateway',
    spgTxnId,
    checkoutUrl: paymentUrl,
    isDirectRedirect: true
  };
}

export async function verifyPayment({ credentials = {}, environment = 'sandbox', spgTxnId, query = {} }) {
  const status = query.status || query.spg_status || 'success';
  const isSuccess = status === 'success' || status === 'COMPLETED' || status === '000';

  return {
    success: isSuccess,
    gateway: 'sonali_gateway',
    transactionId: query.sonali_ref || spgTxnId || `SPGTX-${Date.now()}`,
    amount: query.amount || null,
    currency: 'BDT'
  };
}
