import { queryDb } from './db.js';
import { BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME } from './secret.js';
import { checkAndIncrementMailUsage, getWebsiteMonthlyUsageAndLimits } from './usageLimiter.js';
import { recordSentMail } from '../redis/redisClient.js';

export function maskApiKey(key) {
  if (!key) return '';
  if (key.length <= 10) return '••••••••';
  return key.slice(0, 8) + '••••••••••••••••' + key.slice(-4);
}

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

export async function sendWebsiteEmail(websiteId, { to, toName, subject, html, text, recipientType = 'student', recipientId = null, type = 'general' }) {
  let senderName = BREVO_SENDER_NAME || 'Campus Administration';
  if (websiteId) {
    try {
      const siteRes = await queryDb(`SELECT name FROM websites WHERE id = $1 LIMIT 1`, [websiteId]);
      if (siteRes.rows.length > 0 && siteRes.rows[0].name) {
        senderName = siteRes.rows[0].name;
      }
    } catch (_) {}
  }

  const snippet = text || (html ? String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500) : null);

  if (!BREVO_API_KEY) {
    if (websiteId) {
      await recordSentMail({
        websiteId,
        recipientType,
        recipientId,
        recipientIdentifier: to,
        recipientName: toName || to,
        type,
        subject: subject || 'Institutional Notification',
        content: snippet,
        status: 'Simulated',
        provider: 'brevo',
      });
    }

    return {
      messageId: `sim_mail_${Date.now()}`,
      mailerType: 'simulated',
      senderEmail: BREVO_SENDER_EMAIL || 'noreply@campus.edu',
      senderName,
      status: 'DELIVERED_SIMULATED',
    };
  }

  if (websiteId) {
    await checkAndIncrementMailUsage(websiteId, 1);
  }

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
    if (websiteId) {
      await recordSentMail({
        websiteId,
        recipientType,
        recipientId,
        recipientIdentifier: to,
        recipientName: toName || to,
        type,
        subject: subject || 'Institutional Notification',
        content: snippet,
        status: 'Failed',
        failureReason: data.message || 'Brevo SMTP API dispatch failure',
        provider: 'brevo',
      });
    }
    console.error('[MainBrevo] Email dispatch failed via main platform mailer:', data);
    throw new Error(data.message || 'Failed to dispatch email via main Brevo SMTP API.');
  }

  if (websiteId) {
    await recordSentMail({
      websiteId,
      recipientType,
      recipientId,
      recipientIdentifier: to,
      recipientName: toName || to,
      type,
      subject: subject || 'Institutional Notification',
      content: snippet,
      status: 'Sent',
      provider: 'brevo',
    });
  }

  return {
    ...data,
    mailerType: 'main',
    senderEmail: BREVO_SENDER_EMAIL || 'noreply@campus.edu',
    senderName,
  };
}

const WebsiteBrevo = {
  getWebsiteBrevoConfig,
  sendWebsiteEmail,
};

export default WebsiteBrevo;
