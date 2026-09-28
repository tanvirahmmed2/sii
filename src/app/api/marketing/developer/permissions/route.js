import { NextResponse } from 'next/server';
import { queryDb, pool } from '@/lib/db/pg';
import { hasModulePermission } from '@/lib/middleware/developer';

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
 * List all available system permissions, grouped by folder/category,
 * along with role assignment statistics.
 */
export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'developers');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || searchParams.get('q') || '').trim().toLowerCase();
    const folder = (searchParams.get('folder') || '').trim().toLowerCase();

    let querySql = `
      SELECT p.id, p.name, p.slug, p.folder, p.description, p.created_at, p.updated_at,
             COUNT(DISTINCT rp.role_id)::int AS roles_count,
             COALESCE(
               json_agg(
                 DISTINCT jsonb_build_object('id', r.id, 'name', r.name, 'slug', r.slug)
               ) FILTER (WHERE r.id IS NOT NULL), '[]'
             ) AS assigned_roles
      FROM permissions p
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id
      LEFT JOIN roles r ON rp.role_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      querySql += ` AND (LOWER(p.name) LIKE $${params.length} OR LOWER(p.slug) LIKE $${params.length} OR LOWER(p.description) LIKE $${params.length})`;
    }

    if (folder) {
      params.push(folder);
      querySql += ` AND LOWER(p.folder) = $${params.length}`;
    }

    querySql += `
      GROUP BY p.id, p.name, p.slug, p.folder, p.description, p.created_at, p.updated_at
      ORDER BY COALESCE(p.folder, 'general') ASC, p.name ASC
    `;

    const res = await queryDb(querySql, params);

    // Get unique folders for category filtering
    const foldersRes = await queryDb('SELECT DISTINCT COALESCE(folder, \'general\') as folder FROM permissions ORDER BY folder ASC');

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
 * Register a new system permission module.
 */
export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'developers');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const body = await request.json();
    const name = (body.name || '').trim();
    let slug = (body.slug || '').trim().toLowerCase();
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

    // Check slug uniqueness
    const checkSlug = await queryDb('SELECT id FROM permissions WHERE LOWER(slug) = LOWER($1)', [slug]);
    if (checkSlug.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: `Permission with slug "${slug}" already exists.` },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertRes = await client.query(
        `INSERT INTO permissions (name, slug, folder, description, created_at, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, name, slug, folder, description, created_at, updated_at`,
        [name, slug, folder, description]
      );
      const newPerm = insertRes.rows[0];

      // Automatically grant newly created permission to the Admin role (role_id = 1)
      const adminRoleRes = await client.query("SELECT id FROM roles WHERE slug = 'admin' LIMIT 1");
      const adminRoleId = adminRoleRes.rows[0]?.id || 1;
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id, created_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT DO NOTHING`,
        [adminRoleId, newPerm.id]
      );

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
 * Update an existing permission's name, folder/category, or description.
 */
export async function PUT(request) {
  try {
    const auth = await hasModulePermission(request, 'developers');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const body = await request.json();
    const id = body.id || body.permissionId;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Permission ID is required.' }, { status: 400 });
    }

    const permRes = await queryDb('SELECT * FROM permissions WHERE id = $1', [id]);
    if (permRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Permission not found.' }, { status: 404 });
    }

    const currentPerm = permRes.rows[0];
    const name = body.name !== undefined ? body.name.trim() : currentPerm.name;
    const folder = body.folder !== undefined ? body.folder.trim().toLowerCase() : currentPerm.folder;
    const description = body.description !== undefined ? body.description.trim() : currentPerm.description;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Permission name cannot be empty.' }, { status: 400 });
    }

    const updateRes = await queryDb(
      `UPDATE permissions
       SET name = $1, folder = $2, description = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, name, slug, folder, description, created_at, updated_at`,
      [name, folder, description, id]
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
    const auth = await hasModulePermission(request, 'developers');
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

    const permRes = await queryDb('SELECT * FROM permissions WHERE id = $1', [id]);
    if (permRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Permission not found.' }, { status: 404 });
    }

    const perm = permRes.rows[0];

    // Protect core critical platform permissions
    const protectedSlugs = ['overview', 'developers', 'settings', 'profile'];
    if (protectedSlugs.includes(perm.slug)) {
      return NextResponse.json(
        { success: false, error: `Critical platform permission "${perm.slug}" cannot be deleted.` },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM role_permissions WHERE permission_id = $1', [id]);
      await client.query('DELETE FROM permissions WHERE id = $1', [id]);
      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: `Permission "${perm.name}" (${perm.slug}) deleted successfully.`,
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
