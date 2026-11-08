import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, ['roles', 'developers', 'modules']);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const [rolesRes, modulesRes, permsRes, devsRes] = await Promise.all([
      queryDb(`
        SELECT r.id, r.name, r.slug, r.description, r.is_system, r.is_active, r.created_at, r.updated_at,
               COUNT(DISTINCT d.id)::int AS developer_count,
               COUNT(DISTINCT drp.id) FILTER (WHERE drp.can_view = TRUE)::int AS allowed_modules_count
        FROM developer_roles r
        LEFT JOIN developers d ON d.role_id = r.id
        LEFT JOIN developer_role_permissions drp ON drp.role_id = r.id
        GROUP BY r.id
        ORDER BY r.id ASC
      `),
      queryDb(`
        SELECT id, name, slug, description, sort_order
        FROM modules
        WHERE is_active = TRUE
        ORDER BY sort_order ASC, name ASC
      `),
      queryDb(`
        SELECT drp.id, drp.role_id, drp.module_id, m.slug AS module_slug, m.name AS module_name,
               drp.can_view, drp.can_create, drp.can_edit, drp.can_delete
        FROM developer_role_permissions drp
        JOIN modules m ON m.id = drp.module_id
        WHERE m.is_active = TRUE
      `),
      queryDb(`
        SELECT d.id, d.name, d.email, d.phone, d.role_id, r.name AS role_name, d.is_active
        FROM developers d
        LEFT JOIN developer_roles r ON d.role_id = r.id
        ORDER BY d.name ASC
      `),
    ]);

    const permsByRole = {};
    for (const p of permsRes.rows) {
      if (!permsByRole[p.role_id]) permsByRole[p.role_id] = {};
      permsByRole[p.role_id][p.module_slug] = {
        can_view: Boolean(p.can_view),
        can_create: Boolean(p.can_create),
        can_edit: Boolean(p.can_edit),
        can_delete: Boolean(p.can_delete),
        module_id: p.module_id,
        module_name: p.module_name,
      };
    }

    return NextResponse.json({
      success: true,
      roles: rolesRes.rows,
      modules: modulesRes.rows,
      permissions: permsByRole,
      developers: devsRes.rows,
      total: rolesRes.rows.length,
    });
  } catch (error) {
    console.error('Error fetching developer roles:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, ['roles', 'developers', 'modules']);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const body = await request.json();
    const action = body.action || 'create_role';

    if (action === 'update_permissions') {
      const roleId = body.role_id || body.roleId;
      const permissions = body.permissions || {};

      if (!roleId) {
        return NextResponse.json({ success: false, error: 'Role ID is required.' }, { status: 400 });
      }

      const roleCheck = await queryDb('SELECT id, is_system FROM developer_roles WHERE id = $1', [roleId]);
      if (roleCheck.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Role not found.' }, { status: 404 });
      }

      const modsRes = await queryDb('SELECT id, slug FROM modules WHERE is_active = TRUE');
      const modMap = {};
      modsRes.rows.forEach((m) => { modMap[m.slug] = m.id; });

      for (const [slug, p] of Object.entries(permissions)) {
        const modId = modMap[slug];
        if (!modId) continue;

        await queryDb(
          `INSERT INTO developer_role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
           ON CONFLICT (role_id, module_id) DO UPDATE SET
             can_view = EXCLUDED.can_view,
             can_create = EXCLUDED.can_create,
             can_edit = EXCLUDED.can_edit,
             can_delete = EXCLUDED.can_delete,
             updated_at = CURRENT_TIMESTAMP`,
          [
            roleId,
            modId,
            Boolean(p?.can_view ?? p?.view ?? false),
            Boolean(p?.can_create ?? p?.create ?? false),
            Boolean(p?.can_edit ?? p?.edit ?? false),
            Boolean(p?.can_delete ?? p?.delete ?? false),
          ]
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Role module permissions updated successfully.',
      });
    }

    if (action === 'assign_developer') {
      const developerId = body.developer_id || body.developerId;
      const roleId = body.role_id || body.roleId;

      if (!developerId) {
        return NextResponse.json({ success: false, error: 'Developer ID is required.' }, { status: 400 });
      }

      await queryDb(
        'UPDATE developers SET role_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [roleId || null, developerId]
      );

      return NextResponse.json({
        success: true,
        message: 'Developer role assignment updated successfully.',
      });
    }

    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Role name is required.' }, { status: 400 });
    }

    const slug = slugify(body.slug || name);
    if (!slug) {
      return NextResponse.json({ success: false, error: 'Valid role slug is required.' }, { status: 400 });
    }

    const description = String(body.description || '').trim();
    const isActive = body.is_active !== false;

    const existing = await queryDb('SELECT id FROM developer_roles WHERE LOWER(name) = LOWER($1) OR LOWER(slug) = LOWER($2) LIMIT 1', [name, slug]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'A role with this name or slug already exists.' }, { status: 400 });
    }

    const insertRes = await queryDb(
      `INSERT INTO developer_roles (name, slug, description, is_system, is_active)
       VALUES ($1, $2, $3, FALSE, $4)
       RETURNING *`,
      [name, slug, description, isActive]
    );

    const newRole = insertRes.rows[0];

    const modsRes = await queryDb('SELECT id FROM modules WHERE is_active = TRUE');
    for (const m of modsRes.rows) {
      await queryDb(
        `INSERT INTO developer_role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
         VALUES ($1, $2, FALSE, FALSE, FALSE, FALSE)
         ON CONFLICT (role_id, module_id) DO NOTHING`,
        [newRole.id, m.id]
      );
    }

    return NextResponse.json({
      success: true,
      role: newRole,
      message: 'Developer role created successfully.',
    });
  } catch (error) {
    console.error('Error creating developer role:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const auth = await hasModulePermission(request, ['roles', 'developers', 'modules']);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const body = await request.json();
    const id = body.id || body.role_id;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Role ID is required.' }, { status: 400 });
    }

    const currentRes = await queryDb('SELECT id, is_system FROM developer_roles WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Role not found.' }, { status: 404 });
    }

    const current = currentRes.rows[0];
    const name = body.name ? String(body.name).trim() : null;
    const description = body.description !== undefined ? String(body.description).trim() : null;
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : null;
    const slug = body.slug ? slugify(body.slug) : null;

    if (name) {
      const existing = await queryDb(
        'SELECT id FROM developer_roles WHERE LOWER(name) = LOWER($1) AND id != $2 LIMIT 1',
        [name, id]
      );
      if (existing.rows.length > 0) {
        return NextResponse.json({ success: false, error: 'Another role with this name already exists.' }, { status: 400 });
      }
    }

    if (slug) {
      const existingSlug = await queryDb(
        'SELECT id FROM developer_roles WHERE LOWER(slug) = LOWER($1) AND id != $2 LIMIT 1',
        [slug, id]
      );
      if (existingSlug.rows.length > 0) {
        return NextResponse.json({ success: false, error: 'Another role with this slug already exists.' }, { status: 400 });
      }
    }

    const updateRes = await queryDb(
      `UPDATE developer_roles
       SET name = COALESCE($1, name),
           slug = COALESCE($2, slug),
           description = COALESCE($3, description),
           is_active = COALESCE($4, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [name, current.is_system ? null : slug, description, isActive, id]
    );

    return NextResponse.json({
      success: true,
      role: updateRes.rows[0],
      message: 'Role details updated successfully.',
    });
  } catch (error) {
    console.error('Error updating developer role:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const auth = await hasModulePermission(request, ['roles', 'developers', 'modules']);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Role ID is required.' }, { status: 400 });
    }

    const roleRes = await queryDb('SELECT id, name, is_system FROM developer_roles WHERE id = $1', [id]);
    if (roleRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Role not found.' }, { status: 404 });
    }

    const role = roleRes.rows[0];
    if (role.is_system) {
      return NextResponse.json({ success: false, error: 'System roles cannot be deleted.' }, { status: 400 });
    }

    await queryDb('UPDATE developers SET role_id = NULL WHERE role_id = $1', [id]);
    await queryDb('DELETE FROM developer_role_permissions WHERE role_id = $1', [id]);
    await queryDb('DELETE FROM developer_roles WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: `Role "${role.name}" deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting developer role:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

