import { NextResponse } from 'next/server';
import { queryDb, pool } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

/**
 * GET /api/developer/permissions
 * List all developer module_permissions, combining developer with module.
 */
export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, ['modules', 'developers']);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    const developerId = searchParams.get('developerId');
    const roleId = searchParams.get('roleId') || searchParams.get('role_id');
    const search = (searchParams.get('search') || searchParams.get('q') || '').trim().toLowerCase();

    // If querying by role_id
    if (roleId) {
      let rolePermsSql = `
        SELECT drp.id, drp.role_id, r.name AS role_name, r.slug AS role_slug,
               drp.module_id, m.name AS module_name, m.slug AS module_slug, m.description AS module_description,
               m.page_path, m.api_path,
               drp.can_view, drp.can_create, drp.can_edit, drp.can_delete, drp.created_at, drp.updated_at
        FROM developer_role_permissions drp
        JOIN modules m ON drp.module_id = m.id
        JOIN developer_roles r ON drp.role_id = r.id
        WHERE drp.role_id = $1
      `;
      const rolePermsRes = await queryDb(rolePermsSql, [roleId]).catch(() => ({ rows: [] }));
      const rolesRes = await queryDb('SELECT * FROM developer_roles ORDER BY id ASC').catch(() => ({ rows: [] }));
      const modulesRes = await queryDb('SELECT id, name, slug, description, page_path, api_path FROM modules WHERE is_active = TRUE ORDER BY sort_order ASC, name ASC').catch(() => ({ rows: [] }));

      return NextResponse.json({
        success: true,
        role_id: Number(roleId),
        permissions: rolePermsRes.rows,
        records: rolePermsRes.rows,
        roles: rolesRes.rows,
        modules: modulesRes.rows,
        total: rolePermsRes.rows.length,
      });
    }

    let querySql = `
      SELECT mp.id, mp.developer_id, d.name AS developer_name, d.email AS developer_email,
             d.role_id, r.name AS role_name,
             mp.module_id, m.name AS module_name, m.slug AS module_slug, m.description AS module_description,
             m.page_path, m.api_path,
             mp.can_view, mp.can_create, mp.can_edit, mp.can_delete, mp.created_at, mp.updated_at
      FROM module_permissions mp
      JOIN modules m ON mp.module_id = m.id
      JOIN developers d ON mp.developer_id = d.id
      LEFT JOIN developer_roles r ON d.role_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (developerId) {
      params.push(developerId);
      querySql += ` AND mp.developer_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      querySql += ` AND (LOWER(m.name) LIKE $${params.length} OR LOWER(m.slug) LIKE $${params.length} OR LOWER(d.name) LIKE $${params.length} OR LOWER(d.email) LIKE $${params.length})`;
    }

    querySql += ` ORDER BY d.name ASC, m.sort_order ASC, m.name ASC`;

    const res = await queryDb(querySql, params).catch(() => ({ rows: [] }));
    const modulesRes = await queryDb('SELECT id, name, slug, description, page_path, api_path FROM modules WHERE is_active = TRUE ORDER BY sort_order ASC, name ASC').catch(() => ({ rows: [] }));
    const rolesRes = await queryDb('SELECT * FROM developer_roles ORDER BY id ASC').catch(() => ({ rows: [] }));

    return NextResponse.json({
      success: true,
      records: res.rows,
      permissions: res.rows,
      modules: modulesRes.rows,
      roles: rolesRes.rows,
      total: res.rows.length,
    });
  } catch (error) {
    console.error('Error fetching developer permissions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/developer/permissions
 * Grant or update a developer module_permission.
 */
export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, ['modules', 'developers']);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const body = await request.json();
    const { roleId, developerId, moduleId, can_view = true, can_create = false, can_edit = false, can_delete = false } = body;

    // Assign role to developer directly
    if (developerId && roleId && !moduleId) {
      await queryDb('UPDATE developers SET role_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [roleId, developerId]);
      return NextResponse.json({ success: true, message: 'Developer role assigned successfully.' });
    }

    // Role-based permission update
    if (roleId && moduleId) {
      const insertRes = await queryDb(
        `INSERT INTO developer_role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
         ON CONFLICT (role_id, module_id) DO UPDATE SET
           can_view = EXCLUDED.can_view,
           can_create = EXCLUDED.can_create,
           can_edit = EXCLUDED.can_edit,
           can_delete = EXCLUDED.can_delete,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [roleId, moduleId, Boolean(can_view), Boolean(can_create), Boolean(can_edit), Boolean(can_delete)]
      );
      return NextResponse.json({
        success: true,
        record: insertRes.rows[0],
        message: 'Role module permission saved successfully.',
      });
    }

    if (!developerId || !moduleId) {
      return NextResponse.json({ success: false, error: 'developerId or roleId and moduleId are required.' }, { status: 400 });
    }

    const insertRes = await queryDb(
      `INSERT INTO module_permissions (developer_id, module_id, can_view, can_create, can_edit, can_delete)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (developer_id, module_id) DO UPDATE SET
         can_view = EXCLUDED.can_view,
         can_create = EXCLUDED.can_create,
         can_edit = EXCLUDED.can_edit,
         can_delete = EXCLUDED.can_delete,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [developerId, moduleId, Boolean(can_view), Boolean(can_create), Boolean(can_edit), Boolean(can_delete)]
    );

    return NextResponse.json({
      success: true,
      record: insertRes.rows[0],
      message: 'Developer module permission saved successfully.',
    });
  } catch (error) {
    console.error('Error saving developer permission:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

/**
 * PUT /api/developer/permissions
 * Update an existing developer module permission.
 */
export async function PUT(request) {
  try {
    const auth = await hasModulePermission(request, ['modules', 'developers']);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const body = await request.json();
    const id = body.id || body.permissionId;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Permission ID is required.' }, { status: 400 });
    }

    const updateRes = await queryDb(
      `UPDATE module_permissions
       SET can_view = COALESCE($1, can_view),
           can_create = COALESCE($2, can_create),
           can_edit = COALESCE($3, can_edit),
           can_delete = COALESCE($4, can_delete),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [body.can_view, body.can_create, body.can_edit, body.can_delete, id]
    );

    return NextResponse.json({
      success: true,
      record: updateRes.rows[0],
      message: 'Developer module permission updated successfully.',
    });
  } catch (error) {
    console.error('Error updating developer permission:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

/**
 * DELETE /api/developer/permissions
 * Revoke a developer module permission.
 */
export async function DELETE(request) {
  try {
    const auth = await hasModulePermission(request, ['modules', 'developers']);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Permission ID is required.' }, { status: 400 });
    }

    await queryDb('DELETE FROM module_permissions WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: 'Developer module permission revoked successfully.',
    });
  } catch (error) {
    console.error('Error deleting developer permission:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
