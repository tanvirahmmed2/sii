import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { hasModulePermission } from '@/lib/middleware/developer';

export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'live-chats');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId') || searchParams.get('id');

    if (chatId) {
      const chatRes = await queryDb('SELECT * FROM live_chats WHERE id = $1 LIMIT 1', [Number(chatId)]);
      const chat = chatRes.rows[0] || null;

      if (!chat) {
        return NextResponse.json({ success: false, error: 'Chat not found' }, { status: 404 });
      }

      const msgRes = await queryDb(
        'SELECT id, chat_id, sender_type, sender_name, message, created_at FROM live_chat_messages WHERE chat_id = $1 ORDER BY created_at ASC',
        [chat.id]
      );

      return NextResponse.json({
        success: true,
        chat,
        messages: msgRes.rows,
      });
    }

    // List all live chat sessions with preview of last message
    const res = await queryDb(
      `SELECT lc.*,
              (SELECT message FROM live_chat_messages lcm WHERE lcm.chat_id = lc.id ORDER BY lcm.created_at DESC LIMIT 1) AS last_message,
              (SELECT sender_type FROM live_chat_messages lcm WHERE lcm.chat_id = lc.id ORDER BY lcm.created_at DESC LIMIT 1) AS last_sender_type,
              (SELECT created_at FROM live_chat_messages lcm WHERE lcm.chat_id = lc.id ORDER BY lcm.created_at DESC LIMIT 1) AS last_message_at,
              (SELECT COUNT(*)::int FROM live_chat_messages lcm WHERE lcm.chat_id = lc.id) AS message_count
       FROM live_chats lc
       ORDER BY lc.updated_at DESC, lc.id DESC`
    );

    return NextResponse.json({ success: true, table: 'live_chats', records: res.rows });
  } catch (error) {
    console.error('Error in developer live_chats GET:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Staff sends reply to visitor
export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'live-chats');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const body = await request.json();
    const data = body.data || body;
    const chatId = Number(data.chat_id || data.chatId);
    const message = (data.message || '').trim();

    if (!chatId || !message) {
      return NextResponse.json({ success: false, error: 'Chat ID and message are required.' }, { status: 400 });
    }

    const staffName = 'Support';

    const msgRes = await queryDb(
      `INSERT INTO live_chat_messages (chat_id, sender_type, sender_name, message)
       VALUES ($1, 'ADMIN', $2, $3)
       RETURNING *`,
      [chatId, staffName, message]
    );

    await queryDb(
      "UPDATE live_chats SET updated_at = CURRENT_TIMESTAMP, status = 'ACTIVE' WHERE id = $1",
      [chatId]
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

// PUT: Update chat status or details
export async function PUT(request) {
  try {
    const auth = await hasModulePermission(request, 'live-chats');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const body = await request.json();
    const id = body.id || body.data?.id;
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });

    const status = (body.status || body.data?.status || '').toUpperCase();
    if (status) {
      const res = await queryDb(
        'UPDATE live_chats SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [status, Number(id)]
      );
      return NextResponse.json({ success: true, record: res.rows[0] });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// DELETE: Remove live chat session
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
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
