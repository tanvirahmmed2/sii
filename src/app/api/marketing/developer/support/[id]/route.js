import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';

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
        c.name AS requester_name,
        c.email AS requester_email,
        'General' AS category,
        d.name AS assigned_developer_name,
        d.email AS assigned_developer_email,
        COALESCE(dr.slug, 'developer') AS assigned_developer_role
      FROM supports s
      LEFT JOIN creators c ON s.creator_id = c.id
      LEFT JOIN developers d ON s.assigned_developer_id = d.id
      LEFT JOIN developer_roles dr ON d.role_id = dr.id
      WHERE ${isNumeric ? '(s.id = $1::bigint OR s.ticket_number = $1::text)' : 's.ticket_number = $1'}
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
        CASE 
          WHEN m.sender_type = 'creator' THEN c.name 
          WHEN m.sender_type = 'developer' THEN d.name 
          ELSE 'System' 
        END AS sender_name,
        m.message,
        m.is_internal_note,
        m.is_read,
        m.created_at,
        d.name AS developer_name,
        COALESCE(mr.slug, 'developer') AS developer_role
      FROM support_messages m
      LEFT JOIN creators c ON (m.sender_type = 'creator' AND m.sender_id = c.id)
      LEFT JOIN developers d ON (m.sender_type = 'developer' AND m.sender_id = d.id)
      LEFT JOIN developer_roles mr ON d.role_id = mr.id
      WHERE m.support_id = $1
      ORDER BY m.created_at ASC
    `, [ticket.id]);

    // Fetch images joined through support_messages
    const imagesRes = await queryDb(`
      SELECT si.*, sm.support_id 
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

    // Fetch staff developers for assignment dropdown
    const devsRes = await queryDb(`
      SELECT d.id, d.name, d.email, COALESCE(r.slug, 'developer') AS role, COALESCE(r.name, 'Developer') AS role_name 
      FROM developers d
      LEFT JOIN developer_roles r ON d.role_id = r.id
      WHERE d.is_active = TRUE 
      ORDER BY d.name ASC
    `).catch(() => ({ rows: [] }));

    return NextResponse.json({
      success: true,
      ticket,
      messages: messagesWithImages,
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
    const auth = await hasModulePermission(request, 'support');
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
    const status = body.status ? body.status.toLowerCase() : null;
    const priority = body.priority ? body.priority.toLowerCase() : null;
    const assignedDevId = body.assigned_developer_id !== undefined ? body.assigned_developer_id : undefined;

    const res = await queryDb(`
      UPDATE supports
      SET status = COALESCE($1, status),
          priority = COALESCE($2, priority),
          assigned_developer_id = CASE WHEN $3::text IS NOT NULL THEN $4::bigint ELSE assigned_developer_id END,
          updated_at = CURRENT_TIMESTAMP
      WHERE ${isNumeric ? '(id = $5::bigint OR ticket_number = $5::text)' : 'ticket_number = $5'}
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
      DELETE FROM supports 
      WHERE ${isNumeric ? '(id = $1::bigint OR ticket_number = $1::text)' : 'ticket_number = $1'}
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
