import { NextResponse } from 'next/server';
import { authenticateStaff } from '@/lib/middleware/developer';
import { queryDb } from '@/lib/db/pg';

// ============================================================================
// GET: List all chats for current developer + all available developers
// ============================================================================
export async function GET(request) {
  try {
    const auth = await authenticateStaff(request);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const currentDevId = auth.staff.id;

    // 1. Fetch chats the user belongs to
    const chatsRes = await queryDb(`
      SELECT 
        c.id,
        c.title,
        c.type,
        c.created_at,
        c.updated_at,
        cp.last_read_at,
        -- Last message details
        lm.id AS last_message_id,
        lm.message AS last_message,
        lm.created_at AS last_message_at,
        lms.name AS last_message_sender_name,
        -- Participant aggregate
        json_agg(
          json_build_object(
            'id', d.id,
            'name', d.name,
            'email', d.email,
            'role', COALESCE(r.slug, 'developer'),
            'role_name', COALESCE(r.name, 'Developer')
          )
        ) AS participants
      FROM internal_chats c
      JOIN chat_participants cp ON c.id = cp.chat_id AND cp.developer_id = $1
      JOIN chat_participants all_cp ON c.id = all_cp.chat_id
      JOIN developers d ON all_cp.developer_id = d.id
      LEFT JOIN roles r ON d.role_id = r.id
      LEFT JOIN LATERAL (
        SELECT m.id, m.message, m.created_at, m.sender_developer_id
        FROM chat_messages m
        WHERE m.chat_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) lm ON TRUE
      LEFT JOIN developers lms ON lm.sender_developer_id = lms.id
      GROUP BY c.id, c.title, c.type, c.created_at, c.updated_at, cp.last_read_at,
               lm.id, lm.message, lm.created_at, lms.name
      ORDER BY COALESCE(lm.created_at, c.updated_at) DESC
    `, [currentDevId]);

    // 2. Fetch all other active developers to initiate chats
    const devsRes = await queryDb(`
      SELECT d.id, d.name, d.email, COALESCE(r.slug, 'developer') AS role, COALESCE(r.name, 'Developer') AS role_name
      FROM developers d
      LEFT JOIN roles r ON d.role_id = r.id
      WHERE d.is_active = TRUE AND d.id != $1
      ORDER BY d.name ASC
    `, [currentDevId]);

    return NextResponse.json({
      success: true,
      currentDeveloperId: currentDevId,
      chats: chatsRes.rows,
      availableDevelopers: devsRes.rows,
    });
  } catch (error) {
    console.error('Chats GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// POST: Create a new Direct (1-to-1) or Group Chat
// ============================================================================
export async function POST(request) {
  try {
    const auth = await authenticateStaff(request);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const currentDevId = auth.staff.id;
    const body = await request.json();
    const { type = 'DIRECT', title, recipient_developer_id, participant_developer_ids = [] } = body;

    // DIRECT CHAT
    if (type === 'DIRECT') {
      if (!recipient_developer_id) {
        return NextResponse.json({ success: false, error: 'Recipient developer is required.' }, { status: 400 });
      }

      if (Number(recipient_developer_id) === Number(currentDevId)) {
        return NextResponse.json({ success: false, error: 'Cannot create a direct chat with yourself.' }, { status: 400 });
      }

      // Check if a direct chat already exists between these 2 developers
      const existingRes = await queryDb(`
        SELECT c.id 
        FROM internal_chats c
        JOIN chat_participants p1 ON c.id = p1.chat_id AND p1.developer_id = $1
        JOIN chat_participants p2 ON c.id = p2.chat_id AND p2.developer_id = $2
        WHERE c.type = 'DIRECT'
        LIMIT 1
      `, [currentDevId, recipient_developer_id]);

      if (existingRes.rows.length > 0) {
        return NextResponse.json({
          success: true,
          chatId: existingRes.rows[0].id,
          isExisting: true,
          message: 'Direct conversation opened.',
        });
      }

      // Create new direct chat
      const chatRes = await queryDb(
        `INSERT INTO internal_chats (type, created_by_developer_id) VALUES ('DIRECT', $1) RETURNING id`,
        [currentDevId]
      );
      const newChatId = chatRes.rows[0].id;

      await queryDb(
        `INSERT INTO chat_participants (chat_id, developer_id) VALUES ($1, $2), ($1, $3)`,
        [newChatId, currentDevId, recipient_developer_id]
      );

      return NextResponse.json({
        success: true,
        chatId: newChatId,
        isExisting: false,
        message: 'Direct conversation created.',
      });
    }

    // GROUP CHAT
    if (type === 'GROUP') {
      if (!title || !title.trim()) {
        return NextResponse.json({ success: false, error: 'Group title is required.' }, { status: 400 });
      }

      const participants = Array.from(new Set([currentDevId, ...participant_developer_ids.map(Number)])).filter(Boolean);

      const chatRes = await queryDb(
        `INSERT INTO internal_chats (title, type, created_by_developer_id) VALUES ($1, 'GROUP', $2) RETURNING id`,
        [title.trim(), currentDevId]
      );
      const newChatId = chatRes.rows[0].id;

      for (const pId of participants) {
        await queryDb(
          `INSERT INTO chat_participants (chat_id, developer_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [newChatId, pId]
        );
      }

      // System greeting message
      await queryDb(
        `INSERT INTO chat_messages (chat_id, sender_developer_id, message, is_system)
         VALUES ($1, $2, $3, TRUE)`,
        [newChatId, currentDevId, `${auth.staff.name} created the group "${title.trim()}".`]
      );

      return NextResponse.json({
        success: true,
        chatId: newChatId,
        message: 'Group conversation created.',
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid chat type.' }, { status: 400 });
  } catch (error) {
    console.error('Chat POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
