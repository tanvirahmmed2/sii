import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { getCreatorSession } from '@/lib/middleware/creator';

/**
 * API Route: /api/creator/support
 * Dedicated to `support` and `support_messages` tables.
 */

export async function GET(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const { searchParams } = new URL(request.url);
    const creatorIdParam = searchParams.get('creatorId');

    const creatorId = creatorIdParam ? Number(creatorIdParam) : sessionCreator?.id;
    if (!creatorId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Valid creator session required' }, { status: 401 });
    }

    if (sessionCreator && sessionCreator.id !== creatorId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const creatorEmail = sessionCreator?.email || '';

    const res = await queryDb(
      `SELECT * FROM support 
       WHERE creator_id = $1 OR requester_email = $2 
       ORDER BY id DESC LIMIT 50`,
      [creatorId, creatorEmail]
    );

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

  if (sessionCreator && sessionCreator.id !== creatorId) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  // 1. Create Support Ticket
  if (action === 'create_ticket' || !action) {
    const { subject, category, priority, message } = body;

    if (!subject || !message) {
      return NextResponse.json({ success: false, error: 'Subject and message are required.' }, { status: 400 });
    }

    const c = await queryDb('SELECT name, email FROM creators WHERE id = $1', [creatorId]);
    if (c.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Creator not found.' }, { status: 404 });
    }

    const creator = c.rows[0];
    const ticketNumber = 'TKT-' + Math.floor(100000 + Math.random() * 900000);

    const ticketRes = await queryDb(
      `INSERT INTO support (ticket_number, creator_id, requester_name, requester_email, subject, category, priority, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'OPEN')
       RETURNING *`,
      [ticketNumber, creatorId, creator.name, creator.email, subject, category || 'TECHNICAL', priority || 'MEDIUM']
    );
    const ticket = ticketRes.rows[0];

    await queryDb(
      `INSERT INTO support_messages (support_id, sender_type, sender_id, sender_name, message)
       VALUES ($1, 'CREATOR', $2, $3, $4)`,
      [ticket.id, creatorId, creator.name, message]
    );

    return NextResponse.json({ success: true, ticket });
  }

  // 2. Add Message to Ticket
  if (action === 'add_message') {
    const { ticketId, message } = body;
    if (!ticketId || !message) {
      return NextResponse.json({ success: false, error: 'Ticket ID and message are required.' }, { status: 400 });
    }

    const creatorData = sessionCreator || (await queryDb('SELECT name FROM creators WHERE id = $1', [creatorId])).rows[0];

    const msgRes = await queryDb(
      `INSERT INTO support_messages (support_id, sender_type, sender_id, sender_name, message)
       VALUES ($1, 'CREATOR', $2, $3, $4)
       RETURNING *`,
      [Number(ticketId), creatorId, creatorData?.name || 'Creator', message]
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
