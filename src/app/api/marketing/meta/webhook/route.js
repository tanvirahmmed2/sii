import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db/pg';
import { META_WEBHOOK_VERIFY_TOKEN, META_APP_SECRET } from '@/lib/db/secret';
import { parseIncomingMetaWebhook, verifyMetaWebhookSignature } from '@/lib/meta/graph';

// Max allowed payload size (1MB) to defend against payload exhaustion attacks
const MAX_PAYLOAD_BYTES = 1024 * 1024;

/**
 * GET /api/meta/webhook
 * Timing-safe Meta Webhook Handshake Verification
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode !== 'subscribe' || !token) {
      return new Response('Bad Request: Invalid hub parameters', { status: 400 });
    }

    // Guard against unconfigured or empty server token
    if (
      !META_WEBHOOK_VERIFY_TOKEN ||
      typeof META_WEBHOOK_VERIFY_TOKEN !== 'string' ||
      !META_WEBHOOK_VERIFY_TOKEN.trim()
    ) {
      console.warn('Meta Webhook Handshake: META_WEBHOOK_VERIFY_TOKEN is not configured on server.');
      return new Response('Forbidden: Server webhook token not configured', { status: 403 });
    }

    // Timing-safe constant-time comparison
    const tokenHash = crypto.createHash('sha256').update(String(token).trim()).digest();
    const expectedHash = crypto.createHash('sha256').update(META_WEBHOOK_VERIFY_TOKEN.trim()).digest();
    const isTokenMatch = crypto.timingSafeEqual(tokenHash, expectedHash);

    if (!isTokenMatch) {
      console.warn('Meta Webhook Handshake: Token mismatch attempt rejected.');
      return new Response('Forbidden: Verification token mismatch', { status: 403 });
    }

    // Validate challenge to prevent response splitting or injection
    if (!challenge || !/^[a-zA-Z0-9_\-\.\=\+]+$/.test(challenge) || challenge.length > 255) {
      return new Response('Bad Request: Invalid challenge parameter', { status: 400 });
    }

    return new Response(challenge, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error('Meta webhook GET verification error:', err.message);
    return new Response('Internal server error', { status: 500 });
  }
}

/**
 * POST /api/meta/webhook
 * Ingest incoming events from Facebook Messenger, Instagram Direct, and WhatsApp
 */
export async function POST(request) {
  try {
    const rawBody = await request.text();

    // Payload size defense
    if (rawBody.length > MAX_PAYLOAD_BYTES) {
      return new Response('Payload Too Large', { status: 413 });
    }

    const signature = request.headers.get('x-hub-signature-256');

    // If META_APP_SECRET is configured, enforce strict signature verification
    if (META_APP_SECRET) {
      if (!signature) {
        console.warn('Meta webhook POST rejected: Missing X-Hub-Signature-256 header.');
        return new Response('Forbidden: Signature required', { status: 403 });
      }

      const isValid = verifyMetaWebhookSignature(signature, rawBody, META_APP_SECRET);
      if (!isValid) {
        console.warn('Meta webhook POST rejected: Invalid signature.');
        return new Response('Forbidden: Invalid signature', { status: 403 });
      }
    }

    let body = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response('Bad Request: Invalid JSON body', { status: 400 });
    }

    const events = parseIncomingMetaWebhook(body);
    if (events.length === 0) {
      return NextResponse.json({ success: true, message: 'No actionable message events found' });
    }

    for (const evt of events) {
      try {
        // Sanitize parameters
        const safePlatform = ['facebook', 'instagram', 'whatsapp'].includes(evt.platform) ? evt.platform : null;
        if (!safePlatform) continue;

        const safeConvId = String(evt.externalConversationId).slice(0, 255);
        const safeRecipientId = String(evt.recipientId).slice(0, 255);
        const safeName = String(evt.recipientName || 'Customer').slice(0, 255);
        const safePhone = evt.recipientPhone ? String(evt.recipientPhone).replace(/\D/g, '').slice(0, 50) : null;
        const safeText = String(evt.messageText || '').replace(/\0/g, '').slice(0, 4000);
        const safeMsgId = evt.externalMessageId ? String(evt.externalMessageId).slice(0, 255) : null;

        // 1. Upsert conversation
        const convUpsert = await pool.query(
          `INSERT INTO meta_conversations (
             platform, external_conversation_id, recipient_id, recipient_name,
             recipient_phone, last_message, last_message_at, status, unread_count, updated_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'OPEN', 1, CURRENT_TIMESTAMP)
           ON CONFLICT (platform, external_conversation_id)
           DO UPDATE SET
             last_message = EXCLUDED.last_message,
             last_message_at = EXCLUDED.last_message_at,
             unread_count = meta_conversations.unread_count + 1,
             updated_at = CURRENT_TIMESTAMP,
             recipient_name = COALESCE(NULLIF(EXCLUDED.recipient_name, 'Customer'), meta_conversations.recipient_name)
           RETURNING id`,
          [
            safePlatform,
            safeConvId,
            safeRecipientId,
            safeName,
            safePhone,
            safeText,
            evt.timestamp || new Date(),
          ]
        );

        const convId = convUpsert.rows[0]?.id;

        // 2. Insert incoming message
        if (convId) {
          await pool.query(
            `INSERT INTO meta_messages (
               conversation_id, platform, sender_type, sender_id, sender_name,
               message_text, external_message_id, delivery_status, created_at
             )
             VALUES ($1, $2, 'CUSTOMER', $3, $4, $5, $6, 'DELIVERED', $7)`,
            [
              convId,
              safePlatform,
              safeRecipientId,
              safeName,
              safeText,
              safeMsgId,
              evt.timestamp || new Date(),
            ]
          );
        }
      } catch (evtErr) {
        console.error('Error processing single Meta webhook event:', evtErr.message);
      }
    }

    return NextResponse.json({ success: true, processed: events.length });
  } catch (error) {
    console.error('Meta webhook processing error:', error.message);
    return new Response('Internal server error', { status: 500 });
  }
}
