import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { hasModulePermission } from '@/lib/middleware/developer';

// GET ALL SUPPORT TICKETS
export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'support');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const priorityParam = searchParams.get('priority');

    let whereClauses = [];
    let queryParams = [];

    if (statusParam && statusParam !== 'ALL') {
      queryParams.push(statusParam);
      whereClauses.push(`s.status = $${queryParams.length}`);
    }

    if (priorityParam && priorityParam !== 'ALL') {
      queryParams.push(priorityParam);
      whereClauses.push(`s.priority = $${queryParams.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const res = await queryDb(`
      SELECT 
        s.id,
        s.ticket_number,
        s.creator_id,
        s.requester_name,
        s.requester_email,
        s.subject,
        s.category,
        s.priority,
        s.status,
        s.assigned_developer_id,
        s.created_at,
        s.updated_at,
        c.name AS creator_name,
        NULL::text AS creator_avatar,
        d.name AS assigned_developer_name,
        COALESCE(dr.slug, 'developer') AS assigned_developer_role,
        COALESCE(dr.name, 'Developer') AS assigned_developer_role_name,
        (SELECT COUNT(*)::int FROM support_messages WHERE support_id = s.id) AS message_count,
        (
          SELECT message FROM support_messages 
          WHERE support_id = s.id 
          ORDER BY created_at DESC LIMIT 1
        ) AS last_message,
        (
          SELECT created_at FROM support_messages 
          WHERE support_id = s.id 
          ORDER BY created_at DESC LIMIT 1
        ) AS last_message_at
      FROM support s
      LEFT JOIN creators c ON s.creator_id = c.id
      LEFT JOIN developers d ON s.assigned_developer_id = d.id
      LEFT JOIN roles dr ON d.role_id = dr.id
      ${whereSql}
      ORDER BY s.updated_at DESC
    `, queryParams).catch(() => ({ rows: [] }));

    // Calculate stats
    const statsRes = await queryDb(`
      SELECT 
        COUNT(*)::int AS total,
        COUNT(CASE WHEN status = 'OPEN' THEN 1 END)::int AS open,
        COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END)::int AS in_progress,
        COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END)::int AS resolved,
        COUNT(CASE WHEN status = 'CLOSED' THEN 1 END)::int AS closed
      FROM support
    `).catch(() => ({ rows: [{ total: 0, open: 0, in_progress: 0, resolved: 0, closed: 0 }] }));

    return NextResponse.json({
      success: true,
      records: res.rows,
      tickets: res.rows,
      stats: statsRes.rows[0],
      currentUserRole: auth.staff?.role || 'staff',
    });
  } catch (error) {
    console.error('Developer support GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// UPDATE SUPPORT TICKET STATUS / ASSIGNMENT / PRIORITY
export async function PUT(request) {
  try {
    const auth = await hasModulePermission(request, 'support');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const id = body.id || body.ticketId;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Ticket ID is required.' }, { status: 400 });
    }

    const status = body.status;
    const priority = body.priority;
    const assignedDeveloperId = body.assigned_developer_id !== undefined ? body.assigned_developer_id : undefined;

    const res = await queryDb(`
      UPDATE support
      SET status = COALESCE($1, status),
          priority = COALESCE($2, priority),
          assigned_developer_id = CASE WHEN $3::text IS NOT NULL THEN $4::int ELSE assigned_developer_id END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [
      status || null,
      priority || null,
      assignedDeveloperId !== undefined ? 'SET' : null,
      assignedDeveloperId !== undefined ? (assignedDeveloperId ? Number(assignedDeveloperId) : null) : null,
      id
    ]);

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Support ticket not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, record: res.rows[0], ticket: res.rows[0] });
  } catch (error) {
    console.error('Developer support PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE SUPPORT TICKET
export async function DELETE(request) {
  try {
    const auth = await hasModulePermission(request, 'support');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Access denied: Permission support required to delete support tickets.' },
        { status: auth.status || 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required.' }, { status: 400 });
    }

    const res = await queryDb('DELETE FROM support WHERE id = $1 RETURNING id', [id]);
    if (res.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Ticket not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Ticket deleted successfully.' });
  } catch (error) {
    console.error('Developer support DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
