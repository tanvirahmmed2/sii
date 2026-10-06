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
 * List all available system module_permissions, grouped by developer_modules,
 * along with role assignment statistics.
 */
export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, ['roles', 'developers']);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || searchParams.get('q') || '').trim().toLowerCase();
    const folder = (searchParams.get('folder') || '').trim().toLowerCase();

    let querySql = `
      SELECT mp.id, mp.name, mp.permission_key AS slug, dm.slug AS folder, dm.name AS folder_name,
             mp.description, mp.created_at,
             COUNT(DISTINCT drp.role_id)::int AS roles_count,
             COALESCE(
               json_agg(
                 DISTINCT jsonb_build_object('id', dr.id, 'name', dr.name, 'slug', dr.slug)
               ) FILTER (WHERE dr.id IS NOT NULL), '[]'
             ) AS assigned_roles
      FROM module_permissions mp
      JOIN developer_modules dm ON mp.module_id = dm.id
      LEFT JOIN developer_role_permissions drp ON mp.id = drp.permission_id
      LEFT JOIN developer_roles dr ON drp.role_id = dr.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      querySql += ` AND (LOWER(mp.name) LIKE $${params.length} OR LOWER(mp.permission_key) LIKE $${params.length} OR LOWER(mp.description) LIKE $${params.length})`;
    }

    if (folder && folder !== 'all') {
      params.push(folder);
      querySql += ` AND LOWER(dm.slug) = $${params.length}`;
    }

    querySql += `
      GROUP BY mp.id, mp.name, mp.permission_key, dm.slug, dm.name, mp.description, mp.created_at
      ORDER BY dm.slug ASC, mp.name ASC
    `;

    const res = await queryDb(querySql, params).catch(() => ({ rows: [] }));

    // Get unique folders for category filtering
    const foldersRes = await queryDb('SELECT DISTINCT slug as folder FROM developer_modules ORDER BY slug ASC').catch(() => ({ rows: [] }));

    return NextResponse.json({
      success: true,
      records: res.rows,
      permissions: res.rows,
      folders: foldersRes.rows.map((r) => r.folder),
      total: res.rows.length,
    });
  } catch (error) {
    console.error('Error fetching developer permissions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/developer/permissions
 * Register a new system module_permission.
 */
export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, ['roles', 'developers']);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const body = await request.json();
    const name = (body.name || '').trim();
    let slug = (body.slug || body.permission_key || '').trim().toLowerCase();
    const folder = (body.folder || body.category || 'general').trim().toLowerCase();
    const description = (body.description || '').trim();

    if (!name) {
      return NextResponse.json({ success: false, error: 'Permission name is required.' }, { status: 400 });
    }

    if (!slug) {
      slug = slugify(name);
    } else {
      slug = slugify(slug);
    }

    if (!slug) {
      return NextResponse.json({ success: false, error: 'Valid permission slug is required.' }, { status: 400 });
    }

    // Check slug uniqueness in module_permissions
    const checkSlug = await queryDb('SELECT id FROM module_permissions WHERE LOWER(permission_key) = LOWER($1)', [slug]);
    if (checkSlug.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: `Permission with key "${slug}" already exists.` },
        { status: 400 }
      );
    }

    // Ensure the module exists in developer_modules
    let moduleRes = await queryDb('SELECT id FROM developer_modules WHERE LOWER(slug) = LOWER($1) LIMIT 1', [folder]);
    let moduleId = moduleRes.rows[0]?.id;
    if (!moduleId) {
      const moduleInsert = await queryDb(
        'INSERT INTO developer_modules (name, slug, description, is_active) VALUES ($1, $2, $3, TRUE) RETURNING id',
        [folder.charAt(0).toUpperCase() + folder.slice(1), folder, `${folder} module permissions`]
      );
      moduleId = moduleInsert.rows[0].id;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertRes = await client.query(
        `INSERT INTO module_permissions (module_id, name, permission_key, description, created_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         RETURNING id, module_id, name, permission_key AS slug, description, created_at`,
        [moduleId, name, slug, description]
      );
      const newPerm = { ...insertRes.rows[0], folder };

      // Automatically grant newly created permission to the Admin role
      const adminRoleRes = await client.query("SELECT id FROM developer_roles WHERE LOWER(slug) = 'admin' LIMIT 1");
      const adminRoleId = adminRoleRes.rows[0]?.id;
      if (adminRoleId) {
        await client.query(
          `INSERT INTO developer_role_permissions (role_id, permission_id, created_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT DO NOTHING`,
          [adminRoleId, newPerm.id]
        );
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        permission: newPerm,
        message: `Permission "${newPerm.name}" (${newPerm.slug}) created successfully and assigned to Admin role.`,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating permission:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

/**
 * PUT /api/developer/permissions
 * Update an existing permission's name, folder/module, or description.
 */
export async function PUT(request) {
  try {
    const auth = await hasModulePermission(request, ['roles', 'developers']);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const body = await request.json();
    const id = body.id || body.permissionId;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Permission ID is required.' }, { status: 400 });
    }

    const permRes = await queryDb('SELECT * FROM module_permissions WHERE id = $1', [id]);
    if (permRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Permission not found.' }, { status: 404 });
    }

    const currentPerm = permRes.rows[0];
    const name = body.name !== undefined ? body.name.trim() : currentPerm.name;
    const description = body.description !== undefined ? body.description.trim() : currentPerm.description;
    let moduleId = currentPerm.module_id;

    if (body.folder !== undefined) {
      const folder = body.folder.trim().toLowerCase();
      let moduleRes = await queryDb('SELECT id FROM developer_modules WHERE LOWER(slug) = LOWER($1) LIMIT 1', [folder]);
      if (moduleRes.rows.length > 0) {
        moduleId = moduleRes.rows[0].id;
      } else {
        const moduleInsert = await queryDb(
          'INSERT INTO developer_modules (name, slug, description, is_active) VALUES ($1, $2, $3, TRUE) RETURNING id',
          [folder.charAt(0).toUpperCase() + folder.slice(1), folder, `${folder} module permissions`]
        );
        moduleId = moduleInsert.rows[0].id;
      }
    }

    if (!name) {
      return NextResponse.json({ success: false, error: 'Permission name cannot be empty.' }, { status: 400 });
    }

    const updateRes = await queryDb(
      `UPDATE module_permissions
       SET name = $1, module_id = $2, description = $3
       WHERE id = $4
       RETURNING id, module_id, name, permission_key AS slug, description, created_at`,
      [name, moduleId, description, id]
    );

    return NextResponse.json({
      success: true,
      permission: updateRes.rows[0],
      message: `Permission "${name}" updated successfully.`,
    });
  } catch (error) {
    console.error('Error updating permission:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

/**
 * DELETE /api/developer/permissions
 * Delete a permission module.
 */
export async function DELETE(request) {
  try {
    const auth = await hasModulePermission(request, ['roles', 'developers']);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id || body.permissionId;
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Permission ID is required.' }, { status: 400 });
    }

    const permRes = await queryDb('SELECT * FROM module_permissions WHERE id = $1', [id]);
    if (permRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Permission not found.' }, { status: 404 });
    }

    const perm = permRes.rows[0];

    // Protect core critical platform permissions
    const protectedSlugs = ['overview', 'developers', 'settings', 'profile'];
    if (protectedSlugs.includes(perm.permission_key)) {
      return NextResponse.json(
        { success: false, error: `Critical platform permission "${perm.permission_key}" cannot be deleted.` },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM developer_role_permissions WHERE permission_id = $1', [id]);
      await client.query('DELETE FROM module_permissions WHERE id = $1', [id]);
      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: `Permission "${perm.name}" (${perm.permission_key}) deleted successfully.`,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting permission:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
