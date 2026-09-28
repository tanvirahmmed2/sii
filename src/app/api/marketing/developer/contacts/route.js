import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { hasModulePermission } from '@/lib/middleware/developer';

// GET ALL CONTACTS (Staff access)
export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'contacts');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const singleRes = await queryDb(`
        SELECT 
          c.id,
          c.name,
          c.email,
          c.subject,
          c.message,
          c.status,
          c.reply,
          c.replied_by_developer_id,
          c.created_at,
          c.updated_at,
          d.name AS replied_by_name,
          d.email AS replied_by_email,
          COALESCE(dr.slug, 'developer') AS replied_by_role
        FROM contacts c
        LEFT JOIN developers d ON c.replied_by_developer_id = d.id
        LEFT JOIN roles dr ON d.role_id = dr.id
        WHERE c.id = $1
        LIMIT 1
      `, [id]);

      if (singleRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Contact inquiry not found' }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        contact: singleRes.rows[0], 
        record: singleRes.rows[0],
        currentUserRole: auth.staff?.role || 'staff'
      });
    }

    const res = await queryDb(`
      SELECT 
        c.id,
        c.name,
        c.email,
        c.subject,
        c.message,
        c.status,
        c.reply,
        c.replied_by_developer_id,
        c.created_at,
        c.updated_at,
        d.name AS replied_by_name,
        d.email AS replied_by_email,
        COALESCE(dr.slug, 'developer') AS replied_by_role
      FROM contacts c
      LEFT JOIN developers d ON c.replied_by_developer_id = d.id
      LEFT JOIN roles dr ON d.role_id = dr.id
      ORDER BY c.id DESC
    `).catch(() => ({ rows: [] }));

    return NextResponse.json({ 
      success: true, 
      table: 'contacts', 
      records: res.rows,
      currentUserRole: auth.staff?.role || 'staff'
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST is disabled: Contacts must originate exclusively from public visitors on the contact page
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Manual contact creation is disabled. Contacts can only be submitted via the public contact page.' },
    { status: 405 }
  );
}

// UPDATE CONTACT (Staff update)
export async function PUT(request) {
  try {
    const auth = await hasModulePermission(request, 'contacts');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const id = body.id || body.data?.id;
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });

    const data = body.data || body;
    const name = data.name?.trim();
    const email = data.email?.trim();
    const subject = data.subject?.trim();
    const message = data.message?.trim();
    const status = data.status;
    const reply = data.reply !== undefined ? data.reply : data.admin_reply;

    const res = await queryDb(
      `UPDATE contacts 
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           subject = COALESCE($3, subject),
           message = COALESCE($4, message),
           status = COALESCE($5, status),
           reply = COALESCE($6, reply),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [name || null, email || null, subject || null, message || null, status || null, reply || null, id]
    );

    return NextResponse.json({ success: true, record: res.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// DELETE CONTACT
export async function DELETE(request) {
  try {
    const auth = await hasModulePermission(request, 'contacts');
    if (!auth.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: auth.message || 'Access denied: Permission contacts required to delete contact inquiries.' 
        }, 
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
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    const deleteRes = await queryDb('DELETE FROM contacts WHERE id = $1 RETURNING id', [id]);
    if (deleteRes.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Contact inquiry not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Contact inquiry deleted successfully.' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

