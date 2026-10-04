import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { getCreatorSession } from 'src/lib/middleware/creator';

/**
 * API Route: /api/creator/support
 * Dedicated to `support` and `support_messages` tables.
 */

export async function GET(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const { searchParams } = new URL(request.url);
    const creatorIdParam = searchParams.get('creatorId');

    const creatorId = creatorIdParam ? Number(creatorIdParam) : Number(sessionCreator?.id);
    if (!creatorId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Valid creator session required' }, { status: 401 });
    }

    if (sessionCreator && Number(sessionCreator.id) !== creatorId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const res = await queryDb(
      `SELECT s.*,
              c.name AS creator_name,
              c.email AS creator_email
       FROM supports s
       LEFT JOIN creators c ON s.creator_id = c.id
       WHERE s.creator_id = $1 
       ORDER BY s.id DESC LIMIT 50`,
      [creatorId]
    ).catch(() => ({ rows: [] }));

    return NextResponse.json({ success: true, tickets: res.rows });
  } catch (error) {
    console.error('Support Tickets GET API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function handleSupportAction(body, sessionCreator) {
  const { action } = body;
  const creatorId = Number(body.creatorId || sessionCreator?.id);

  if (!creatorId) {
    return NextResponse.json({ success: false, error: 'Creator ID required.' }, { status: 401 });
  }

  if (sessionCreator && Number(sessionCreator.id) !== creatorId) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  // 1. Create Support Ticket
  if (action === 'create_ticket' || !action) {
    const { subject, priority = 'medium', message } = body;

    if (!subject || !message) {
      return NextResponse.json({ success: false, error: 'Subject and message are required.' }, { status: 400 });
    }

    const c = await queryDb('SELECT name, email FROM creators WHERE id = $1', [creatorId]);
    if (c.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Creator not found.' }, { status: 404 });
    }

    const ticketNumber = 'TKT-' + Math.floor(100000 + Math.random() * 900000);
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    const cleanPriority = validPriorities.includes(String(priority).toLowerCase()) ? String(priority).toLowerCase() : 'medium';

    const ticketRes = await queryDb(
      `INSERT INTO supports (ticket_number, creator_id, subject, priority, status)
       VALUES ($1, $2, $3, $4, 'open')
       RETURNING *`,
      [ticketNumber, creatorId, subject.trim(), cleanPriority]
    );
    const ticket = ticketRes.rows[0];

    await queryDb(
      `INSERT INTO support_messages (support_id, sender_type, sender_id, message)
       VALUES ($1, 'creator', $2, $3)`,
      [ticket.id, creatorId, message.trim()]
    );

    return NextResponse.json({ success: true, ticket });
  }

  // 2. Add Message to Ticket
  if (action === 'add_message') {
    const { ticketId, message } = body;
    if (!ticketId || !message) {
      return NextResponse.json({ success: false, error: 'Ticket ID and message are required.' }, { status: 400 });
    }

    const msgRes = await queryDb(
      `INSERT INTO support_messages (support_id, sender_type, sender_id, message)
       VALUES ($1, 'creator', $2, $3)
       RETURNING *`,
      [Number(ticketId), creatorId, message.trim()]
    );

    await queryDb(
      `UPDATE supports SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [Number(ticketId)]
    );

    return NextResponse.json({ success: true, message: msgRes.rows[0] });
  }

  return NextResponse.json({ success: false, error: `Unknown support action: ${action}` }, { status: 400 });
}

export async function POST(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const body = await request.json();
    return await handleSupportAction(body, sessionCreator);
  } catch (error) {
    console.error('Support Tickets POST API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
