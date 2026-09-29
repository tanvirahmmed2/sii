/**
 * Meta (Facebook/Instagram/WhatsApp) Graph API utilities.
 * Configure META_* environment variables to enable.
 */

import { META_APP_SECRET, META_ACCESS_TOKEN } from '../database/secret.js';

/**
 * Verify Meta webhook signature
 */
export function verifyMetaWebhookSignature(rawBody, signature) {
  if (!META_APP_SECRET) return false;
  try {
    const crypto = require('crypto');
    const expected = 'sha256=' + crypto.createHmac('sha256', META_APP_SECRET).update(rawBody).digest('hex');
    return signature === expected;
  } catch {
    return false;
  }
}

/**
 * Parse incoming Meta webhook payload
 */
export function parseIncomingMetaWebhook(body) {
  try {
    const payload = typeof body === 'string' ? JSON.parse(body) : body;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Send a message through the Meta Graph API
 */
export async function sendPlatformMessage({ platform, recipientId, message, accessToken }) {
  const token = accessToken || META_ACCESS_TOKEN;
  if (!token) throw new Error('Meta access token is not configured. Set META_ACCESS_TOKEN.');

  const endpoints = {
    facebook: 'https://graph.facebook.com/v19.0/me/messages',
    instagram: 'https://graph.facebook.com/v19.0/me/messages',
    whatsapp: `https://graph.facebook.com/v19.0/${process.env.META_PHONE_NUMBER_ID}/messages`,
  };

  const endpoint = endpoints[platform];
  if (!endpoint) throw new Error(`Unsupported platform: ${platform}`);

  const body = platform === 'whatsapp'
    ? { messaging_product: 'whatsapp', to: recipientId, type: 'text', text: { body: message } }
    : { recipient: { id: recipientId }, message: { text: message } };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Meta API error');
  return data;
}

/**
 * Get Meta API configuration status for each platform
 */
export function getMetaConfigStatus() {
  return {
    facebook: !!META_ACCESS_TOKEN,
    instagram: !!META_ACCESS_TOKEN,
    whatsapp: !!(META_ACCESS_TOKEN && process.env.META_PHONE_NUMBER_ID),
    configured: !!META_ACCESS_TOKEN,
  };
}
