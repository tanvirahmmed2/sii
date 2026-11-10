import { NextResponse } from 'next/server';
import { getDeveloperSession } from 'src/lib/middleware/developer';
import { queryDb } from 'src/lib/database/db';

export async function GET(request) {
  try {
    const session = await getDeveloperSession(request);
    let currentDeveloper = null;

    if (session && session.id) {
      let roleName = 'Developer';
      let roleSlug = 'developer';

      if (session.roleId) {
        const roleRes = await queryDb(
          'SELECT name, slug FROM developer_roles WHERE id = $1',
          [session.roleId]
        ).catch(() => ({ rows: [] }));

        if (roleRes.rows.length > 0) {
          roleName = roleRes.rows[0].name;
          roleSlug = roleRes.rows[0].slug;
        }
      }

      const isOwner = Number(session.id) === 1 || String(session.email).toLowerCase() === 'tanvir004006@gmail.com';

      currentDeveloper = {
        id: session.id,
        name: session.name,
        email: session.email,
        roleId: session.roleId,
        roleName,
        roleSlug,
        isOwner,
      };
    }

    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get('role');
    const categoryParam = searchParams.get('category');
    const priorityParam = searchParams.get('priority');
    const searchParam = searchParams.get('search');

    let query = `
      SELECT 
        n.id,
        n.title,
        n.content,
        n.priority,
        n.category,
        n.is_pinned,
        n.target_role,
        n.expires_at,
        n.created_at,
        n.updated_at,
        d.name AS author_name,
        d.email AS author_email,
        COALESCE(r.name, 'Platform Engineering') AS author_role
      FROM notices n
      LEFT JOIN developers d ON n.created_by_developer_id = d.id
      LEFT JOIN developer_roles r ON d.role_id = r.id
      WHERE (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
    `;

    const values = [];
    let idx = 1;

    if (roleParam === 'MY_ROLE' && currentDeveloper) {
      query += ` AND (n.target_role = 'ALL' OR LOWER(n.target_role) = LOWER($${idx++}) OR LOWER(n.target_role) = LOWER($${idx++}))`;
      values.push(currentDeveloper.roleName, currentDeveloper.roleSlug);
    } else if (roleParam && roleParam !== 'ALL') {
      query += ` AND (n.target_role = 'ALL' OR LOWER(n.target_role) = LOWER($${idx++}))`;
      values.push(roleParam);
    }

    if (categoryParam && categoryParam !== 'ALL') {
      query += ` AND UPPER(n.category) = UPPER($${idx++})`;
      values.push(categoryParam);
    }

    if (priorityParam && priorityParam !== 'ALL') {
      query += ` AND UPPER(n.priority) = UPPER($${idx++})`;
      values.push(priorityParam);
    }

    if (searchParam && searchParam.trim()) {
      query += ` AND (n.title ILIKE $${idx} OR n.content ILIKE $${idx} OR n.category ILIKE $${idx})`;
      values.push(`%${searchParam.trim()}%`);
      idx++;
    }

    query += ` ORDER BY n.is_pinned DESC, n.created_at DESC`;

    const noticesRes = await queryDb(query, values).catch(() => ({ rows: [] }));

    const rolesRes = await queryDb(
      `SELECT DISTINCT name, slug FROM developer_roles WHERE is_active = TRUE ORDER BY name ASC`
    ).catch(() => ({ rows: [] }));

    const statsRes = await queryDb(`
      SELECT 
        COUNT(*)::int AS total_notices,
        COUNT(CASE WHEN is_pinned = TRUE THEN 1 END)::int AS pinned_notices,
        COUNT(CASE WHEN UPPER(priority) = 'URGENT' THEN 1 END)::int AS urgent_notices
      FROM notices
      WHERE (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `).catch(() => ({ rows: [{ total_notices: 0, pinned_notices: 0, urgent_notices: 0 }] }));

    let myRoleNoticesCount = 0;
    if (currentDeveloper) {
      const myCountRes = await queryDb(
        `SELECT COUNT(*)::int AS count 
         FROM notices 
         WHERE (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
           AND (target_role = 'ALL' OR LOWER(target_role) = LOWER($1) OR LOWER(target_role) = LOWER($2))`,
        [currentDeveloper.roleName, currentDeveloper.roleSlug]
      ).catch(() => ({ rows: [{ count: 0 }] }));
      myRoleNoticesCount = myCountRes.rows[0]?.count || 0;
    }

    return NextResponse.json({
      success: true,
      notices: noticesRes.rows,
      currentDeveloper,
      roles: rolesRes.rows,
      stats: {
        total_notices: statsRes.rows[0]?.total_notices || 0,
        pinned_notices: statsRes.rows[0]?.pinned_notices || 0,
        urgent_notices: statsRes.rows[0]?.urgent_notices || 0,
        my_role_notices: myRoleNoticesCount,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

