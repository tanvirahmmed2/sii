import crypto from 'crypto';
import {
  META_APP_ID,
  META_APP_SECRET,
  META_ACCESS_TOKEN,
  META_PAGE_ID,
  META_PAGE_ACCESS_TOKEN,
  META_INSTAGRAM_ACCOUNT_ID,
  META_PHONE_NUMBER_ID,
  META_WABA_ID,
  META_WEBHOOK_VERIFY_TOKEN,
} from 'src/lib/database/secret';

/**
 * Verify Meta webhook signature (X-Hub-Signature-256)
 */
export function verifyMetaWebhookSignature(rawBody, signature, secret = META_APP_SECRET) {
  if (!secret) return true; // In development if secret is not set, allow
  if (!signature) return false;

  try {
    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const signatureBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (err) {
    console.error('Meta webhook signature verification error:', err);
    return false;
  }
}

/**
 * Parse incoming Meta webhook payload into normalized events
 * Supports Facebook Messenger, Instagram Direct, and WhatsApp Cloud API
 */
export function parseIncomingMetaWebhook(body) {
  try {
    const payload = typeof body === 'string' ? JSON.parse(body) : body;
    if (!payload || !Array.isArray(payload.entry)) return [];

    const events = [];

    for (const entry of payload.entry) {
      // 1. Facebook Messenger & Instagram Direct (messaging array)
      if (Array.isArray(entry.messaging)) {
        for (const msgItem of entry.messaging) {
          if (msgItem.message && !msgItem.message.is_echo) {
            const isInstagram = payload.object === 'instagram' || Boolean(entry.id && entry.id.length > 16);
            const platform = isInstagram ? 'instagram' : 'facebook';
            const senderId = msgItem.sender?.id;
            const text =
              msgItem.message.text ||
              (msgItem.message.attachments?.[0]?.type
                ? `[Attachment: ${msgItem.message.attachments[0].type}]`
                : '');

            if (senderId && text) {
              events.push({
                platform,
                externalConversationId: `${platform}_${senderId}`,
                recipientId: senderId,
                recipientName: `Customer (${senderId.slice(-4)})`,
                recipientPhone: null,
                messageText: text,
                externalMessageId: msgItem.message.mid || null,
                timestamp: msgItem.timestamp ? new Date(msgItem.timestamp) : new Date(),
              });
            }
          }
        }
      }

      // 2. WhatsApp Cloud API (changes array)
      if (Array.isArray(entry.changes)) {
        for (const change of entry.changes) {
          const val = change.value;
          if (val && Array.isArray(val.messages)) {
            const contactMap = {};
            if (Array.isArray(val.contacts)) {
              for (const c of val.contacts) {
                contactMap[c.wa_id] = c.profile?.name || c.wa_id;
              }
            }

            for (const waMsg of val.messages) {
              const fromNumber = waMsg.from;
              let text = '';
              if (waMsg.type === 'text') {
                text = waMsg.text?.body || '';
              } else if (waMsg.type === 'button') {
                text = waMsg.button?.text || '';
              } else if (waMsg.type === 'interactive') {
                text =
                  waMsg.interactive?.button_reply?.title ||
                  waMsg.interactive?.list_reply?.title ||
                  '';
              } else {
                text = `[${waMsg.type || 'Media'} message]`;
              }

              if (fromNumber && text) {
                const senderName = contactMap[fromNumber] || `WhatsApp User (+${fromNumber})`;
                events.push({
                  platform: 'whatsapp',
                  externalConversationId: `whatsapp_${fromNumber}`,
                  recipientId: fromNumber,
                  recipientName: senderName,
                  recipientPhone: fromNumber,
                  messageText: text,
                  externalMessageId: waMsg.id || null,
                  timestamp: waMsg.timestamp ? new Date(Number(waMsg.timestamp) * 1000) : new Date(),
                });
              }
            }
          }
        }
      }
    }

    return events;
  } catch (err) {
    console.error('Error parsing Meta webhook payload:', err);
    return [];
  }
}

/**
 * Send an outbound message through the Meta Graph API
 */
export async function sendPlatformMessage({ platform, recipientId, message, accessToken }) {
  let token = accessToken;
  let endpoint = '';
  let body = {};

  if (platform === 'facebook') {
    token = token || META_PAGE_ACCESS_TOKEN || META_ACCESS_TOKEN;
    if (!token) {
      throw new Error('Facebook Page access token is not configured. Set META_PAGE_ACCESS_TOKEN or META_ACCESS_TOKEN.');
    }
    endpoint = 'https://graph.facebook.com/v19.0/me/messages';
    body = {
      recipient: { id: recipientId },
      message: { text: message },
      messaging_type: 'RESPONSE',
    };
  } else if (platform === 'instagram') {
    token = token || META_PAGE_ACCESS_TOKEN || META_ACCESS_TOKEN;
    if (!token) {
      throw new Error('Instagram access token is not configured. Set META_PAGE_ACCESS_TOKEN or META_ACCESS_TOKEN.');
    }
    endpoint = 'https://graph.facebook.com/v19.0/me/messages';
    body = {
      recipient: { id: recipientId },
      message: { text: message },
    };
  } else if (platform === 'whatsapp') {
    token = token || META_ACCESS_TOKEN;
    const phoneId = META_PHONE_NUMBER_ID;
    if (!token) {
      throw new Error('WhatsApp access token is not configured. Set META_ACCESS_TOKEN.');
    }
    if (!phoneId) {
      throw new Error('WhatsApp Phone Number ID is not configured. Set META_PHONE_NUMBER_ID.');
    }
    endpoint = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
    body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientId,
      type: 'text',
      text: { preview_url: false, body: message },
    };
  } else {
    throw new Error(`Unsupported Meta platform: ${platform}`);
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg =
      data.error?.message ||
      data.error?.error_user_msg ||
      `Meta Graph API error (${res.status}): ${JSON.stringify(data.error || data)}`;
    throw new Error(errorMsg);
  }

  return data;
}

/**
 * Get Meta API configuration status for each platform
 */
export function getMetaConfigStatus() {
  const hasFbToken = Boolean(META_PAGE_ACCESS_TOKEN || META_ACCESS_TOKEN);
  const hasIgToken = Boolean(META_PAGE_ACCESS_TOKEN || META_ACCESS_TOKEN);
  const hasWaToken = Boolean(META_ACCESS_TOKEN && META_PHONE_NUMBER_ID);

  return {
    appId: META_APP_ID || null,
    facebook: {
      configured: hasFbToken,
      pageId: META_PAGE_ID || null,
    },
    instagram: {
      configured: hasIgToken,
      accountId: META_INSTAGRAM_ACCOUNT_ID || null,
    },
    whatsapp: {
      configured: hasWaToken,
      phoneNumberId: META_PHONE_NUMBER_ID || null,
      wabaId: META_WABA_ID || null,
    },
    webhook: {
      configured: Boolean(META_WEBHOOK_VERIFY_TOKEN),
      verifyToken: META_WEBHOOK_VERIFY_TOKEN || null,
    },
    configured: Boolean(hasFbToken || hasIgToken || hasWaToken),
  };
}
