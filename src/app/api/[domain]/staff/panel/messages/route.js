import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { getStaffSession } from 'src/lib/middleware/staff';
import { isAdmin } from 'src/lib/middleware/developer';
import { sendWebsiteMetaMessage, getWebsiteMetaConfig } from 'src/lib/meta/graph.js';

async function verifyStaffAccess(request, context) {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }
  const devAdmin = await isAdmin();
  const staffSession = await getStaffSession(request);

  if (!staffSession && !devAdmin) {
    return { error: 'Unauthorized: Staff access required.', status: 401 };
  }

  const staffWebsiteId = staffSession?.website_id || staffSession?.websiteId || staffSession?.staff?.websiteId || staffSession?.staff?.website_id;
  if (!devAdmin && staffSession && staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
  }

  return { website, staffSession, devAdmin };
}

// GET: Fetch conversations list or messages for a specific conversation
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const platform = (searchParams.get('platform') || 'facebook').toLowerCase();
    const conversationId = searchParams.get('conversationId');

    const metaConfig = await getWebsiteMetaConfig(auth.website.id);

    // Case 1: Fetch messages for a specific conversation
    if (conversationId) {
      const convId = parseInt(conversationId, 10);
      if (isNaN(convId) || convId <= 0) {
        return NextResponse.json({ success: false, error: 'Valid integer conversationId is required.' }, { status: 400 });
      }

      // Mark unread count as 0 for this conversation
      await queryDb(
        `UPDATE website_meta_conversations SET unread_count = 0 WHERE id = $1 AND website_id = $2`,
        [convId, auth.website.id]
      );

      const convRes = await queryDb(
        `SELECT * FROM website_meta_conversations WHERE id = $1 AND website_id = $2 LIMIT 1`,
        [convId, auth.website.id]
      );
      if (convRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Conversation thread not found.' }, { status: 404 });
      }

      const msgRes = await queryDb(
        `SELECT id, conversation_id, platform, sender_type, sender_id, sender_name,
                message_text, media_url, media_type, external_message_id, delivery_status,
                error_message, created_at
         FROM website_meta_messages
         WHERE conversation_id = $1 AND website_id = $2
         ORDER BY created_at ASC
         LIMIT 300`,
        [convId, auth.website.id]
      );

      return NextResponse.json({
        success: true,
        conversation: convRes.rows[0],
        messages: msgRes.rows,
        metaConfig
      });
    }

    // Case 2: Fetch list of conversations for this platform
    const convsRes = await queryDb(
      `SELECT id, platform, external_conversation_id, recipient_id, recipient_name,
              recipient_phone, recipient_avatar, last_message, last_message_at,
              status, unread_count, created_at, updated_at
       FROM website_meta_conversations
       WHERE website_id = $1 AND platform = $2
       ORDER BY last_message_at DESC NULLS LAST, created_at DESC
       LIMIT 100`,
      [auth.website.id, platform]
    );

    const statsRes = await queryDb(
      `SELECT
         COUNT(*) as total_threads,
         COUNT(*) FILTER (WHERE status = 'OPEN') as open_threads,
         COALESCE(SUM(unread_count), 0) as total_unread
       FROM website_meta_conversations
       WHERE website_id = $1 AND platform = $2`,
      [auth.website.id, platform]
    );

    return NextResponse.json({
      success: true,
      platform,
      conversations: convsRes.rows,
      stats: {
        totalThreads: parseInt(statsRes.rows[0]?.total_threads || 0, 10),
        openThreads: parseInt(statsRes.rows[0]?.open_threads || 0, 10),
        totalUnread: parseInt(statsRes.rows[0]?.total_unread || 0, 10),
      },
      metaConfig
    });
  } catch (error) {
    console.error('Error in GET /messages:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Send outbound response to a conversation
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { conversationId, messageText, platform } = body;

    const convId = parseInt(conversationId, 10);
    if (isNaN(convId) || convId <= 0) {
      return NextResponse.json({ success: false, error: 'Valid integer conversationId is required.' }, { status: 400 });
    }

    const cleanText = String(messageText || '').replace(/[\0]/g, '').trim();
    if (!cleanText) {
      return NextResponse.json({ success: false, error: 'Message text cannot be empty.' }, { status: 400 });
    }

    // Fetch conversation
    const convRes = await queryDb(
      `SELECT id, platform, recipient_id, recipient_name, recipient_phone
       FROM website_meta_conversations
       WHERE id = $1 AND website_id = $2
       LIMIT 1`,
      [convId, auth.website.id]
    );
    if (convRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Conversation thread not found.' }, { status: 404 });
    }

    const conv = convRes.rows[0];
    const staffName = auth.staffSession?.staff?.name || 'Staff Agent';
    const staffId = String(auth.staffSession?.staff?.id || '0');

    let externalMessageId = null;
    let deliveryStatus = 'SENT';
    let errorMessage = null;

    // Dispatch via Meta Graph API using website-specific credentials
    try {
      const recipient = conv.platform === 'whatsapp' ? (conv.recipient_phone || conv.recipient_id) : conv.recipient_id;
      const metaResult = await sendWebsiteMetaMessage({
        websiteId: auth.website.id,
        platform: conv.platform,
        recipientId: recipient,
        message: cleanText
      });
      externalMessageId = metaResult.messageId || metaResult.messages?.[0]?.id || null;
    } catch (metaErr) {
      console.warn(`Meta Graph API dispatch notice (${conv.platform}):`, metaErr.message);
      deliveryStatus = 'FAILED';
      errorMessage = metaErr.message;
    }

    // Persist to website_meta_messages
    const insertRes = await queryDb(
      `INSERT INTO website_meta_messages (
         website_id, conversation_id, platform, sender_type, sender_id, sender_name,
         message_text, external_message_id, delivery_status, error_message
       )
       VALUES ($1, $2, $3, 'STAFF', $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        auth.website.id,
        conv.id,
        conv.platform,
        staffId,
        staffName,
        cleanText,
        externalMessageId,
        deliveryStatus,
        errorMessage
      ]
    );

    // Update conversation record
    await queryDb(
      `UPDATE website_meta_conversations
       SET last_message = $1, last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND website_id = $3`,
      [cleanText, conv.id, auth.website.id]
    );

    return NextResponse.json({
      success: true,
      message: insertRes.rows[0],
      deliveryStatus,
      dispatchError: errorMessage
    });
  } catch (error) {
    console.error('Error in POST /messages:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update conversation status (OPEN, RESOLVED, SPAM)
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { conversationId, status } = body;

    const convId = parseInt(conversationId, 10);
    if (isNaN(convId) || convId <= 0) {
      return NextResponse.json({ success: false, error: 'Valid conversationId is required.' }, { status: 400 });
    }

    const cleanStatus = String(status || '').toUpperCase();
    if (!['OPEN', 'RESOLVED', 'SPAM'].includes(cleanStatus)) {
      return NextResponse.json({ success: false, error: 'Status must be OPEN, RESOLVED, or SPAM.' }, { status: 400 });
    }

    const updateRes = await queryDb(
      `UPDATE website_meta_conversations
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND website_id = $3
       RETURNING *`,
      [cleanStatus, convId, auth.website.id]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Conversation not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      conversation: updateRes.rows[0],
      message: `Conversation marked as ${cleanStatus}.`
    });
  } catch (error) {
    console.error('Error in PUT /messages:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete conversation
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    const convId = parseInt(conversationId, 10);
    if (isNaN(convId) || convId <= 0) {
      return NextResponse.json({ success: false, error: 'Valid conversationId is required.' }, { status: 400 });
    }

    await queryDb(
      `DELETE FROM website_meta_conversations WHERE id = $1 AND website_id = $2`,
      [convId, auth.website.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully.'
    });
  } catch (error) {
    console.error('Error in DELETE /messages:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
