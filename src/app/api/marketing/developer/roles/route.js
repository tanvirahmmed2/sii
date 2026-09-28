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
 * GET /api/developer/roles
 * Returns all roles with their assigned permissions and developer counts,
 * plus all available system permissions.
 * Optional query param: ?id=<roleId> for a single role.
 */
export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'developers');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('id');

    if (roleId) {
      const roleRes = await queryDb(
        `SELECT r.id, r.name, r.slug, r.description, r.is_system, r.created_at, r.updated_at,
                COUNT(DISTINCT d.id)::int AS developers_count,
                COUNT(DISTINCT rp.permission_id)::int AS permissions_count,
                COALESCE(
                  json_agg(
                    DISTINCT jsonb_build_object(
                      'id', p.id,
                      'name', p.name,
                      'slug', p.slug,
                      'folder', p.folder,
                      'description', p.description
                    )
                  ) FILTER (WHERE p.id IS NOT NULL), '[]'
                ) AS permissions
         FROM roles r
         LEFT JOIN role_permissions rp ON r.id = rp.role_id
         LEFT JOIN permissions p ON rp.permission_id = p.id
         LEFT JOIN developers d ON r.id = d.role_id
         WHERE r.id = $1
         GROUP BY r.id`,
        [roleId]
      );

      if (roleRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        role: roleRes.rows[0],
      });
    }

    // Fetch all roles with aggregated permission counts and developer counts
    const rolesRes = await queryDb(`
      SELECT r.id, r.name, r.slug, r.description, r.is_system, r.created_at, r.updated_at,
             COUNT(DISTINCT d.id)::int AS developers_count,
             COUNT(DISTINCT rp.permission_id)::int AS permissions_count,
             COALESCE(
               array_agg(DISTINCT p.slug) FILTER (WHERE p.slug IS NOT NULL), ARRAY[]::text[]
             ) AS permission_slugs,
             COALESCE(
               array_agg(DISTINCT rp.permission_id) FILTER (WHERE rp.permission_id IS NOT NULL), ARRAY[]::int[]
             ) AS permission_ids
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      LEFT JOIN developers d ON r.id = d.role_id
      GROUP BY r.id, r.name, r.slug, r.description, r.is_system, r.created_at, r.updated_at
      ORDER BY r.id ASC
    `);

    // Fetch all available system permissions
    const permsRes = await queryDb(`
      SELECT p.id, p.name, p.slug, p.folder, p.description, p.created_at,
             COUNT(DISTINCT rp.role_id)::int AS roles_count
      FROM permissions p
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id
      GROUP BY p.id, p.name, p.slug, p.folder, p.description, p.created_at
      ORDER BY COALESCE(p.folder, 'general') ASC, p.name ASC
    `);

    return NextResponse.json({
      success: true,
      roles: rolesRes.rows,
      permissions: permsRes.rows,
      total_roles: rolesRes.rows.length,
      total_permissions: permsRes.rows.length,
    });
  } catch (error) {
    console.error('Error fetching developer roles:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/developer/roles
 * Create a new platform role with optional initial permissions assignment.
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
    const description = (body.description || '').trim();
    const permissions = Array.isArray(body.permissions) ? body.permissions : [];

    if (!name) {
      return NextResponse.json({ success: false, error: 'Role name is required.' }, { status: 400 });
    }

    if (!slug) {
      slug = slugify(name);
    } else {
      slug = slugify(slug);
    }

    if (!slug) {
      return NextResponse.json({ success: false, error: 'A valid role slug is required.' }, { status: 400 });
    }

    // Check slug uniqueness
    const checkSlug = await queryDb('SELECT id FROM roles WHERE LOWER(slug) = LOWER($1)', [slug]);
    if (checkSlug.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: `Role with slug "${slug}" already exists. Please choose another name or slug.` },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const roleInsert = await client.query(
        `INSERT INTO roles (name, slug, description, is_system, created_at, updated_at)
         VALUES ($1, $2, $3, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, name, slug, description, is_system, created_at, updated_at`,
        [name, slug, description]
      );
      const newRole = roleInsert.rows[0];

      // Assign initial permissions if specified
      if (permissions.length > 0) {
        // Find permission IDs from slugs or IDs
        const permRows = await client.query(
          `SELECT id, slug FROM permissions 
           WHERE id = ANY($1::int[]) OR slug = ANY($2::text[])`,
          [
            permissions.filter((p) => typeof p === 'number' || !isNaN(Number(p))).map(Number),
            permissions.map(String),
          ]
        );

        for (const p of permRows.rows) {
          await client.query(
            `INSERT INTO role_permissions (role_id, permission_id, created_at)
             VALUES ($1, $2, CURRENT_TIMESTAMP)
             ON CONFLICT DO NOTHING`,
            [newRole.id, p.id]
          );
        }
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        role: newRole,
        message: `Role "${newRole.name}" created successfully.`,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating developer role:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

/**
 * PUT /api/developer/roles
 * Update an existing role's name, description, and assigned permissions.
 */
export async function PUT(request) {
  try {
    const auth = await hasModulePermission(request, 'developers');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const body = await request.json();
    const id = body.id || body.roleId;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Role ID is required.' }, { status: 400 });
    }

    const roleRes = await queryDb('SELECT * FROM roles WHERE id = $1', [id]);
    if (roleRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Role not found.' }, { status: 404 });
    }

    const currentRole = roleRes.rows[0];
    const name = body.name !== undefined ? body.name.trim() : currentRole.name;
    const description = body.description !== undefined ? body.description.trim() : currentRole.description;
    let slug = currentRole.slug;

    // Only allow slug changes for custom (non-system) roles
    if (!currentRole.is_system && body.slug !== undefined) {
      const cleanSlug = slugify(body.slug);
      if (cleanSlug && cleanSlug !== currentRole.slug) {
        const checkSlug = await queryDb('SELECT id FROM roles WHERE LOWER(slug) = LOWER($1) AND id != $2', [cleanSlug, id]);
        if (checkSlug.rows.length > 0) {
          return NextResponse.json(
            { success: false, error: `Slug "${cleanSlug}" is already taken by another role.` },
            { status: 400 }
          );
        }
        slug = cleanSlug;
      }
    }

    if (!name) {
      return NextResponse.json({ success: false, error: 'Role name cannot be empty.' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE roles 
         SET name = $1, slug = $2, description = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [name, slug, description, id]
      );

      // If permissions array is provided in the request body, synchronize role_permissions
      if (Array.isArray(body.permissions)) {
        // Resolve permission IDs from IDs or slugs
        const permRows = await client.query(
          `SELECT id, slug FROM permissions 
           WHERE id = ANY($1::int[]) OR slug = ANY($2::text[])`,
          [
            body.permissions.filter((p) => typeof p === 'number' || !isNaN(Number(p))).map(Number),
            body.permissions.map(String),
          ]
        );

        const targetPermIds = permRows.rows.map((p) => p.id);

        // Delete permissions not in target list
        await client.query(
          `DELETE FROM role_permissions WHERE role_id = $1 AND permission_id != ALL($2::int[])`,
          [id, targetPermIds.length > 0 ? targetPermIds : [-1]]
        );

        // Insert new permissions
        for (const pId of targetPermIds) {
          await client.query(
            `INSERT INTO role_permissions (role_id, permission_id, created_at)
             VALUES ($1, $2, CURRENT_TIMESTAMP)
             ON CONFLICT DO NOTHING`,
            [id, pId]
          );
        }
      }

      await client.query('COMMIT');

      const updatedRes = await queryDb(
        `SELECT r.*, 
                COUNT(DISTINCT rp.permission_id)::int AS permissions_count,
                COUNT(DISTINCT d.id)::int AS developers_count,
                COALESCE(array_agg(DISTINCT p.slug) FILTER (WHERE p.slug IS NOT NULL), ARRAY[]::text[]) AS permission_slugs
         FROM roles r
         LEFT JOIN role_permissions rp ON r.id = rp.role_id
         LEFT JOIN permissions p ON rp.permission_id = p.id
         LEFT JOIN developers d ON r.id = d.role_id
         WHERE r.id = $1
         GROUP BY r.id`,
        [id]
      );

      return NextResponse.json({
        success: true,
        role: updatedRes.rows[0],
        message: `Role "${name}" updated successfully.`,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating developer role:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

/**
 * DELETE /api/developer/roles
 * Delete a custom role (system roles and roles with active developers are protected).
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
      id = body.id || body.roleId;
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Role ID is required.' }, { status: 400 });
    }

    const roleRes = await queryDb('SELECT * FROM roles WHERE id = $1', [id]);
    if (roleRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Role not found.' }, { status: 404 });
    }

    const role = roleRes.rows[0];

    // System roles protection
    if (role.is_system || role.slug === 'admin') {
      return NextResponse.json(
        { success: false, error: `System role "${role.name}" cannot be deleted.` },
        { status: 400 }
      );
    }

    // Check if any developer accounts are assigned to this role
    const devRes = await queryDb('SELECT COUNT(*)::int AS count FROM developers WHERE role_id = $1', [id]);
    const assignedCount = devRes.rows[0]?.count || 0;
    if (assignedCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete role "${role.name}": it is currently assigned to ${assignedCount} developer account(s). Please reassign them to another role first.`,
        },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
      await client.query('DELETE FROM roles WHERE id = $1', [id]);
      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: `Role "${role.name}" deleted successfully.`,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting developer role:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
