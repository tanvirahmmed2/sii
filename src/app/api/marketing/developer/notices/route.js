import { NextResponse } from 'next/server';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { queryDb } from 'src/lib/database/db';

// ============================================================================
// GET: List all notices (All developers)
// ============================================================================
export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'notices');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const noticesRes = await queryDb(`
      SELECT 
        n.*,
        d.name AS creator_name,
        d.email AS creator_email,
        COALESCE(dr.slug, 'developer') AS creator_role
      FROM notices n
      LEFT JOIN developers d ON n.created_by_developer_id = d.id
      LEFT JOIN developer_roles dr ON d.role_id = dr.id
      ORDER BY n.is_pinned DESC, n.created_at DESC
    `).catch(() => ({ rows: [] }));

    const currentStaff = auth.user || auth.staff;
    const perms = Array.isArray(currentStaff?.permissions) ? currentStaff.permissions : [];
    const canManage = perms.includes('notices') || currentStaff?.role === 'admin';

    return NextResponse.json({
      success: true,
      notices: noticesRes.rows,
      canManage,
    });
  } catch (error) {
    console.error('Notices GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// POST: Create notice
// ============================================================================
export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'notices');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Forbidden: Permission notices required to create notices.' },
        { status: auth.status || 403 }
      );
    }

    const body = await request.json();
    const { title, content, priority = 'NORMAL', category = 'GENERAL', is_pinned = false, target_role = 'ALL', expires_at } = body;

    if (!title || !content) {
      return NextResponse.json({ success: false, error: 'Notice title and content are required.' }, { status: 400 });
    }

    const currentStaffId = auth.user?.id || auth.staff?.id;

    const res = await queryDb(
      `INSERT INTO notices (title, content, priority, category, is_pinned, target_role, created_by_developer_id, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        title.trim(),
        content.trim(),
        priority,
        category,
        Boolean(is_pinned),
        target_role || 'ALL',
        currentStaffId,
        expires_at ? new Date(expires_at) : null,
      ]
    );

    return NextResponse.json({
      success: true,
      notice: res.rows[0],
      message: 'Notice posted successfully.',
    });
  } catch (error) {
    console.error('Notices POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
