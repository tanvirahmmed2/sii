import { BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME } from './secret';

/**
 * Sends an email using Brevo's Transactional Email SMTP API.
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} [options.toName] - Recipient name (optional)
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content of the email
 * @returns {Promise<Object>} The API response details
 */
export const sendEmail = async ({ to, toName, subject, html }) => {
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
