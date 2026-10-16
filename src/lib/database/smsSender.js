import { queryDb } from './db.js';

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

/**
 * Retrieve tenant's custom SMS configuration.
 * Note: Never falls back to a global platform secret so tenant SMS is strictly isolated.
 */
export async function getWebsiteSmsConfig(websiteId) {
  if (!websiteId) {
    return {
      configured: false,
      isActive: false,
      message: 'Website ID required.'
    };
  }

  try {
    const res = await queryDb(
      `SELECT id, website_id, provider, sender_id, sender_type, api_key, client_id,
              endpoint_url, default_encoding, balance, is_active, updated_at
       FROM website_sms_gateways
       WHERE website_id = $1
       LIMIT 1`,
      [websiteId]
    );

    if (res.rows.length === 0) {
      return {
        configured: false,
        isActive: false,
        message: 'No SMS gateway configured for this institution.'
      };
    }

    const row = res.rows[0];
    return {
      id: row.id,
      websiteId: row.website_id,
      configured: Boolean(row.api_key && row.sender_id),
      provider: row.provider || 'mimsms',
      senderId: row.sender_id,
      senderType: row.sender_type || 'masking',
      apiKey: row.api_key,
      clientId: row.client_id || '',
      endpointUrl: row.endpoint_url || '',
      defaultEncoding: row.default_encoding || 'unicode',
      balance: parseFloat(row.balance || 0),
      isActive: Boolean(row.is_active),
      updatedAt: row.updated_at
    };
  } catch (err) {
    console.error('getWebsiteSmsConfig error:', err);
    return {
      configured: false,
      isActive: false,
      error: err.message
    };
  }
}

/**
 * Format and normalize Bangladeshi and International phone numbers
 */
export function normalizePhoneNumber(phone = '') {
  let cleaned = String(phone).replace(/[^\d+]/g, '').trim();
  if (!cleaned) return '';
  // If starts with 01, prefix with 880 (standard BD mobile format)
  if (/^01[3-9]\d{8}$/.test(cleaned)) {
    return `88${cleaned}`;
  }
  if (/^\+8801[3-9]\d{8}$/.test(cleaned)) {
    return cleaned.replace('+', '');
  }
  return cleaned;
}

/**
 * Dispatches an SMS using the website tenant's configured provider.
 */
export async function sendWebsiteSms(websiteId, { to, message, senderId = null, senderType = null }) {
  const config = await getWebsiteSmsConfig(websiteId);
  if (!config.configured || !config.isActive) {
    throw new Error('SMS Gateway is not active or configured for this institution. Please configure it in Staff Panel → SMS.');
  }

  const recipient = normalizePhoneNumber(to);
  if (!recipient) {
    throw new Error('Invalid recipient mobile number.');
  }

  const finalSenderId = senderId || config.senderId;
  const finalSenderType = senderType || config.senderType;
  const finalApiKey = config.apiKey;

  return executeSmsDispatch({
    provider: config.provider,
    apiKey: finalApiKey,
    clientId: config.clientId,
    senderId: finalSenderId,
    senderType: finalSenderType,
    endpointUrl: config.endpointUrl,
    to: recipient,
    message
  });
}

/**
 * Core dispatch execution across supported providers
 */
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
  const startTime = Date.now();
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
      // MiMSMS JSON Payload
      const payload = {
        api_key: apiKey,
        type: senderType === 'non-masking' ? 'text' : 'text',
        senderid: senderId,
        contacts: cleanTo,
        msg: cleanMsg
      };

      try {
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
      } catch (err) {
        throw new Error(`MiMSMS dispatch error: ${err.message}`);
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
      try {
        const res = await fetch(`${targetUrl}?${params.toString()}`);
        responseData = await res.text();
        if (!res.ok) {
          throw new Error(`Greenweb HTTP ${res.status}: ${responseData}`);
        }
      } catch (err) {
        throw new Error(`Greenweb dispatch error: ${err.message}`);
      }
      break;
    }

    case 'onnorokom': {
      targetUrl = targetUrl || 'https://api2.onnorokomsms.com/HttpSendSms.ashx';
      const params = new URLSearchParams({
        op: 'NumberSms',
        apiKey: apiKey,
        type: senderType === 'masking' ? 'TEXT' : 'TEXT',
        mobileNumber: cleanTo,
        smsText: cleanMsg,
        maskName: senderId || '',
        campaignName: 'CAMPUS_ALERT'
      });
      try {
        const res = await fetch(`${targetUrl}?${params.toString()}`);
        responseData = await res.text();
        if (!res.ok) {
          throw new Error(`Onnorokom HTTP ${res.status}: ${responseData}`);
        }
      } catch (err) {
        throw new Error(`Onnorokom dispatch error: ${err.message}`);
      }
      break;
    }

    case 'twilio': {
      if (!clientId) throw new Error('Twilio requires Account SID (Client ID).');
      targetUrl = targetUrl || `https://api.twilio.com/2010-04-01/Accounts/${clientId}/Messages.json`;
      const basicAuth = Buffer.from(`${clientId}:${apiKey}`).toString('base64');
      const formData = new URLSearchParams({
        From: senderId,
        To: cleanTo.startsWith('+') ? cleanTo : `+${cleanTo}`,
        Body: cleanMsg
      });
      try {
        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formData.toString()
        });
        responseData = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(responseData?.message || `Twilio HTTP ${res.status}`);
        }
      } catch (err) {
        throw new Error(`Twilio dispatch error: ${err.message}`);
      }
      break;
    }

    case 'custom':
    default: {
      if (!targetUrl) throw new Error('Custom SMS Gateway requires an Endpoint Base URL.');
      try {
        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            recipient: cleanTo,
            sender: senderId,
            message: cleanMsg
          })
        });
        responseData = await res.json().catch(() => ({ status: res.status }));
        if (!res.ok) {
          throw new Error(`Custom SMS endpoint HTTP ${res.status}`);
        }
      } catch (err) {
        throw new Error(`Custom SMS dispatch error: ${err.message}`);
      }
      break;
    }
  }

  const latencyMs = Date.now() - startTime;

  return {
    success: true,
    provider,
    recipient: cleanTo,
    senderId,
    latencyMs,
    timestamp: new Date().toISOString(),
    response: responseData
  };
}
