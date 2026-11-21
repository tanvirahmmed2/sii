import { queryDb } from './db';
import { checkAndIncrementSmsUsage, getWebsiteMonthlyUsageAndLimits } from './usageLimiter';
import { ZENDSMS_API_KEY, ZENDSMS_SENDER_ID, ZENDSMS_URL } from './secret';
import { recordSentSms } from '../redis/redisClient';

export function maskSmsApiKey(val: string | null | undefined): string {
  if (!val) return '';
  const str = String(val).trim();
  if (str.length <= 8) return '••••••••';
  return str.slice(0, 4) + '••••••••••••••••' + str.slice(-4);
}

export function maskPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  const start = digits.slice(0, 3);
  const end = digits.slice(-3);
  const hiddenLength = Math.max(digits.length - 6, 2);
  return `${start}${'*'.repeat(hiddenLength)}${end}`;
}

export function normalizePhoneNumber(phone: string = ''): string {
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

export interface LogSmsAttemptParams {
  recipient: string;
  userType?: string;
  userId?: string | number | null;
  purpose?: string;
  channel?: string;
  provider?: string;
  senderId?: string | null;
  message: string;
  status: string;
  responseCode?: string | number | null;
  responseBody?: any;
  ip?: string | null;
}

export async function logSmsAttempt({
  recipient,
  userType = 'system',
  userId = null,
  purpose = 'general',
  channel = 'sms',
  provider = 'zendsms',
  senderId = null,
  message,
  status,
  responseCode = null,
  responseBody = null,
  ip = null
}: LogSmsAttemptParams): Promise<void> {
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
  } catch (err: any) {
    console.error('Failed to log SMS dispatch:', err.message);
  }
}

export interface SendSmsParams {
  to: string;
  message: string;
  senderId?: string | null;
  purpose?: string;
  userId?: string | number | null;
  userType?: string;
  ip?: string | null;
  websiteId?: string | number | null;
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
}: SendSmsParams): Promise<any> {
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

  const apiKey = ZENDSMS_API_KEY || process.env.ZENDSMS_API_KEY || process.env.SMS_API_KEY || '';
  const finalSenderId = senderId || ZENDSMS_SENDER_ID || process.env.ZENDSMS_SENDER_ID || 'ZendSMS';
  const targetUrl = ZENDSMS_URL || process.env.ZENDSMS_URL || 'https://api.zendsms.com/api/v1/send-sms';

  if (!apiKey) {
    const simulatedId = `sim_zend_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await logSmsAttempt({
      recipient,
      userType,
      userId,
      purpose,
      channel: 'sms',
      provider: 'zendsms',
      senderId: finalSenderId,
      message: cleanMsg,
      status: 'simulated',
      responseCode: '200',
      responseBody: { simulated: true, messageId: simulatedId },
      ip
    });

    if (websiteId) {
      await recordSentSms({
        websiteId,
        recipientType: userType || 'student',
        recipientId: userId,
        recipientIdentifier: recipient,
        recipientName: null,
        type: purpose || 'general',
        message: cleanMsg,
        status: 'Simulated',
        provider: 'zendsms',
        partsCount: 1,
      });
    }

    return {
      success: true,
      simulated: true,
      messageId: simulatedId,
      provider: 'zendsms',
      recipient,
      senderId: finalSenderId,
      status: 'DELIVERED_SIMULATED',
      dispatchedAt: new Date().toISOString()
    };
  }

  try {
    const payload = {
      recipient,
      sender_id: finalSenderId,
      message: cleanMsg,
      client_ref: `sms_${Date.now()}`
    };

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const data: any = await res.json().catch(() => ({}));
    const isSuccess = res.ok && (data.success === true || data.code === 200 || data.data?.message_id);

    if (isSuccess) {
      await logSmsAttempt({
        recipient,
        userType,
        userId,
        purpose,
        channel: 'sms',
        provider: 'zendsms',
        senderId: finalSenderId,
        message: cleanMsg,
        status: 'sent',
        responseCode: String(data.code || res.status || 200),
        responseBody: data,
        ip
      });

      if (websiteId) {
        await recordSentSms({
          websiteId,
          recipientType: userType || 'student',
          recipientId: userId,
          recipientIdentifier: recipient,
          recipientName: null,
          type: purpose || 'general',
          message: cleanMsg,
          status: 'Sent',
          provider: 'zendsms',
          partsCount: Number(data.data?.sms_count) || 1,
        });
      }

      return {
        success: true,
        messageId: data.data?.message_id || data.message_id || `sms_${Date.now()}`,
        provider: 'zendsms',
        recipient,
        senderId: finalSenderId,
        response: data,
        dispatchedAt: new Date().toISOString()
      };
    } else {
      const errMsg = data.message || data.error || `ZendSMS error status ${res.status}`;
      await logSmsAttempt({
        recipient,
        userType,
        userId,
        purpose,
        channel: 'sms',
        provider: 'zendsms',
        senderId: finalSenderId,
        message: cleanMsg,
        status: 'failed',
        responseCode: String(data.code || res.status || 500),
        responseBody: data,
        ip
      });

      if (websiteId) {
        await recordSentSms({
          websiteId,
          recipientType: userType || 'student',
          recipientId: userId,
          recipientIdentifier: recipient,
          recipientName: null,
          type: purpose || 'general',
          message: cleanMsg,
          status: 'Failed',
          failureReason: errMsg,
          provider: 'zendsms',
          partsCount: 1,
        });
      }

      throw new Error(errMsg);
    }
  } catch (err: any) {
    await logSmsAttempt({
      recipient,
      userType,
      userId,
      purpose,
      channel: 'sms',
      provider: 'zendsms',
      senderId: finalSenderId,
      message: cleanMsg,
      status: 'failed',
      responseCode: '500',
      responseBody: { error: err.message },
      ip
    });

    if (websiteId) {
      await recordSentSms({
        websiteId,
        recipientType: userType || 'student',
        recipientId: userId,
        recipientIdentifier: recipient,
        recipientName: null,
        type: purpose || 'general',
        message: cleanMsg,
        status: 'Failed',
        failureReason: err.message,
        provider: 'zendsms',
        partsCount: 1,
      });
    }

    throw err;
  }
}

export async function getWebsiteSmsConfig(websiteId: string | number | null): Promise<any> {
  const usageLimits = websiteId ? await getWebsiteMonthlyUsageAndLimits(websiteId) : null;
  const mainApiKey = ZENDSMS_API_KEY || process.env.ZENDSMS_API_KEY || '';
  const mainSenderId = ZENDSMS_SENDER_ID || process.env.ZENDSMS_SENDER_ID || 'ZendSMS';

  return {
    configured: Boolean(mainApiKey),
    useMainSender: true,
    isCustom: false,
    provider: 'zendsms',
    senderId: mainSenderId,
    senderType: 'masking',
    apiKey: maskSmsApiKey(mainApiKey),
    isActive: Boolean(mainApiKey),
    usage: usageLimits
  };
}

export interface SendWebsiteSmsParams {
  to: string;
  message: string;
  senderId?: string | null;
  purpose?: string;
}

export async function sendWebsiteSms(websiteId: string | number, { to, message, senderId = null, purpose = 'website_sms' }: SendWebsiteSmsParams): Promise<any> {
  return sendSms({
    to,
    message,
    senderId,
    purpose,
    websiteId,
    userType: 'creator'
  });
}

const SmsSender = {
  maskSmsApiKey,
  maskPhoneNumber,
  normalizePhoneNumber,
  logSmsAttempt,
  sendSms,
  getWebsiteSmsConfig,
  sendWebsiteSms
};

export default SmsSender;
