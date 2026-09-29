import { sendEmail as brevoSendEmail } from '../database/brevo.js';

/**
 * Standardized email dispatcher supporting both HTML and plain text bodies.
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} [options.toName] - Recipient name
 * @param {string} options.subject - Subject line
 * @param {string} [options.html] - HTML formatted message
 * @param {string} [options.text] - Plain text fallback
 * @returns {Promise<Object>}
 */
export const sendEmail = async ({ to, toName, subject, html, text }) => {
  const finalHtml = html || (text ? `<div style="font-family: sans-serif; white-space: pre-wrap;">${text}</div>` : '');
  return brevoSendEmail({
    to,
    toName,
    subject,
    html: finalHtml,
  });
};

export default {
  sendEmail,
};
