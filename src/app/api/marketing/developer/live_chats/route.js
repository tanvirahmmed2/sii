import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';

// GET: Retrieve live chat sessions or a specific conversation for permitted developer
export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'live-chats');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId') || searchParams.get('id');

    // 1. Single Chat Session Details
    if (chatId) {
      const chatRes = await queryDb(
        `SELECT lc.*,
                d.name AS assigned_developer_name,
                d.email AS assigned_developer_email,
                d.avatar_url AS assigned_developer_avatar,
                d.designation AS assigned_developer_designation
         FROM live_chats lc
         LEFT JOIN developers d ON lc.assigned_developer_id = d.id
         WHERE lc.id = $1 LIMIT 1`,
        [Number(chatId)]
      );
      const chat = chatRes.rows[0] || null;

      if (!chat) {
        return NextResponse.json({ success: false, error: 'Chat session not found' }, { status: 404 });
      }

      // Mark unread visitor messages as read since permitted developer is viewing
      await queryDb(
        `UPDATE live_chat_messages 
         SET is_read = TRUE, read_at = CURRENT_TIMESTAMP 
         WHERE chat_id = $1 AND sender_type = 'VISITOR' AND is_read = FALSE`,
        [chat.id]
      ).catch(() => {});

      // Fetch messages for this chat
      const msgRes = await queryDb(
        `SELECT id, chat_id, sender_type, sender_id, sender_name, message, is_read, read_at, created_at 
         FROM live_chat_messages 
         WHERE chat_id = $1 
         ORDER BY created_at ASC`,
        [chat.id]
      );

      // Fetch list of active permitted developers for re-assignment
      const devRes = await queryDb(
        `SELECT d.id, d.name, d.email, d.designation, d.avatar_url, COALESCE(dr.name, 'Developer') as role_name 
         FROM developers d 
         LEFT JOIN developer_roles dr ON d.role_id = dr.id 
         WHERE d.is_active = TRUE 
         ORDER BY d.name ASC`
      ).catch(() => ({ rows: [] }));

      return NextResponse.json({
        success: true,
        chat,
        messages: msgRes.rows,
        developers: devRes.rows,
        currentUser: auth.user,
      });
    }

    // 2. List all live chat sessions with preview and unread counters
    const res = await queryDb(
      `SELECT lc.*,
              d.name AS assigned_developer_name,
              d.avatar_url AS assigned_developer_avatar,
              (SELECT message FROM live_chat_messages lcm WHERE lcm.chat_id = lc.id ORDER BY lcm.created_at DESC LIMIT 1) AS last_message,
              (SELECT sender_type FROM live_chat_messages lcm WHERE lcm.chat_id = lc.id ORDER BY lcm.created_at DESC LIMIT 1) AS last_sender_type,
              (SELECT created_at FROM live_chat_messages lcm WHERE lcm.chat_id = lc.id ORDER BY lcm.created_at DESC LIMIT 1) AS last_message_at,
              (SELECT COUNT(*)::int FROM live_chat_messages lcm WHERE lcm.chat_id = lc.id) AS message_count,
              (SELECT COUNT(*)::int FROM live_chat_messages lcm WHERE lcm.chat_id = lc.id AND lcm.sender_type = 'VISITOR' AND lcm.is_read = FALSE) AS unread_count
       FROM live_chats lc
       LEFT JOIN developers d ON lc.assigned_developer_id = d.id
       ORDER BY lc.updated_at DESC, lc.id DESC`
    );

    return NextResponse.json({
      success: true,
      table: 'live_chats',
      records: res.rows,
      currentUser: auth.user,
    });
  } catch (error) {
    console.error('Error in developer live_chats GET:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Permitted developer sends reply or creates chat record
export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'live-chats');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const body = await request.json();
    const data = body.data || body;
    const action = body.action || data.action;

    // Handle creating a new chat session from developer form
    if (action === 'create_record' && (!body.table || body.table === 'live_chats')) {
      const visitorName = (data.visitor_name || '').trim();
      const visitorEmail = (data.visitor_email || '').trim().toLowerCase() || null;
      const sessionId = data.session_id || 'live_dev_' + Math.random().toString(36).substring(2, 10);
      const status = (data.status || 'OPEN').toUpperCase();
      const ip = data.ip_address || '127.0.0.1';

      if (!visitorName) {
        return NextResponse.json({ success: false, error: 'Visitor name is required.' }, { status: 400 });
      }

      const newChatRes = await queryDb(
        `INSERT INTO live_chats (visitor_name, visitor_email, session_id, status, ip_address, assigned_developer_id, started_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
         RETURNING *`,
        [visitorName, visitorEmail, sessionId, status, ip, auth.user?.id || null]
      );

      return NextResponse.json({ success: true, record: newChatRes.rows[0] });
    }

    // Handle creating a message from developer form
    if (action === 'create_record' && body.table === 'live_chat_messages') {
      const chatId = Number(data.chat_id);
      const message = (data.message || '').trim();
      const senderType = (data.sender_type || 'ADMIN').toUpperCase();
      const senderName = data.sender_name || (senderType === 'ADMIN' ? auth.user?.name || 'Support' : 'Visitor');
      const senderId = senderType === 'ADMIN' ? auth.user?.id || null : null;

      if (!chatId || !message) {
        return NextResponse.json({ success: false, error: 'Chat ID and message are required.' }, { status: 400 });
      }

      const msgRes = await queryDb(
        `INSERT INTO live_chat_messages (chat_id, sender_type, sender_id, sender_name, message)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [chatId, senderType, senderId, senderName, message]
      );

      await queryDb(
        `UPDATE live_chats 
         SET updated_at = CURRENT_TIMESTAMP, 
             status = CASE WHEN status = 'CLOSED' THEN 'OPEN' ELSE status END,
             assigned_developer_id = COALESCE(assigned_developer_id, $2)
         WHERE id = $1`,
        [chatId, auth.user?.id || null]
      );

      return NextResponse.json({ success: true, record: msgRes.rows[0] });
    }

    // Standard Staff Reply from Live Chat Workspace
    const chatId = Number(data.chat_id || data.chatId);
    const message = (data.message || '').trim();

    if (!chatId || !message) {
      return NextResponse.json({ success: false, error: 'Chat ID and message are required.' }, { status: 400 });
    }

    // Check if chat is closed
    const chatCheck = await queryDb('SELECT id, status FROM live_chats WHERE id = $1 LIMIT 1', [chatId]);
    if (chatCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Chat session not found' }, { status: 404 });
    }
    if (chatCheck.rows[0].status === 'CLOSED') {
      return NextResponse.json(
        { success: false, error: 'This chat session is closed. Reopen the chat to send messages.' },
        { status: 400 }
      );
    }

    const staffId = auth.user?.id || null;
    const staffName = auth.user?.name || 'Support';

    const msgRes = await queryDb(
      `INSERT INTO live_chat_messages (chat_id, sender_type, sender_id, sender_name, message)
       VALUES ($1, 'ADMIN', $2, $3, $4)
       RETURNING *`,
      [chatId, staffId, staffName, message]
    );

    // Automatically set status to ACTIVE and assign to the replying developer if not yet assigned
    await queryDb(
      `UPDATE live_chats 
       SET updated_at = CURRENT_TIMESTAMP, 
           status = 'ACTIVE', 
           assigned_developer_id = COALESCE(assigned_developer_id, $2)
       WHERE id = $1`,
      [chatId, staffId]
    );

    return NextResponse.json({
      success: true,
      record: msgRes.rows[0],
      message: msgRes.rows[0],
    });
  } catch (error) {
    console.error('Error in developer live_chats POST:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// PUT: Permitted developer updates chat status or assigns developer
export async function PUT(request) {
  try {
    const auth = await hasModulePermission(request, 'live-chats');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const body = await request.json();
    const data = body.data || body;
    const id = Number(data.id || body.id);
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });

    const status = data.status ? String(data.status).toUpperCase() : null;
    const assignedDevId =
      data.assigned_developer_id !== undefined
        ? data.assigned_developer_id === null || data.assigned_developer_id === ''
          ? null
          : Number(data.assigned_developer_id)
        : undefined;

    let updateRes = null;

    if (status && assignedDevId !== undefined) {
      updateRes = await queryDb(
        `UPDATE live_chats 
         SET status = $1, 
             assigned_developer_id = $2, 
             ended_at = CASE WHEN $1 = 'CLOSED' THEN CURRENT_TIMESTAMP ELSE ended_at END,
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $3 
         RETURNING *`,
        [status, assignedDevId, id]
      );
    } else if (status) {
      updateRes = await queryDb(
        `UPDATE live_chats 
         SET status = $1, 
             ended_at = CASE WHEN $1 = 'CLOSED' THEN CURRENT_TIMESTAMP ELSE ended_at END,
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 
         RETURNING *`,
        [status, id]
      );
    } else if (assignedDevId !== undefined) {
      updateRes = await queryDb(
        `UPDATE live_chats 
         SET assigned_developer_id = $1, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 
         RETURNING *`,
        [assignedDevId, id]
      );
    }

    return NextResponse.json({
      success: true,
      record: updateRes?.rows[0] || null,
    });
  } catch (error) {
    console.error('Error in developer live_chats PUT:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// DELETE: Permitted developer deletes live chat session
export async function DELETE(request) {
  try {
    const auth = await hasModulePermission(request, 'live-chats');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });

    await queryDb('DELETE FROM live_chats WHERE id = $1', [Number(id)]);
    return NextResponse.json({ success: true, message: 'Chat session deleted successfully.' });
  } catch (error) {
    console.error('Error in developer live_chats DELETE:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
