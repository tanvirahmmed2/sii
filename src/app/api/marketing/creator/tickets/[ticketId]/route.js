import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { uploadImage } from 'src/lib/database/cloudinary';

// GET SINGLE TICKET & CONVERSATION THREAD (Creator)
export async function GET(request, context) {
  try {
    const params = await context?.params;
    const ticketId = params?.ticketId;

    if (!ticketId) {
      return NextResponse.json({ success: false, error: 'Ticket identifier is required.' }, { status: 400 });
    }

    const isNumeric = /^\d+$/.test(ticketId);
    const ticketRes = await queryDb(`
      SELECT 
        s.*,
        c.id AS creator_id,
        c.name AS creator_name,
        c.email AS creator_email,
        NULL::text AS creator_avatar,
        d.name AS assigned_developer_name,
        COALESCE(d.designation, 'developer') AS assigned_developer_role
      FROM supports s
      LEFT JOIN creators c ON s.creator_id = c.id
      LEFT JOIN developers d ON s.assigned_developer_id = d.id
      WHERE ${isNumeric ? '(s.id = $1::bigint OR s.ticket_number = $1::text)' : 's.ticket_number = $1'}
      LIMIT 1
    `, [ticketId]);

    if (ticketRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Support ticket not found.' }, { status: 404 });
    }

    const ticket = ticketRes.rows[0];

    // Fetch messages
    const messagesRes = await queryDb(`
      SELECT 
        m.id,
        m.support_id,
        m.sender_type,
        m.sender_id,
        m.message,
        m.created_at,
        d.name AS developer_name,
        COALESCE(d.designation, 'developer') AS developer_role
      FROM support_messages m
      LEFT JOIN developers d ON (m.sender_type = 'developer' AND m.sender_id = d.id)
      WHERE m.support_id = $1
      ORDER BY m.created_at ASC
    `, [ticket.id]);

    // Fetch images linked to messages of this ticket
    const imagesRes = await queryDb(`
      SELECT si.* 
      FROM support_images si 
      JOIN support_messages sm ON si.message_id = sm.id 
      WHERE sm.support_id = $1 
      ORDER BY si.created_at ASC
    `, [ticket.id]).catch(() => ({ rows: [] }));

    const imagesByMessage = {};
    (imagesRes.rows || []).forEach((img) => {
      if (!imagesByMessage[img.message_id]) imagesByMessage[img.message_id] = [];
      imagesByMessage[img.message_id].push(img);
    });

    const messagesWithImages = messagesRes.rows.map((m) => ({
      ...m,
      images: imagesByMessage[m.id] || [],
    }));

    return NextResponse.json({
      success: true,
      ticket,
      messages: messagesWithImages,
      images: imagesRes.rows,
    });
  } catch (error) {
    console.error('Error in creator ticket GET API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST MESSAGE TO TICKET THREAD (Creator)
export async function POST(request, context) {
  try {
    const params = await context?.params;
    const ticketId = params?.ticketId;

    if (!ticketId) {
      return NextResponse.json({ success: false, error: 'Ticket identifier is required.' }, { status: 400 });
    }

    const contentType = request.headers.get('content-type') || '';
    let creatorId, cleanMessage, imageFile, imageUrl, fileName, mimeType, fileSize;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      creatorId = formData.get('creatorId');
      cleanMessage = formData.get('message')?.trim() || '';
      imageFile = formData.get('image');
      imageUrl = formData.get('imageUrl') || null;
      if (imageFile && typeof imageFile === 'object') {
        fileName = imageFile.name;
        mimeType = imageFile.type;
        fileSize = imageFile.size;
      }
    } else {
      const body = await request.json().catch(() => ({}));
      creatorId = body.creatorId;
      cleanMessage = body.message?.trim() || '';
      imageUrl = body.imageUrl || body.image_url || null;
      imageFile = body.image || body.imageBase64 || null;
      fileName = body.fileName || null;
      mimeType = body.mimeType || null;
      fileSize = body.fileSize || null;
    }

    if (!cleanMessage && !imageFile && !imageUrl) {
      return NextResponse.json({ success: false, error: 'Message or image attachment is required.' }, { status: 400 });
    }

    const isNumeric = /^\d+$/.test(ticketId);
    const ticketRes = await queryDb(`
      SELECT * FROM supports 
      WHERE ${isNumeric ? '(id = $1::bigint OR ticket_number = $1::text)' : 'ticket_number = $1'}
      LIMIT 1
    `, [ticketId]);

    if (ticketRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Support ticket not found.' }, { status: 404 });
    }

    const ticket = ticketRes.rows[0];
    const senderId = creatorId ? Number(creatorId) : ticket.creator_id;

    let imageId = null;
    if (imageFile && typeof imageFile === 'object' && imageFile.size > 0) {
      const uploadRes = await uploadImage(imageFile, 'support_tickets');
      imageUrl = uploadRes.secure_url;
      imageId = uploadRes.publicId;
    } else if (typeof imageFile === 'string' && imageFile.startsWith('data:image')) {
      const uploadRes = await uploadImage(imageFile, 'support_tickets');
      imageUrl = uploadRes.secure_url;
      imageId = uploadRes.publicId;
    }

    // Insert message into thread (sender_type must be lowercase 'creator' to satisfy DB constraint)
    const msgRes = await queryDb(`
      INSERT INTO support_messages (support_id, sender_type, sender_id, message)
      VALUES ($1, 'creator', $2, $3)
      RETURNING *
    `, [ticket.id, senderId, cleanMessage || '']);

    const newMsg = msgRes.rows[0];

    // Optional image attachment saved to support_images
    let attachedImages = [];
    if (imageUrl) {
      const imgRes = await queryDb(`
        INSERT INTO support_images (message_id, image_url, image_id, file_name, file_size, mime_type)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        newMsg.id,
        imageUrl,
        imageId || null,
        fileName || null,
        fileSize || null,
        mimeType || null,
      ]).catch((err) => {
        console.error('Error inserting support image:', err);
        return { rows: [] };
      });
      attachedImages = imgRes.rows || [];
    }

    // Reopen ticket if closed/resolved and update timestamps
    const updateRes = await queryDb(`
      UPDATE supports
      SET updated_at = CURRENT_TIMESTAMP,
          last_message_at = CURRENT_TIMESTAMP,
          status = CASE WHEN status IN ('resolved', 'closed') THEN 'open' ELSE status END
      WHERE id = $1
      RETURNING *
    `, [ticket.id]);

    return NextResponse.json({
      success: true,
      message: {
        ...newMsg,
        images: attachedImages,
      },
      ticket: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Error in creator ticket POST API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
