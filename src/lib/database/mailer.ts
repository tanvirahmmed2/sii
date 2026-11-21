import { queryDb } from './db';
import { RESEND_API_KEY, RESEND_SENDER_EMAIL, RESEND_SENDER_NAME } from './secret';
import { checkAndIncrementMailUsage, getWebsiteMonthlyUsageAndLimits } from './usageLimiter';
import { recordSentMail } from '../redis/redisClient';

export function maskApiKey(key: string | null | undefined): string {
  if (!key) return '';
  const str = String(key).trim();
  if (str.length <= 10) return '••••••••';
  return str.slice(0, 8) + '••••••••••••••••' + str.slice(-4);
}

export interface BuildStyledEmailParams {
  title?: string;
  subtitle?: string;
  recipientName?: string;
  bodyParagraphs?: string[];
  code?: string;
  codeLabel?: string;
  previewText?: string;
  bodyHtml?: string;
  bodyContent?: string;
  actionUrl?: string | null;
  actionText?: string | null;
  ctaButton?: { label?: string; url?: string } | null;
  footerNote?: string;
  extraHtml?: string;
  institutionName?: string | null;
  senderName?: string | null;
  websiteName?: string | null;
}

export function buildStyledEmail({
  title,
  subtitle,
  recipientName,
  bodyParagraphs,
  code,
  codeLabel,
  previewText = '',
  bodyHtml = '',
  bodyContent = '',
  actionUrl = null,
  actionText = null,
  ctaButton = null,
  footerNote = '',
  extraHtml = '',
  institutionName = null,
  senderName = null,
  websiteName = null
}: BuildStyledEmailParams): string {
  const brandName = institutionName || senderName || websiteName || RESEND_SENDER_NAME || 'Disibin';
  let computedHtml = bodyHtml || bodyContent;
  if (!computedHtml) {
    const parts: string[] = [];
    if (recipientName) {
      parts.push(`<p style="margin: 0 0 16px 0;">Hello ${recipientName},</p>`);
    }
    if (subtitle) {
      parts.push(`<p style="margin: 0 0 16px 0; font-weight: 600; color: #475569;">${subtitle}</p>`);
    }
    if (bodyParagraphs && bodyParagraphs.length > 0) {
      for (const p of bodyParagraphs) {
        parts.push(`<p style="margin: 0 0 16px 0;">${p}</p>`);
      }
    }
    if (code) {
      parts.push(`
        <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
          <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 8px;">${codeLabel || 'Verification Code'}</div>
          <div style="font-size: 32px; font-weight: 700; letter-spacing: 0.2em; color: #0f172a;">${code}</div>
        </div>
      `);
    }
    computedHtml = parts.join('');
  }
  const finalActionUrl = actionUrl || ctaButton?.url || null;
  const finalActionText = actionText || ctaButton?.label || null;
  const actionButton = finalActionUrl && finalActionText ? `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
      <tr>
        <td align="center">
          <a href="${actionUrl}" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; letter-spacing: 0.02em;">
            ${actionText}
          </a>
        </td>
      </tr>
    </table>
  ` : '';

  const preheader = previewText ? `
    <div style="display: none; max-height: 0px; overflow: hidden;">
      ${previewText}
    </div>
  ` : '';

  const footer = footerNote ? `
    <p style="margin: 24px 0 0 0; font-size: 12px; color: #64748b; line-height: 1.6; border-top: 1px solid #e2e8f0; padding-top: 16px;">
      ${footerNote}
    </p>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || brandName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  ${preheader}
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);">
              <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 700; letter-spacing: -0.01em;">
                ${brandName}
              </h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              ${title ? `<h1 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.3;">${title}</h1>` : ''}
              <div style="font-size: 14px; line-height: 1.65; color: #334155;">
                ${computedHtml}
                ${extraHtml}
              </div>
              ${actionButton}
              ${footer}
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                © ${new Date().getFullYear()} ${brandName}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export interface LogEmailAttemptParams {
  websiteId?: string | number | null;
  recipient: string;
  recipientName?: string | null;
  userType?: string;
  userId?: string | number | null;
  purpose?: string;
  subject: string;
  content?: string | null;
  channel?: string;
  provider?: string;
  senderEmail?: string | null;
  senderName?: string | null;
  status?: string;
  messageId?: string | null;
  failureReason?: string | null;
  ip?: string | null;
}

export async function logEmailAttempt({
  websiteId = null,
  recipient,
  recipientName = null,
  userType = 'system',
  userId = null,
  purpose = 'general',
  subject,
  content = null,
  channel = 'email',
  provider = 'resend',
  senderEmail = null,
  senderName = null,
  status = 'Sent',
  messageId = null,
  failureReason = null,
  ip = null
}: LogEmailAttemptParams): Promise<void> {
  try {
    await queryDb(
      `INSERT INTO email_logs (
        website_id, recipient, recipient_name, user_type, user_id,
        purpose, subject, content, channel, provider,
        sender_email, sender_name, status, message_id, failure_reason, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        websiteId ? Number(websiteId) : null,
        String(recipient || '').trim(),
        recipientName ? String(recipientName).trim() : null,
        String(userType || 'system').trim(),
        userId ? Number(userId) : null,
        String(purpose || 'general').trim(),
        String(subject || 'System Notification').trim(),
        content ? String(content).trim() : null,
        String(channel || 'email').trim(),
        String(provider || 'resend').trim(),
        senderEmail ? String(senderEmail).trim() : null,
        senderName ? String(senderName).trim() : null,
        String(status || 'Sent').trim(),
        messageId ? String(messageId).trim() : null,
        failureReason ? String(failureReason).trim() : null,
        ip ? String(ip).trim() : null
      ]
    );
  } catch (err: any) {
    console.error('Failed to log email dispatch:', err.message);
  }
}

export interface SendEmailParams {
  to: string;
  toName?: string | null;
  subject: string;
  html?: string | null;
  text?: string | null;
  fromEmail?: string | null;
  fromName?: string | null;
  websiteId?: string | number | null;
  recipientType?: string;
  recipientId?: string | number | null;
  purpose?: string;
  ip?: string | null;
}

export async function sendEmail({
  to,
  toName,
  subject,
  html,
  text,
  fromEmail,
  fromName,
  websiteId = null,
  recipientType = 'system',
  recipientId = null,
  purpose = 'general',
  ip = null
}: SendEmailParams): Promise<any> {
  const recipientEmail = String(to || '').trim().toLowerCase();
  if (!recipientEmail || !recipientEmail.includes('@')) {
    throw new Error('Invalid recipient email address.');
  }

  const emailSubject = String(subject || 'Notification').trim();
  const effectiveFromName = fromName || RESEND_SENDER_NAME || 'Disibin';
  const effectiveFromEmail = fromEmail || RESEND_SENDER_EMAIL || 'onboarding@resend.dev';
  const fromFormatted = `"${effectiveFromName.replace(/"/g, '')}" <${effectiveFromEmail}>`;

  const finalHtml = html || (text ? `<p style="font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #0f172a;">${text.replace(/\n/g, '<br/>')}</p>` : '');
  const finalText = text || (html ? html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '');

  if (websiteId) {
    await checkAndIncrementMailUsage(websiteId, 1);
  }

  const apiKey = RESEND_API_KEY || process.env.RESEND_API_KEY || '';

  if (!apiKey) {
    const simulatedId = `sim_resend_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    await logEmailAttempt({
      websiteId,
      recipient: recipientEmail,
      recipientName: toName || null,
      userType: recipientType,
      userId: recipientId,
      purpose,
      subject: emailSubject,
      content: finalText || emailSubject,
      channel: 'email',
      provider: 'resend',
      senderEmail: effectiveFromEmail,
      senderName: effectiveFromName,
      status: 'Simulated',
      messageId: simulatedId,
      failureReason: null,
      ip
    });

    if (websiteId) {
      await recordSentMail({
        websiteId,
        recipientType: recipientType || 'student',
        recipientId,
        recipientIdentifier: recipientEmail,
        recipientName: toName || null,
        type: purpose || 'general',
        subject: emailSubject,
        content: finalText || emailSubject,
        status: 'Simulated',
        failureReason: null,
        provider: 'resend'
      });
    }

    return {
      success: true,
      simulated: true,
      id: simulatedId,
      provider: 'resend',
      from: fromFormatted,
      to: recipientEmail,
      subject: emailSubject,
      dispatchedAt: new Date().toISOString()
    };
  }

  try {
    const payload = {
      from: fromFormatted,
      to: [recipientEmail],
      subject: emailSubject,
      html: finalHtml,
      text: finalText
    };

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const data: any = await res.json().catch(() => ({}));

    if (res.ok && data?.id) {
      await logEmailAttempt({
        websiteId,
        recipient: recipientEmail,
        recipientName: toName || null,
        userType: recipientType,
        userId: recipientId,
        purpose,
        subject: emailSubject,
        content: finalText || emailSubject,
        channel: 'email',
        provider: 'resend',
        senderEmail: effectiveFromEmail,
        senderName: effectiveFromName,
        status: 'Sent',
        messageId: data.id,
        failureReason: null,
        ip
      });

      if (websiteId) {
        await recordSentMail({
          websiteId,
          recipientType: recipientType || 'student',
          recipientId,
          recipientIdentifier: recipientEmail,
          recipientName: toName || null,
          type: purpose || 'general',
          subject: emailSubject,
          content: finalText || emailSubject,
          status: 'Sent',
          failureReason: null,
          provider: 'resend'
        });
      }

      return {
        success: true,
        id: data.id,
        provider: 'resend',
        from: fromFormatted,
        to: recipientEmail,
        subject: emailSubject,
        dispatchedAt: new Date().toISOString()
      };
    } else {
      const errMsg = data?.message || data?.error || `Resend delivery failed with status ${res.status}`;

      await logEmailAttempt({
        websiteId,
        recipient: recipientEmail,
        recipientName: toName || null,
        userType: recipientType,
        userId: recipientId,
        purpose,
        subject: emailSubject,
        content: finalText || emailSubject,
        channel: 'email',
        provider: 'resend',
        senderEmail: effectiveFromEmail,
        senderName: effectiveFromName,
        status: 'Failed',
        messageId: null,
        failureReason: errMsg,
        ip
      });

      if (websiteId) {
        await recordSentMail({
          websiteId,
          recipientType: recipientType || 'student',
          recipientId,
          recipientIdentifier: recipientEmail,
          recipientName: toName || null,
          type: purpose || 'general',
          subject: emailSubject,
          content: finalText || emailSubject,
          status: 'Failed',
          failureReason: errMsg,
          provider: 'resend'
        });
      }

      throw new Error(errMsg);
    }
  } catch (err: any) {
    await logEmailAttempt({
      websiteId,
      recipient: recipientEmail,
      recipientName: toName || null,
      userType: recipientType,
      userId: recipientId,
      purpose,
      subject: emailSubject,
      content: finalText || emailSubject,
      channel: 'email',
      provider: 'resend',
      senderEmail: effectiveFromEmail,
      senderName: effectiveFromName,
      status: 'Failed',
      messageId: null,
      failureReason: err.message,
      ip
    });

    if (websiteId) {
      await recordSentMail({
        websiteId,
        recipientType: recipientType || 'student',
        recipientId,
        recipientIdentifier: recipientEmail,
        recipientName: toName || null,
        type: purpose || 'general',
        subject: emailSubject,
        content: finalText || emailSubject,
        status: 'Failed',
        failureReason: err.message,
        provider: 'resend'
      });
    }

    throw err;
  }
}

export async function getWebsiteMailerConfig(websiteId: string | number | null): Promise<any> {
  let institutionName = RESEND_SENDER_NAME || 'Campus Administration';
  if (websiteId) {
    try {
      const siteRes = await queryDb(`SELECT name FROM websites WHERE id = $1 LIMIT 1`, [websiteId]);
      if (siteRes.rows.length > 0 && siteRes.rows[0].name) {
        institutionName = siteRes.rows[0].name;
      }
    } catch (_) {}
  }

  const usageLimits = websiteId ? await getWebsiteMonthlyUsageAndLimits(websiteId) : null;
  const apiKey = RESEND_API_KEY || process.env.RESEND_API_KEY || '';

  return {
    configured: Boolean(apiKey),
    isCustom: false,
    useMainMailer: true,
    provider: 'resend',
    apiKey: maskApiKey(apiKey),
    senderEmail: RESEND_SENDER_EMAIL || 'onboarding@resend.dev',
    senderName: institutionName,
    websiteName: institutionName,
    isActive: Boolean(apiKey),
    usage: usageLimits
  };
}

export const getWebsiteResendConfig = getWebsiteMailerConfig;
export const getWebsiteBrevoConfig = getWebsiteMailerConfig;

export interface SendWebsiteEmailParams {
  to: string;
  toName?: string | null;
  subject: string;
  html?: string | null;
  text?: string | null;
  recipientType?: string;
  recipientId?: string | number | null;
  type?: string;
  ip?: string | null;
}

export async function sendWebsiteEmail(websiteId: string | number, {
  to,
  toName,
  subject,
  html,
  text,
  recipientType = 'student',
  recipientId = null,
  type = 'general',
  ip = null
}: SendWebsiteEmailParams): Promise<any> {
  let institutionName = RESEND_SENDER_NAME || 'Campus Administration';
  if (websiteId) {
    try {
      const siteRes = await queryDb(`SELECT name FROM websites WHERE id = $1 LIMIT 1`, [websiteId]);
      if (siteRes.rows.length > 0 && siteRes.rows[0].name) {
        institutionName = siteRes.rows[0].name;
      }
    } catch (_) {}
  }

  return sendEmail({
    to,
    toName,
    subject,
    html,
    text,
    fromEmail: RESEND_SENDER_EMAIL || 'onboarding@resend.dev',
    fromName: institutionName,
    websiteId,
    recipientType,
    recipientId,
    purpose: type || 'general',
    ip
  });
}

const Mailer = {
  sendEmail,
  sendWebsiteEmail,
  buildStyledEmail,
  getWebsiteMailerConfig,
  getWebsiteResendConfig,
  getWebsiteBrevoConfig,
  logEmailAttempt,
  maskApiKey
};

export default Mailer;
