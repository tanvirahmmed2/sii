import { queryDb } from './db.js';
import { checkAndIncrementSmsUsage, getWebsiteMonthlyUsageAndLimits } from './usageLimiter.js';
import { BULKSMSBD_API_KEY, BULKSMSBD_SENDER_ID, BULKSMSBD_URL } from './secret.js';

export const SUPPORTED_SMS_PROVIDERS = [
  {
    code: 'bulksmsbd',
    name: 'BulkSMSBD Gateway',
    defaultEndpoint: 'http://bulksmsbd.net/api/smsapi',
    requiresClientId: false,
    supportsMasking: true
  },
  {
    code: 'mimsms',
    name: 'MiMSMS (Bangladesh / Operator Direct)',
    defaultEndpoint: 'https://api.mimsms.com/api/v3/send-sms',
    requiresClientId: false,
    supportsMasking: true
  },
  {
    code: 'greenweb',
    name: 'Greenweb SMS Gateway',
    defaultEndpoint: 'https://api.greenweb.com.bd/api.php',
    requiresClientId: false,
    supportsMasking: true
  },
  {
    code: 'onnorokom',
    name: 'Onnorokom SMS Gateway',
    defaultEndpoint: 'https://api2.onnorokomsms.com/HttpSendSms.ashx',
    requiresClientId: true,
    supportsMasking: true
  },
  {
    code: 'twilio',
    name: 'Twilio Global SMS',
    defaultEndpoint: 'https://api.twilio.com/2010-04-01',
    requiresClientId: true,
    supportsMasking: false
  },
  {
    code: 'custom',
    name: 'Custom HTTP GET / POST Endpoint',
    defaultEndpoint: '',
    requiresClientId: false,
    supportsMasking: true
  }
];

export function maskSmsApiKey(val) {
  if (!val) return '';
  const str = String(val).trim();
  if (str.length <= 8) return '••••••••';
  return str.slice(0, 4) + '••••••••••••••••' + str.slice(-4);
}

export function maskPhoneNumber(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  const start = digits.slice(0, 3);
  const end = digits.slice(-3);
  const hiddenLength = Math.max(digits.length - 6, 2);
  return `${start}${'*'.repeat(hiddenLength)}${end}`;
}

export function normalizePhoneNumber(phone = '') {
  let cleaned = String(phone).replace(/[^\d+]/g, '').trim();
  if (!cleaned) return '';
  if (/^01[3-9]\d{8}$/.test(cleaned)) {
    return `88${cleaned}`;
  }
  if (/^\+8801[3-9]\d{8}$/.test(cleaned)) {
    return cleaned.replace('+', '');
  }
  if (/^8801[3-9]\d{8}$/.test(cleaned)) {
    return cleaned;
  }
  return cleaned.replace(/^\+/, '');
}

export async function logSmsAttempt({
  recipient,
  userType = 'system',
  userId = null,
  purpose = 'general',
  channel = 'sms',
  provider = 'bulksmsbd',
  senderId = null,
  message,
  status,
  responseCode = null,
  responseBody = null,
  ip = null
}) {
  try {
    await queryDb(
      `INSERT INTO sms_logs (
        recipient, user_type, user_id, purpose, channel, provider,
        sender_id, message, status, response_code, response_body, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        recipient,
        userType,
        userId,
        purpose,
        channel,
        provider,
        senderId,
        message,
        status,
        String(responseCode || ''),
        responseBody ? JSON.stringify(responseBody) : null,
        ip
      ]
    );
  } catch (err) {
    console.error('Failed to log SMS dispatch:', err.message);
  }
}

export async function sendSms({
  to,
  message,
  senderId = null,
  purpose = 'general',
  userId = null,
  userType = 'system',
  ip = null,
  websiteId = null
}) {
  const recipient = normalizePhoneNumber(to);
  if (!recipient) {
    throw new Error('Invalid recipient mobile number.');
  }

  const cleanMsg = String(message || '').trim();
  if (!cleanMsg) {
    throw new Error('SMS content is required.');
  }

  if (websiteId) {
    await checkAndIncrementSmsUsage(websiteId, 1);
  }

  const apiKey = BULKSMSBD_API_KEY || process.env.SMS_API_KEY || '';
  const finalSenderId = senderId || BULKSMSBD_SENDER_ID || process.env.SMS_SENDER_ID || '8809617614488';
  const targetUrl = BULKSMSBD_URL || 'http://bulksmsbd.net/api/smsapi';

  if (!apiKey) {
    const simulatedId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await logSmsAttempt({
      recipient,
      userType,
      userId,
      purpose,
      channel: 'sms',
      provider: 'bulksmsbd',
      senderId: finalSenderId,
      message: cleanMsg,
      status: 'simulated',
      responseCode: '202',
      responseBody: { simulated: true, messageId: simulatedId },
      ip
    });

    return {
      success: true,
      simulated: true,
      messageId: simulatedId,
      provider: 'bulksmsbd',
      recipient,
      senderId: finalSenderId,
      status: 'DELIVERED_SIMULATED',
      dispatchedAt: new Date().toISOString()
    };
  }

  try {
    const payload = {
      api_key: apiKey,
      type: 'text',
      number: recipient,
      senderid: finalSenderId,
      message: cleanMsg
    };

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (String(data.response_code) === '202') {
      await logSmsAttempt({
        recipient,
        userType,
        userId,
        purpose,
        channel: 'sms',
        provider: 'bulksmsbd',
        senderId: finalSenderId,
        message: cleanMsg,
        status: 'sent',
        responseCode: data.response_code,
        responseBody: data,
        ip
      });

      return {
        success: true,
        messageId: data.message_id || `sms_${Date.now()}`,
        provider: 'bulksmsbd',
        recipient,
        senderId: finalSenderId,
        response: data,
        dispatchedAt: new Date().toISOString()
      };
    } else {
      const errMsg = data.error_message || data.message || `BulkSMSBD error code ${data.response_code}`;
      await logSmsAttempt({
        recipient,
        userType,
        userId,
        purpose,
        channel: 'sms',
        provider: 'bulksmsbd',
        senderId: finalSenderId,
        message: cleanMsg,
        status: 'failed',
        responseCode: data.response_code,
        responseBody: data,
        ip
      });
      throw new Error(errMsg);
    }
  } catch (err) {
    await logSmsAttempt({
      recipient,
      userType,
      userId,
      purpose,
      channel: 'sms',
      provider: 'bulksmsbd',
      senderId: finalSenderId,
      message: cleanMsg,
      status: 'failed',
      responseCode: '500',
      responseBody: { error: err.message },
      ip
    });
    throw err;
  }
}

export async function getWebsiteSmsConfig(websiteId) {
  const usageLimits = websiteId ? await getWebsiteMonthlyUsageAndLimits(websiteId) : null;
  const mainApiKey = BULKSMSBD_API_KEY || process.env.SMS_API_KEY || '';
  const mainSenderId = BULKSMSBD_SENDER_ID || process.env.SMS_SENDER_ID || '8809617614488';

  return {
    configured: Boolean(mainApiKey || true),
    useMainSender: true,
    isCustom: false,
    provider: 'bulksmsbd',
    senderId: mainSenderId,
    senderType: 'masking',
    apiKey: maskSmsApiKey(mainApiKey),
    isActive: true,
    usage: usageLimits
  };
}

export async function sendWebsiteSms(websiteId, { to, message, senderId = null, purpose = 'website_sms' }) {
  return sendSms({
    to,
    message,
    senderId,
    purpose,
    websiteId,
    userType: 'creator'
  });
}

export default {
  SUPPORTED_SMS_PROVIDERS,
  maskSmsApiKey,
  maskPhoneNumber,
  normalizePhoneNumber,
  logSmsAttempt,
  sendSms,
  getWebsiteSmsConfig,
  sendWebsiteSms
};
