import { queryDb } from './db.js';
import { BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME } from './secret.js';

export function maskApiKey(key) {
  if (!key) return '';
  if (key.length <= 10) return '••••••••';
  return key.slice(0, 8) + '••••••••••••••••' + key.slice(-4);
}

/**
 * Retrieves the Brevo mailer configuration for a specific website tenant.
 * Does not fall back to platform root credentials to preserve tenant isolation.
 *
 * @param {string|number} websiteId
 * @returns {Promise<Object>}
 */
export async function getWebsiteBrevoConfig(websiteId) {
  let institutionName = 'Campus Administration';
  if (websiteId) {
    try {
      const siteRes = await queryDb(`SELECT name FROM websites WHERE id = $1 LIMIT 1`, [websiteId]);
      if (siteRes.rows.length > 0 && siteRes.rows[0].name) {
        institutionName = siteRes.rows[0].name;
      }
    } catch (_) {}
  }

  if (!websiteId) {
    return {
      configured: false,
      isCustom: false,
      apiKey: null,
      senderEmail: null,
      senderName: institutionName,
      websiteName: institutionName,
      isActive: false
    };
  }

  try {
    const res = await queryDb(
      `SELECT id, website_id, brevo_api_key, brevo_sender_email, brevo_sender_name, is_active, updated_at
       FROM website_brevo_mailer
       WHERE website_id = $1 AND is_active = TRUE
       LIMIT 1`,
      [websiteId]
    );

    if (res.rows.length > 0) {
      const row = res.rows[0];
      return {
        configured: Boolean(row.brevo_api_key && row.brevo_sender_email),
        isCustom: true,
        apiKey: row.brevo_api_key,
        senderEmail: row.brevo_sender_email,
        senderName: row.brevo_sender_name || institutionName,
        websiteName: institutionName,
        isActive: Boolean(row.is_active),
        updatedAt: row.updated_at
      };
    }
  } catch (err) {
    console.warn(`[WebsiteBrevo] Failed to query website_brevo_mailer for website ${websiteId}:`, err.message);
  }

  return {
    configured: false,
    isCustom: false,
    apiKey: null,
    senderEmail: null,
    senderName: institutionName,
    websiteName: institutionName,
    isActive: false
  };
}

/**
 * Sends a transactional email using the main platform Brevo credentials.
 */
async function sendViaMainBrevoMailer({ to, toName, subject, html, text, fallbackSenderName }) {
  if (!BREVO_API_KEY) {
    throw new Error('Main platform BREVO_API_KEY is not defined in environment secrets.');
  }

  const payload = {
    sender: {
      name: fallbackSenderName || BREVO_SENDER_NAME || 'Campus Administration',
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

  return data;
}

/**
 * Sends a transactional email using the website tenant's Brevo mailer configuration.
 * If the website mailer is not set up or fails, automatically falls back to the main website/platform mailer.
 *
 * @param {string|number} websiteId - Website tenant ID
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} [options.toName] - Recipient display name
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML email body
 * @param {string} [options.text] - Plain text email body (optional)
 * @returns {Promise<Object>} Brevo API response { messageId }
 */
export async function sendWebsiteEmail(websiteId, { to, toName, subject, html, text }) {
  const config = await getWebsiteBrevoConfig(websiteId);

  // If website mailer is configured and active, attempt sending via its credentials
  if (config.configured && config.apiKey && config.senderEmail) {
    try {
      const payload = {
        sender: {
          name: config.senderName || 'Campus Administration',
          email: config.senderEmail,
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
          'api-key': config.apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        console.warn(`[WebsiteBrevo] Custom mailer failed for website ${websiteId} (${data.message || 'Error'}). Falling back to main platform mailer...`);
        return await sendViaMainBrevoMailer({
          to,
          toName,
          subject,
          html,
          text,
          fallbackSenderName: config.senderName
        });
      }

      return data;
    } catch (error) {
      console.warn(`[WebsiteBrevo] Exception in custom mailer for website ${websiteId}: ${error.message}. Falling back to main platform mailer...`);
      return await sendViaMainBrevoMailer({
        to,
        toName,
        subject,
        html,
        text,
        fallbackSenderName: config.senderName
      });
    }
  }

  // Website mailer is not configured or not active -> fall back to main website mailer
  return await sendViaMainBrevoMailer({
    to,
    toName,
    subject,
    html,
    text,
    fallbackSenderName: config.senderName
  });
}

/**
 * Test a tenant's Brevo credentials before saving or from current settings.
 */
export async function testWebsiteBrevoConnection({ apiKey, senderEmail, senderName, testRecipientEmail, websiteName }) {
  if (!apiKey) throw new Error('BREVO_API_KEY is required.');
  if (!senderEmail) throw new Error('BREVO_SENDER_EMAIL is required.');
  if (!testRecipientEmail) throw new Error('Recipient email address is required.');

  const payload = {
    sender: {
      name: senderName || websiteName || 'Campus Administration',
      email: senderEmail,
    },
    to: [
      {
        email: testRecipientEmail,
        name: 'Test Recipient',
      },
    ],
    subject: `Brevo Connection Test - ${websiteName || 'Campus Portal'}`,
    htmlContent: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="font-size: 18px; font-weight: 600; color: #0f172a; margin-top: 0;">✓ Brevo Gateway Successfully Connected</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
          Your institution mailer gateway has been successfully verified with Brevo Transactional Email SMTP API.
        </p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin: 16px 0; font-family: monospace; font-size: 12px; color: #1e293b;">
          <div>Sender: ${senderName || 'Campus Administration'} &lt;${senderEmail}&gt;</div>
          <div>Recipient: ${testRecipientEmail}</div>
          <div>Timestamp: ${new Date().toISOString()}</div>
        </div>
        <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">Sent via ${websiteName || 'School Management System'} Brevo Mailer.</p>
      </div>
    `,
  };

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Brevo API rejected the credentials. Verify that the API key is active and sender email is authorized in Brevo.');
  }

  return data;
}

export default {
  getWebsiteBrevoConfig,
  sendWebsiteEmail,
  testWebsiteBrevoConnection
};
