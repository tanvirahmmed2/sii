import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';

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
        COALESCE(dr.slug, 'developer') AS assigned_developer_role
      FROM support s
      LEFT JOIN creators c ON s.creator_id = c.id
      LEFT JOIN developers d ON s.assigned_developer_id = d.id
      LEFT JOIN roles dr ON d.role_id = dr.id
      WHERE ${isNumeric ? 's.id = $1 OR s.ticket_number = $1' : 's.ticket_number = $1'}
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
        m.sender_name,
        m.message,
        m.created_at,
        d.name AS developer_name,
        COALESCE(dr.slug, 'developer') AS developer_role
      FROM support_messages m
      LEFT JOIN developers d ON (m.sender_type IN ('ADMIN', 'DEVELOPER') AND m.sender_id = d.id)
      LEFT JOIN roles dr ON d.role_id = dr.id
      WHERE m.support_id = $1
      ORDER BY m.created_at ASC
    `, [ticket.id]);

    // Fetch images
    const imagesRes = await queryDb(`
      SELECT * FROM support_images WHERE support_id = $1 ORDER BY created_at ASC
    `, [ticket.id]).catch(() => ({ rows: [] }));

    return NextResponse.json({
      success: true,
      ticket,
      messages: messagesRes.rows,
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
    const body = await request.json();

    const { creatorId, message, imageUrl } = body;
    const cleanMessage = message?.trim();

    if (!ticketId) {
      return NextResponse.json({ success: false, error: 'Ticket identifier is required.' }, { status: 400 });
    }

    if (!cleanMessage) {
      return NextResponse.json({ success: false, error: 'Message cannot be empty.' }, { status: 400 });
    }

    const isNumeric = /^\d+$/.test(ticketId);
    const ticketRes = await queryDb(`
      SELECT * FROM support 
      WHERE ${isNumeric ? 'id = $1 OR ticket_number = $1' : 'ticket_number = $1'}
      LIMIT 1
    `, [ticketId]);

    if (ticketRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Support ticket not found.' }, { status: 404 });
    }

    const ticket = ticketRes.rows[0];

    // Identify creator
    let senderName = ticket.requester_name || 'Creator';
    let senderId = creatorId ? Number(creatorId) : ticket.creator_id;

    if (senderId) {
      const cRes = await queryDb('SELECT name FROM creators WHERE id = $1', [senderId]);
      if (cRes.rows.length > 0 && cRes.rows[0].name) {
        senderName = cRes.rows[0].name;
      }
    }

    // Insert message into thread
    const msgRes = await queryDb(`
      INSERT INTO support_messages (support_id, sender_type, sender_id, sender_name, message)
      VALUES ($1, 'CREATOR', $2, $3, $4)
      RETURNING *
    `, [ticket.id, senderId, senderName, cleanMessage]);

    const newMsg = msgRes.rows[0];

    // Optional image attachment
    if (imageUrl) {
      await queryDb(`
        INSERT INTO support_images (support_id, message_id, image_url)
        VALUES ($1, $2, $3)
      `, [ticket.id, newMsg.id, imageUrl]).catch(() => {});
    }

    // Reopen ticket if closed/resolved and update timestamp
    const updateRes = await queryDb(`
      UPDATE support
      SET updated_at = CURRENT_TIMESTAMP,
          status = CASE WHEN status IN ('RESOLVED', 'CLOSED') THEN 'OPEN' ELSE status END
      WHERE id = $1
      RETURNING *
    `, [ticket.id]);

    return NextResponse.json({
      success: true,
      message: newMsg,
      ticket: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Error in creator ticket POST API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
