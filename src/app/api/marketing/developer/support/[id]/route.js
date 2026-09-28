import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { hasModulePermission } from '@/lib/middleware/developer';

// GET SINGLE SUPPORT TICKET & THREAD (Developer)
export async function GET(request, context) {
  try {
    const auth = await hasModulePermission(request, 'support');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const params = await context?.params;
    const id = params?.id;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Ticket ID is required.' }, { status: 400 });
    }

    const isNumeric = /^\d+$/.test(id);
    const ticketRes = await queryDb(`
      SELECT 
        s.*,
        c.name AS creator_name,
        c.email AS creator_email,
        NULL::text AS creator_avatar,
        c.phone AS creator_phone,
        d.name AS assigned_developer_name,
        d.email AS assigned_developer_email,
        COALESCE(dr.slug, 'developer') AS assigned_developer_role
      FROM support s
      LEFT JOIN creators c ON s.creator_id = c.id
      LEFT JOIN developers d ON s.assigned_developer_id = d.id
      LEFT JOIN roles dr ON d.role_id = dr.id
      WHERE ${isNumeric ? 's.id = $1 OR s.ticket_number = $1' : 's.ticket_number = $1'}
      LIMIT 1
    `, [id]);

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
        COALESCE(mr.slug, 'developer') AS developer_role
      FROM support_messages m
      LEFT JOIN developers d ON (m.sender_type IN ('ADMIN', 'DEVELOPER') AND m.sender_id = d.id)
      LEFT JOIN roles mr ON d.role_id = mr.id
      WHERE m.support_id = $1
      ORDER BY m.created_at ASC
    `, [ticket.id]);

    // Fetch images
    const imagesRes = await queryDb(`
      SELECT * FROM support_images WHERE support_id = $1 ORDER BY created_at ASC
    `, [ticket.id]).catch(() => ({ rows: [] }));

    // Fetch staff developers for assignment dropdown
    const devsRes = await queryDb(`
      SELECT d.id, d.name, d.email, COALESCE(r.slug, 'developer') AS role, COALESCE(r.name, 'Developer') AS role_name 
      FROM developers d
      LEFT JOIN roles r ON d.role_id = r.id
      WHERE d.is_active = TRUE 
      ORDER BY d.name ASC
    `).catch(() => ({ rows: [] }));

    return NextResponse.json({
      success: true,
      ticket,
      messages: messagesRes.rows,
      images: imagesRes.rows,
      staffMembers: devsRes.rows,
      currentUser: auth.staff,
      currentUserRole: auth.staff?.role || 'staff',
    });
  } catch (error) {
    console.error('Error in developer single ticket GET API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// UPDATE TICKET (Status, Priority, Assignment)
export async function PUT(request, context) {
  try {
    const auth = await authenticateStaff(request);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: 401 });
    }

    const params = await context?.params;
    const id = params?.id;
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'Ticket ID is required.' }, { status: 400 });
    }

    const isNumeric = /^\d+$/.test(id);
    const status = body.status;
    const priority = body.priority;
    const assignedDevId = body.assigned_developer_id !== undefined ? body.assigned_developer_id : undefined;

    const res = await queryDb(`
      UPDATE support
      SET status = COALESCE($1, status),
          priority = COALESCE($2, priority),
          assigned_developer_id = CASE WHEN $3::text IS NOT NULL THEN $4::int ELSE assigned_developer_id END,
          updated_at = CURRENT_TIMESTAMP
      WHERE ${isNumeric ? 'id = $5 OR ticket_number = $5' : 'ticket_number = $5'}
      RETURNING *
    `, [
      status || null,
      priority || null,
      assignedDevId !== undefined ? 'SET' : null,
      assignedDevId !== undefined ? (assignedDevId ? Number(assignedDevId) : null) : null,
      id,
    ]);

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Support ticket not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, ticket: res.rows[0] });
  } catch (error) {
    console.error('Error in developer single ticket PUT API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE TICKET
export async function DELETE(request, context) {
  try {
    const auth = await hasModulePermission(request, 'support');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Access denied: Permission support required to delete support tickets.' },
        { status: auth.status || 403 }
      );
    }

    const params = await context?.params;
    const id = params?.id;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Ticket ID is required.' }, { status: 400 });
    }

    const isNumeric = /^\d+$/.test(id);
    const deleteRes = await queryDb(`
      DELETE FROM support 
      WHERE ${isNumeric ? 'id = $1 OR ticket_number = $1' : 'ticket_number = $1'}
      RETURNING id
    `, [id]);

    if (deleteRes.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Ticket not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Ticket deleted successfully.' });
  } catch (error) {
    console.error('Error in developer single ticket DELETE API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
