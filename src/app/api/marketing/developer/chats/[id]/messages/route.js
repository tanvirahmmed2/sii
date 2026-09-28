import { NextResponse } from 'next/server';
import { authenticateStaff } from '@/lib/middleware/developer';
import { queryDb } from '@/lib/db/pg';

// ============================================================================
// GET: Fetch messages and image attachments for a chat
// ============================================================================
export async function GET(request, { params }) {
  try {
    const auth = await authenticateStaff(request);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const currentDevId = auth.staff.id;

    // Verify user is a participant
    const partCheck = await queryDb(
      'SELECT id FROM chat_participants WHERE chat_id = $1 AND developer_id = $2',
      [id, currentDevId]
    );

    if (partCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Forbidden: You are not a participant in this conversation.' }, { status: 403 });
    }

    // Mark as read
    await queryDb(
      'UPDATE chat_participants SET last_read_at = CURRENT_TIMESTAMP WHERE chat_id = $1 AND developer_id = $2',
      [id, currentDevId]
    );

    // Fetch messages with sender info and attached images
    const messagesRes = await queryDb(`
      SELECT 
        m.id,
        m.chat_id,
        m.message,
        m.is_system,
        m.created_at,
        d.id AS sender_id,
        d.name AS sender_name,
        d.email AS sender_email,
        COALESCE(r.slug, 'developer') AS sender_role,
        COALESCE(r.name, 'Developer') AS sender_role_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ci.id,
              'image_url', ci.image_url,
              'file_name', ci.file_name,
              'file_size', ci.file_size
            )
          ) FILTER (WHERE ci.id IS NOT NULL),
          '[]'::jsonb
        ) AS images
      FROM chat_messages m
      JOIN developers d ON m.sender_developer_id = d.id
      LEFT JOIN roles r ON d.role_id = r.id
      LEFT JOIN chat_images ci ON m.id = ci.message_id
      WHERE m.chat_id = $1
      GROUP BY m.id, m.chat_id, m.message, m.is_system, m.created_at, d.id, d.name, d.email, r.slug, r.name
      ORDER BY m.created_at ASC
      LIMIT 200
    `, [id]);

    return NextResponse.json({
      success: true,
      messages: messagesRes.rows,
    });
  } catch (error) {
    console.error('Chat messages GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// POST: Send a message with optional image attachments
// ============================================================================
export async function POST(request, { params }) {
  try {
    const auth = await authenticateStaff(request);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const currentDevId = auth.staff.id;
    const body = await request.json();
    const { message, images = [] } = body;

    if ((!message || !message.trim()) && (!images || images.length === 0)) {
      return NextResponse.json({ success: false, error: 'Message text or image attachment required.' }, { status: 400 });
    }

    // Verify participation
    const partCheck = await queryDb(
      'SELECT id FROM chat_participants WHERE chat_id = $1 AND developer_id = $2',
      [id, currentDevId]
    );

    if (partCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Forbidden: You cannot post in this chat.' }, { status: 403 });
    }

    // Insert message
    const msgRes = await queryDb(
      `INSERT INTO chat_messages (chat_id, sender_developer_id, message, is_system)
       VALUES ($1, $2, $3, FALSE)
       RETURNING *`,
      [id, currentDevId, (message || '').trim()]
    );
    const newMsg = msgRes.rows[0];

    // Insert attached images if any
    const savedImages = [];
    for (const img of images) {
      if (!img.url && !img.image_url) continue;
      const url = img.url || img.image_url;
      const imgRes = await queryDb(
        `INSERT INTO chat_images (message_id, image_url, file_name, file_size)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [newMsg.id, url, img.fileName || img.file_name || 'attachment.png', img.fileSize || img.file_size || null]
      );
      savedImages.push(imgRes.rows[0]);
    }

    // Touch chat updated_at and update sender's last_read_at
    await queryDb('UPDATE internal_chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    await queryDb('UPDATE chat_participants SET last_read_at = CURRENT_TIMESTAMP WHERE chat_id = $1 AND developer_id = $2', [id, currentDevId]);

    return NextResponse.json({
      success: true,
      message: {
        ...newMsg,
        sender_id: auth.staff.id,
        sender_name: auth.staff.name,
        sender_email: auth.staff.email,
        sender_role: auth.staff.role,
        images: savedImages,
      },
    });
  } catch (error) {
    console.error('Chat message POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
