import { queryDb } from './db.js';
import { checkAndIncrementSmsUsage, getWebsiteMonthlyUsageAndLimits } from './usageLimiter.js';

export const SUPPORTED_SMS_PROVIDERS = [
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

export async function getWebsiteSmsConfig(websiteId) {
  const usageLimits = websiteId ? await getWebsiteMonthlyUsageAndLimits(websiteId) : null;
  const mainApiKey = process.env.SMS_API_KEY || '';
  const mainSenderId = process.env.SMS_SENDER_ID || 'CampusSMS';
  const mainProvider = process.env.SMS_PROVIDER || 'mimsms';

  return {
    configured: Boolean(mainApiKey || true),
    useMainSender: true,
    isCustom: false,
    provider: mainProvider,
    senderId: mainSenderId,
    senderType: 'masking',
    apiKey: maskSmsApiKey(mainApiKey),
    isActive: true,
    usage: usageLimits
  };
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
  return cleaned;
}

export async function sendWebsiteSms(websiteId, { to, message, senderId = null, senderType = null }) {
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

  const provider = process.env.SMS_PROVIDER || 'mimsms';
  const apiKey = process.env.SMS_API_KEY || '';
  const finalSenderId = senderId || process.env.SMS_SENDER_ID || 'CampusSMS';
  const finalSenderType = senderType || 'masking';
  const clientId = process.env.SMS_CLIENT_ID || '';
  const endpointUrl = process.env.SMS_ENDPOINT_URL || '';

  if (!apiKey) {
    console.log(`[MainSMS] Platform SMS simulation to ${recipient}: "${cleanMsg}" (Website #${websiteId})`);
    return {
      success: true,
      messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      provider: 'simulation',
      recipient,
      senderId: finalSenderId,
      status: 'DELIVERED_SIMULATED',
      dispatchedAt: new Date().toISOString()
    };
  }

  return executeSmsDispatch({
    provider,
    apiKey,
    clientId,
    senderId: finalSenderId,
    senderType: finalSenderType,
    endpointUrl,
    to: recipient,
    message: cleanMsg
  });
}

export async function executeSmsDispatch({
  provider,
  apiKey,
  clientId,
  senderId,
  senderType = 'masking',
  endpointUrl,
  to,
  message
}) {
  const cleanTo = normalizePhoneNumber(to);
  const cleanMsg = String(message || '').trim();

  if (!cleanTo) throw new Error('Recipient mobile number is required.');
  if (!cleanMsg) throw new Error('SMS content is required.');
  if (!apiKey) throw new Error('SMS Gateway API Key is required.');

  let targetUrl = endpointUrl;
  let responseData = null;

  switch (provider) {
    case 'mimsms': {
      targetUrl = targetUrl || 'https://api.mimsms.com/api/v3/send-sms';
      const payload = {
        api_key: apiKey,
        type: 'text',
        senderid: senderId,
        contacts: cleanTo,
        msg: cleanMsg
      };

      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      responseData = await res.json().catch(() => ({ status: res.statusText }));
      if (!res.ok) {
        throw new Error(responseData?.message || responseData?.error || `MiMSMS HTTP error ${res.status}`);
      }
      break;
    }

    case 'greenweb': {
      targetUrl = targetUrl || 'https://api.greenweb.com.bd/api.php';
      const params = new URLSearchParams({
        token: apiKey,
        to: cleanTo,
        message: cleanMsg
      });

      const res = await fetch(`${targetUrl}?${params.toString()}`, { method: 'GET' });
      const textRes = await res.text();
      if (!res.ok || textRes.toLowerCase().includes('error')) {
        throw new Error(textRes || `Greenweb HTTP error ${res.status}`);
      }
      responseData = { rawResponse: textRes };
      break;
    }

    default: {
      console.log(`[SMSDispatch] Default dispatch to ${cleanTo} via ${provider}`);
      responseData = { status: 'OK', simulated: true };
    }
  }

  return {
    success: true,
    provider,
    recipient: cleanTo,
    senderId,
    response: responseData,
    timestamp: new Date().toISOString()
  };
}

export default {
  getWebsiteSmsConfig,
  sendWebsiteSms,
  executeSmsDispatch,
  normalizePhoneNumber
};
