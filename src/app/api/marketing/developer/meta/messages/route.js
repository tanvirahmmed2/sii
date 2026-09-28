import { NextResponse } from 'next/server';
import { pool } from '@/lib/db/pg';
import { hasModulePermission } from '@/lib/middleware/developer';
import { sendPlatformMessage } from '@/lib/meta/graph';

const META_PERMISSIONS = ['facebook-messages', 'instagram-messages', 'whatsapp-messages', 'chats'];

/**
 * GET /api/developer/meta/messages?conversationId=
 */
export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, META_PERMISSIONS);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    const convId = parseInt(conversationId, 10);
    if (isNaN(convId) || convId <= 0) {
      return NextResponse.json({ success: false, error: 'Valid integer conversationId is required' }, { status: 400 });
    }

    // Reset unread count when viewing thread
    await pool.query('UPDATE meta_conversations SET unread_count = 0 WHERE id = $1', [convId]);

    const { rows } = await pool.query(
      `SELECT id, conversation_id, platform, sender_type, sender_id, sender_name,
              message_text, media_url, media_type, external_message_id, delivery_status,
              error_message, created_at
       FROM meta_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC
       LIMIT 500`,
      [convId]
    );

    return NextResponse.json({ success: true, records: rows });
  } catch (error) {
    console.error('Failed to fetch Meta messages:', error.message);
    return NextResponse.json({ success: false, error: 'Failed to retrieve messages' }, { status: 500 });
  }
}

/**
 * POST /api/developer/meta/messages
 */
export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, META_PERMISSIONS);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const { conversationId, messageText } = body;

    const convId = parseInt(conversationId, 10);
    if (isNaN(convId) || convId <= 0) {
      return NextResponse.json({ success: false, error: 'Valid integer conversationId is required' }, { status: 400 });
    }

    if (!messageText || typeof messageText !== 'string') {
      return NextResponse.json({ success: false, error: 'messageText is required' }, { status: 400 });
    }

    const cleanText = messageText.replace(/[\0]/g, '').trim();
    if (!cleanText) {
      return NextResponse.json({ success: false, error: 'messageText cannot be empty' }, { status: 400 });
    }

    if (cleanText.length > 4096) {
      return NextResponse.json({ success: false, error: 'messageText cannot exceed 4096 characters' }, { status: 400 });
    }

    // 1. Fetch conversation details
    const convRes = await pool.query(
      `SELECT id, platform, recipient_id, recipient_name, recipient_phone
       FROM meta_conversations
       WHERE id = $1`,
      [convId]
    );

    if (convRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 });
    }

    const conv = convRes.rows[0];
    const staffName = auth.staff.name ? String(auth.staff.name).slice(0, 255) : 'Staff Agent';
    const staffId = String(auth.staff.id);

    let externalMessageId = null;
    let deliveryStatus = 'SENT';
    let errorMessage = null;
    let apiWarning = null;

    // 2. Dispatch via Meta Graph API
    try {
      const metaResult = await sendPlatformMessage(conv.platform, {
        recipientId: conv.recipient_id,
        toPhoneNumber: conv.recipient_phone,
        messageText: cleanText,
      });
      externalMessageId = metaResult.messageId || null;
    } catch (metaErr) {
      console.warn(`Meta Graph API dispatch warning for ${conv.platform}:`, metaErr.message);
      deliveryStatus = 'FAILED';
      errorMessage = metaErr.message.slice(0, 500);
      apiWarning = `Message saved locally, but Meta Graph API dispatch failed: ${metaErr.message}`;
    }

    // 3. Persist to database
    const insertRes = await pool.query(
      `INSERT INTO meta_messages (
         conversation_id, platform, sender_type, sender_id, sender_name,
         message_text, external_message_id, delivery_status, error_message
       )
       VALUES ($1, $2, 'STAFF', $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        conv.id,
        conv.platform,
        staffId,
        staffName,
        cleanText,
        externalMessageId,
        deliveryStatus,
        errorMessage,
      ]
    );

    const savedMessage = insertRes.rows[0];

    // 4. Update conversation's last_message and timestamp
    await pool.query(
      `UPDATE meta_conversations
       SET last_message = $1, last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [cleanText, conv.id]
    );

    return NextResponse.json({
      success: true,
      record: savedMessage,
      warning: apiWarning,
    });
  } catch (error) {
    console.error('Failed to send Meta message:', error.message);
    return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 });
  }
}
