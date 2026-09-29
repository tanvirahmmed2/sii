/**
 * Payoneer payment gateway module for marketing routes.
 * Configure PAYONEER_* environment variables to enable.
 */

export async function createPaymentSession({ amount, currency = 'USD', description, returnUrl, cancelUrl, metadata = {} }) {
  if (!process.env.PAYONEER_API_KEY) {
    throw new Error('Payoneer is not configured. Set PAYONEER_API_KEY environment variable.');
  }
  const res = await fetch('https://api.payoneer.com/v2/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.PAYONEER_API_KEY}`,
    },
    body: JSON.stringify({ amount, currency, description, returnUrl, cancelUrl, metadata }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Payoneer session creation failed');
  return data;
}

export async function getPaymentSession(sessionId) {
  if (!process.env.PAYONEER_API_KEY) throw new Error('Payoneer is not configured.');
  const res = await fetch(`https://api.payoneer.com/v2/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${process.env.PAYONEER_API_KEY}` },
  });
  return res.json();
}

export async function capturePaymentSession(sessionId) {
  if (!process.env.PAYONEER_API_KEY) throw new Error('Payoneer is not configured.');
  const res = await fetch(`https://api.payoneer.com/v2/sessions/${sessionId}/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.PAYONEER_API_KEY}` },
  });
  return res.json();
}
