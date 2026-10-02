import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';

// GET SINGLE CONTACT DETAILS
export async function GET(request, context) {
  try {
    const auth = await hasModulePermission(request, 'contacts');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const params = await context?.params;
    const id = params?.id;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Contact ID is required.' }, { status: 400 });
    }

    const res = await queryDb(`
      SELECT 
        c.id,
        c.name,
        c.email,
        c.phone,
        c.institution,
        c.subject,
        c.message,
        c.status,
        c.admin_notes AS reply,
        c.admin_notes,
        c.assigned_developer_id,
        c.assigned_developer_id AS replied_by_developer_id,
        c.created_at,
        c.updated_at,
        d.name AS replied_by_name,
        d.email AS replied_by_email,
        COALESCE(dr.slug, 'developer') AS replied_by_role
      FROM contacts c
      LEFT JOIN developers d ON c.assigned_developer_id = d.id
      LEFT JOIN developer_roles dr ON d.role_id = dr.id
      WHERE c.id = $1
      LIMIT 1
    `, [id]);

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Contact inquiry not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      contact: res.rows[0],
      record: res.rows[0],
      currentUserRole: auth.user?.role || auth.staff?.role || 'developer',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE SINGLE CONTACT
export async function DELETE(request, context) {
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

    const params = await context?.params;
    const id = params?.id;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Contact ID is required.' }, { status: 400 });
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
