import { BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME } from './secret';
import { sendWebsiteEmail, getWebsiteBrevoConfig } from './websiteBrevo.js';

export { sendWebsiteEmail, getWebsiteBrevoConfig };

/**
 * Sends an email using Brevo's Transactional Email SMTP API.
 * Supports optional options.websiteId to automatically use tenant mailer.
 */
export const sendEmail = async ({ to, toName, subject, html, websiteId }) => {
  if (websiteId) {
    return sendWebsiteEmail(websiteId, { to, toName, subject, html });
  }

  if (!BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is not defined in environment secrets.');
  }

  const payload = {
    sender: {
      name: BREVO_SENDER_NAME || 'School Management System',
      email: BREVO_SENDER_EMAIL,
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

  try {
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
      console.error('Brevo Email sending failed. API details:', data);
      throw new Error(data.message || 'Failed to send email via Brevo API');
    }

    return data;
  } catch (error) {
    console.error('Brevo sendEmail helper exception:', error);
    throw error;
  }
};

/**
 * Builds an HTML email adhering strictly to STYLE.md specifications:
 * - High-contrast, clean slate palette (slate-50 background, white card, slate-200 border)
 * - Strict typography: font-normal, font-medium, font-semibold (zero bold/extrabold)
 * - Compact radiuses: 4px / rounded (no rounded-xl, 2xl, or full)
 * - Zero icons, zero decorative shapes or colorful badges
 * - Accessible, high-contrast, clean professional layout
 */
export function buildStyledEmail({
  title,
  subtitle,
  recipientName,
  bodyParagraphs = [],
  code,
  codeLabel = 'Security Code',
  actionUrl,
  actionText,
  footerNote,
  extraHtml = '',
}) {
  const codeSection = code
    ? `
      <div style="margin: 20px 0; padding: 14px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; text-align: center;">
        ${codeLabel ? `<div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; color: #64748b; margin-bottom: 6px;">${codeLabel}</div>` : ''}
        <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 22px; font-weight: 600; letter-spacing: 4px; color: #0f172a;">${code}</div>
      </div>
    `
    : '';

  const buttonSection = actionUrl && actionText
    ? `
      <div style="margin: 24px 0; text-align: center;">
        <a href="${actionUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 12px; font-weight: 500; text-decoration: none; padding: 10px 20px; border-radius: 4px;">
          ${actionText}
        </a>
        <div style="margin-top: 12px; font-size: 11px; color: #94a3b8; word-break: break-all;">
          Direct link: <a href="${actionUrl}" style="color: #475569; text-decoration: underline;">${actionUrl}</a>
        </div>
      </div>
    `
    : '';

  const paragraphsHtml = bodyParagraphs
    .map(
      (p) =>
        `<p style="margin: 0 0 12px 0; font-size: 13px; line-height: 1.6; color: #334155; font-weight: 400;">${p}</p>`
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title || 'Notification'}</title>
    </head>
    <body style="margin: 0; padding: 24px 16px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 24px; text-align: left;" cellpadding="0" cellspacing="0" border="0">
              ${title ? `
              <tr>
                <td style="padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
                  <h1 style="margin: 0; font-size: 15px; font-weight: 600; color: #0f172a; line-height: 1.4;">${title}</h1>
                  ${subtitle ? `<div style="margin-top: 4px; font-size: 12px; color: #64748b; font-weight: 400;">${subtitle}</div>` : ''}
                </td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding-top: 16px;">
                  ${recipientName ? `<p style="margin: 0 0 12px 0; font-size: 13px; color: #0f172a; font-weight: 500;">Hello ${recipientName},</p>` : ''}
                  ${paragraphsHtml}
                  ${codeSection}
                  ${buttonSection}
                  ${extraHtml || ''}
                  ${footerNote ? `<p style="margin: 16px 0 0 0; font-size: 11px; line-height: 1.5; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 12px;">${footerNote}</p>` : ''}
                </td>
              </tr>
            </table>
            <div style="max-width: 540px; margin-top: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
              This is an automated system notification. Keep your credentials and security tokens confidential.
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `.trim();
}
