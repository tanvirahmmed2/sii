import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { getAuthenticatedUser, hasModulePermission, hashPassword } from 'src/lib/middleware/developer';

async function checkLastActiveAdminGuard(targetId, willDeactivateOrDelete = true) {
  if (!willDeactivateOrDelete) return null;

  const adminRes = await queryDb(
    `SELECT d.id, d.is_active 
     FROM developers d 
     WHERE d.id = $1 LIMIT 1`,
    [targetId]
  );
  if (adminRes.rows.length === 0) {
    return { error: 'Developer not found.', status: 404 };
  }

  const admin = adminRes.rows[0];

  if (admin.is_active) {
    const countRes = await queryDb(
      `SELECT COUNT(*)::int as count 
       FROM developers d 
       WHERE d.is_active = TRUE`
    );
    const activeAdminCount = parseInt(countRes.rows[0].count, 10);
    if (activeAdminCount <= 1) {
      return {
        error: 'Operation rejected: At least one active developer account must remain in the platform.',
        status: 400,
      };
    }
  }

  return null;
}

export async function GET(request) {
  try {
    const auth = await getAuthenticatedUser(request);
    const [devsRes, modsRes, permsRes, rolePermsRes, rolesRes] = await Promise.all([
      queryDb(`
        SELECT d.id, d.name, d.email, d.phone, d.avatar_url,
               d.role_id, r.name AS role_name, r.slug AS role_slug, r.description AS role_description,
               d.is_active, COALESCE(d.email_verified, FALSE) AS email_verified, d.last_login_at, d.created_at, d.updated_at
        FROM developers d
        LEFT JOIN developer_roles r ON d.role_id = r.id
        ORDER BY d.id DESC
      `),
      queryDb(`
        SELECT id, name, slug, description
        FROM modules
        WHERE is_active = TRUE
        ORDER BY name ASC
      `).catch(() => ({ rows: [] })),
      queryDb(`
        SELECT mp.developer_id, mp.module_id, m.slug AS module_slug, m.name AS module_name,
               mp.can_view, mp.can_create, mp.can_edit, mp.can_delete
        FROM module_permissions mp
        JOIN modules m ON m.id = mp.module_id
      `).catch(() => ({ rows: [] })),
      queryDb(`
        SELECT drp.role_id, drp.module_id, m.slug AS module_slug, m.name AS module_name,
               drp.can_view, drp.can_create, drp.can_edit, drp.can_delete
        FROM developer_role_permissions drp
        JOIN modules m ON m.id = drp.module_id
        WHERE m.is_active = TRUE
      `).catch(() => ({ rows: [] })),
      queryDb(`
        SELECT id, name, slug, description, is_system, is_active
        FROM developer_roles
        WHERE is_active = TRUE
        ORDER BY id ASC
      `).catch(() => ({ rows: [] })),
    ]);

    const permsByRole = {};
    for (const p of rolePermsRes.rows) {
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

    const permsByDev = {};
    for (const p of permsRes.rows) {
      if (!permsByDev[p.developer_id]) permsByDev[p.developer_id] = {};
      permsByDev[p.developer_id][p.module_slug] = {
        can_view: Boolean(p.can_view),
        can_create: Boolean(p.can_create),
        can_edit: Boolean(p.can_edit),
        can_delete: Boolean(p.can_delete),
        module_id: p.module_id,
        module_name: p.module_name,
      };
    }

    const records = devsRes.rows.map((r) => {
      const devDirect = permsByDev[r.id] || {};
      const rolePerms = r.role_id ? (permsByRole[r.role_id] || {}) : {};
      const combined = { ...rolePerms, ...devDirect };
      return {
        ...r,
        is_verified: Boolean(r.email_verified),
        permissions: combined,
        allowedModules: Object.keys(combined).filter((k) => combined[k].can_view),
      };
    });

    return NextResponse.json({
      success: true,
      table: 'developers',
      records,
      modules: modsRes.rows,
      roles: rolesRes.rows,
      currentUser: auth
        ? {
            id: auth.id,
            name: auth.name,
            email: auth.email,
            permissions: auth.permissions || [],
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authCheck = await hasModulePermission(request, 'developers');
    if (!authCheck.success) {
      return NextResponse.json(
        { success: false, error: authCheck.message || 'Forbidden: developers permission required.' },
        { status: authCheck.status || 403 }
      );
    }

    const body = await request.json();
    const { action, id, is_active } = body;
    const targetId = id || body.adminId;

    if (!targetId) {
      return NextResponse.json({ success: false, error: 'Admin ID is required.' }, { status: 400 });
    }

    if (action === 'update_permissions') {
      const { permissions } = body;
      if (permissions && typeof permissions === 'object') {
        const mods = await queryDb('SELECT id, slug FROM modules');
        const modIdMap = {};
        mods.rows.forEach((m) => { modIdMap[m.slug] = m.id; });

        for (const [slug, p] of Object.entries(permissions)) {
          const modId = modIdMap[slug];
          if (!modId) continue;
          await queryDb(
            `INSERT INTO module_permissions (developer_id, module_id, can_view, can_create, can_edit, can_delete)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (developer_id, module_id) DO UPDATE SET
               can_view = EXCLUDED.can_view,
               can_create = EXCLUDED.can_create,
               can_edit = EXCLUDED.can_edit,
               can_delete = EXCLUDED.can_delete,
               updated_at = CURRENT_TIMESTAMP`,
            [
              targetId,
              modId,
              Boolean(p?.can_view ?? p?.view ?? true),
              Boolean(p?.can_create ?? p?.create ?? false),
              Boolean(p?.can_edit ?? p?.edit ?? false),
              Boolean(p?.can_delete ?? p?.delete ?? false),
            ]
          );
        }
      }
      return NextResponse.json({ success: true, message: 'Developer module permissions updated successfully.' });
    }

    if (action === 'change_role' || action === 'update_role') {
      return NextResponse.json({
        success: true,
        message: 'Developer permissions are managed directly per module.',
      });
    }

    if (action === 'toggle_status' || action === 'update_status') {
      let nextActive = is_active;
      if (nextActive === undefined) {
        const currentRes = await queryDb('SELECT is_active FROM developers WHERE id = $1 LIMIT 1', [targetId]);
        if (currentRes.rows.length === 0) {
          return NextResponse.json({ success: false, error: 'Developer not found.' }, { status: 404 });
        }
        nextActive = !currentRes.rows[0].is_active;
      }

      if (nextActive === false) {
        const guard = await checkLastActiveAdminGuard(targetId, true);
        if (guard) {
          return NextResponse.json({ success: false, error: guard.error }, { status: guard.status });
        }
      }

      const res = await queryDb(
        `UPDATE developers SET is_active = $1 WHERE id = $2 
         RETURNING id, name, email, is_active, created_at`,
        [Boolean(nextActive), targetId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Developer not found.' }, { status: 404 });
      }

      const fullRes = await queryDb(
        `SELECT d.id, d.name, d.email, d.phone, d.avatar_url,
                d.role_id, r.name AS role_name, r.slug AS role_slug,
                d.is_active, d.created_at
         FROM developers d
         LEFT JOIN developer_roles r ON d.role_id = r.id
         WHERE d.id = $1 LIMIT 1`,
        [targetId]
      );

      const record = fullRes.rows[0] || res.rows[0];
      return NextResponse.json({
        success: true,
        record: { ...record, is_verified: true },
        message: `Status updated to ${nextActive ? 'Active' : 'Inactive'}.`,
      });
    }

    const updateData = { ...body };
    delete updateData.action;
    delete updateData.id;
    delete updateData.adminId;
    delete updateData.role;
    delete updateData.role_id;
    delete updateData.designation;

    if (updateData.phone) {
      updateData.phone = updateData.phone.trim();
      const phoneDigits = updateData.phone.replace(/\D/g, '');
      const existingPhone = await queryDb(
        `SELECT id FROM developers 
         WHERE (phone = $1 OR (LENGTH($2) >= 8 AND RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = RIGHT($2, 10))) 
           AND id != $3 LIMIT 1`,
        [updateData.phone, phoneDigits, targetId]
      );
      if (existingPhone.rows.length > 0) {
        return NextResponse.json({ success: false, error: 'A developer with this phone number already exists.' }, { status: 400 });
      }
    }

    if (updateData.password && updateData.password.trim()) {
      updateData.password = await hashPassword(updateData.password.trim());
    } else {
      delete updateData.password;
    }

    const keys = Object.keys(updateData);
    if (keys.length === 0) {
      return NextResponse.json({ success: true, message: 'Nothing to update.' });
    }

    const values = keys.map((k) => updateData[k]);
    const setClauses = keys.map((k, idx) => `"${k}" = $${idx + 1}`);
    values.push(targetId);

    const updateRes = await queryDb(
      `UPDATE developers SET ${setClauses.join(', ')} WHERE id = $${values.length} 
       RETURNING id, name, email, is_active, created_at`,
      values
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Developer not found.' }, { status: 404 });
    }

    const fullRes = await queryDb(
      `SELECT d.id, d.name, d.email, d.phone, d.avatar_url,
              d.role_id, r.name AS role_name, r.slug AS role_slug,
              d.is_active, d.created_at
       FROM developers d
       LEFT JOIN developer_roles r ON d.role_id = r.id
       WHERE d.id = $1 LIMIT 1`,
      [targetId]
    );

    const record = fullRes.rows[0] || updateRes.rows[0];
    return NextResponse.json({
      success: true,
      record: { ...record, is_verified: true },
      message: 'Developer account updated successfully.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const authCheck = await hasModulePermission(request, 'developers');
    if (!authCheck.success) {
      return NextResponse.json(
        { success: false, error: authCheck.message || 'Forbidden: developers permission required.' },
        { status: authCheck.status || 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    const guard = await checkLastActiveAdminGuard(id, true);
    if (guard) {
      return NextResponse.json({ success: false, error: guard.error }, { status: guard.status });
    }

    await queryDb('DELETE FROM developers WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'Developer account deleted successfully.' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
