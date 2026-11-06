import { queryDb } from './db.js';
import { BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME } from './secret.js';
import { checkAndIncrementMailUsage, getWebsiteMonthlyUsageAndLimits } from './usageLimiter.js';

export function maskApiKey(key) {
  if (!key) return '';
  if (key.length <= 10) return '••••••••';
  return key.slice(0, 8) + '••••••••••••••••' + key.slice(-4);
}

/**
 * Returns mailer configuration for a tenant website.
 * Always resolves to the central main website mailer with the tenant's display name and package limits.
 *
 * @param {string|number} websiteId
 * @returns {Promise<Object>}
 */
export async function getWebsiteBrevoConfig(websiteId) {
  let institutionName = BREVO_SENDER_NAME || 'Campus Administration';
  if (websiteId) {
    try {
      const siteRes = await queryDb(`SELECT name FROM websites WHERE id = $1 LIMIT 1`, [websiteId]);
      if (siteRes.rows.length > 0 && siteRes.rows[0].name) {
        institutionName = siteRes.rows[0].name;
      }
    } catch (_) {}
  }

  const usageLimits = websiteId ? await getWebsiteMonthlyUsageAndLimits(websiteId) : null;

  return {
    configured: Boolean(BREVO_API_KEY),
    isCustom: false,
    useMainMailer: true,
    apiKey: maskApiKey(BREVO_API_KEY),
    senderEmail: BREVO_SENDER_EMAIL || 'noreply@campus.edu',
    senderName: institutionName,
    websiteName: institutionName,
    isActive: Boolean(BREVO_API_KEY),
    usage: usageLimits
  };
}

/**
 * Sends a transactional email using the central main platform Brevo mailer,
 * enforcing the tenant website's monthly package quota limits.
 *
 * @param {string|number} websiteId - Website tenant ID
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} [options.toName] - Recipient display name
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML email body
 * @param {string} [options.text] - Plain text email body (optional)
 * @returns {Promise<Object>} Brevo API response { messageId, mailerType, senderEmail }
 */
export async function sendWebsiteEmail(websiteId, { to, toName, subject, html, text }) {
  if (!BREVO_API_KEY) {
    throw new Error('Main platform BREVO_API_KEY is not configured in environment secrets.');
  }

  // 1. Enforce monthly package email quota limit & increment usage counter
  if (websiteId) {
    await checkAndIncrementMailUsage(websiteId, 1);
  }

  // 2. Fetch institution name for sender branding
  let senderName = BREVO_SENDER_NAME || 'Campus Administration';
  if (websiteId) {
    try {
      const siteRes = await queryDb(`SELECT name FROM websites WHERE id = $1 LIMIT 1`, [websiteId]);
      if (siteRes.rows.length > 0 && siteRes.rows[0].name) {
        senderName = siteRes.rows[0].name;
      }
    } catch (_) {}
  }

  // 3. Dispatch email via central platform Brevo API
  const payload = {
    sender: {
      name: senderName,
      email: BREVO_SENDER_EMAIL || 'noreply@campus.edu',
    },
    to: [
      {
        email: to,
        name: toName || to,
      },
    ],
    subject: subject,
    htmlContent: html,
  };

  if (text) {
    payload.textContent = text;
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[MainBrevo] Email dispatch failed via main platform mailer:', data);
    throw new Error(data.message || 'Failed to dispatch email via main Brevo SMTP API.');
  }

  return {
    ...data,
    mailerType: 'main',
    senderEmail: BREVO_SENDER_EMAIL || 'noreply@campus.edu',
    senderName,
  };
}

export default {
  getWebsiteBrevoConfig,
  sendWebsiteEmail,
};
