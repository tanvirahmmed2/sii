/**
 * bKash payment gateway module for marketing routes.
 * Configure BKASH_* environment variables to enable.
 */

export const USD_TO_BDT_RATE = parseFloat(process.env.USD_TO_BDT_RATE || '110');

export function usdToBdt(usd) {
  return Math.ceil(usd * USD_TO_BDT_RATE);
}

export function validateBangladeshiMobile(mobile) {
  const cleaned = String(mobile || '').replace(/\D/g, '');
  return /^(01[3-9]\d{8})$/.test(cleaned);
}

export function validateBkashOtp(otp) {
  return /^\d{4,6}$/.test(String(otp || ''));
}

export function validateBkashPin(pin) {
  return /^\d{4,6}$/.test(String(pin || ''));
}

export function isBkashConfigured() {
  return !!(
    process.env.BKASH_APP_KEY &&
    process.env.BKASH_APP_SECRET &&
    process.env.BKASH_USERNAME &&
    process.env.BKASH_PASSWORD
  );
}

async function getBkashToken() {
  const res = await fetch(`${process.env.BKASH_BASE_URL}/tokenized/checkout/token/grant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      username: process.env.BKASH_USERNAME,
      password: process.env.BKASH_PASSWORD,
    },
    body: JSON.stringify({
      app_key: process.env.BKASH_APP_KEY,
      app_secret: process.env.BKASH_APP_SECRET,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.statusMessage || 'bKash token error');
  return data.id_token;
}

export async function createBkashPayment({ amount, currency = 'BDT', intent = 'sale', merchantInvoiceNumber }) {
  if (!isBkashConfigured()) throw new Error('bKash is not configured. Set BKASH_* environment variables.');
  const token = await getBkashToken();
  const res = await fetch(`${process.env.BKASH_BASE_URL}/tokenized/checkout/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token, 'x-app-key': process.env.BKASH_APP_KEY },
    body: JSON.stringify({ mode: '0011', payerReference: merchantInvoiceNumber, callbackURL: process.env.BKASH_CALLBACK_URL, amount: String(amount), currency, intent, merchantInvoiceNumber }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.statusMessage || 'bKash create payment error');
  return data;
}

export async function executeBkashPayment({ paymentID }) {
  if (!isBkashConfigured()) throw new Error('bKash is not configured. Set BKASH_* environment variables.');
  const token = await getBkashToken();
  const res = await fetch(`${process.env.BKASH_BASE_URL}/tokenized/checkout/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token, 'x-app-key': process.env.BKASH_APP_KEY },
    body: JSON.stringify({ paymentID }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.statusMessage || 'bKash execute error');
  return data;
}

export async function queryBkashPayment({ paymentID }) {
  if (!isBkashConfigured()) throw new Error('bKash is not configured.');
  const token = await getBkashToken();
  const res = await fetch(`${process.env.BKASH_BASE_URL}/tokenized/checkout/payment/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token, 'x-app-key': process.env.BKASH_APP_KEY },
    body: JSON.stringify({ paymentID }),
  });
  return res.json();
}

export async function searchBkashTransaction({ trxID }) {
  if (!isBkashConfigured()) throw new Error('bKash is not configured.');
  const token = await getBkashToken();
  const res = await fetch(`${process.env.BKASH_BASE_URL}/tokenized/checkout/general/searchTransaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token, 'x-app-key': process.env.BKASH_APP_KEY },
    body: JSON.stringify({ trxID }),
  });
  return res.json();
}

export async function refundBkashPayment({ paymentID, amount, trxID, sku, reason }) {
  if (!isBkashConfigured()) throw new Error('bKash is not configured.');
  const token = await getBkashToken();
  const res = await fetch(`${process.env.BKASH_BASE_URL}/tokenized/checkout/payment/refund`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token, 'x-app-key': process.env.BKASH_APP_KEY },
    body: JSON.stringify({ paymentID, amount: String(amount), trxID, sku, reason }),
  });
  return res.json();
}
