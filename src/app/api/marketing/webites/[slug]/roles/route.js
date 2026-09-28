import { NextResponse } from 'next/server';
import { resolveWebsiteFromRequest, hashPassword } from '@/lib/middleware/user';
import { queryDb } from '@/lib/db/pg';

export async function GET(request, context) {
  try {
    const params = await context.params;
    const slug = params.slug;

    const website = await resolveWebsiteFromRequest(request, slug);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
    }

    const websiteId = website.id;

    // Fetch roles, modules, permissions, and users
    const [rolesRes, modulesRes, permsRes, usersRes] = await Promise.all([
      queryDb(`
        SELECT r.*, COUNT(rp.permission_id)::int AS permissions_count
        FROM website_roles r
        LEFT JOIN website_role_permissions rp ON r.id = rp.role_id
        WHERE r.website_id = $1
        GROUP BY r.id
        ORDER BY r.is_system DESC, r.id ASC
      `, [websiteId]),
      queryDb('SELECT * FROM website_modules WHERE website_id = $1 ORDER BY id ASC', [websiteId]),
      queryDb('SELECT * FROM website_permissions WHERE website_id = $1 ORDER BY module_id ASC, id ASC', [websiteId]),
      queryDb(`
        SELECT u.id, u.name, u.email, u.phone, u.avatar_url, u.is_active, u.created_at,
               COALESCE(
                 json_agg(
                   json_build_object('id', r.id, 'name', r.name, 'slug', r.slug)
                 ) FILTER (WHERE r.id IS NOT NULL), '[]'
               ) AS roles
        FROM website_users u
        LEFT JOIN website_user_roles ur ON u.id = ur.user_id
        LEFT JOIN website_roles r ON ur.role_id = r.id
        WHERE u.website_id = $1
        GROUP BY u.id
        ORDER BY u.id DESC
      `, [websiteId]),
    ]);

    return NextResponse.json({
      success: true,
      roles: rolesRes.rows,
      modules: modulesRes.rows,
      permissions: permsRes.rows,
      users: usersRes.rows,
    });
  } catch (error) {
    console.error('Website roles GET API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const params = await context.params;
    const slug = params.slug;

    const website = await resolveWebsiteFromRequest(request, slug);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
    }

    const websiteId = website.id;
    const body = await request.json();
    const { action } = body;

    // 1. Create Custom Role with module permissions
    if (action === 'create_role') {
      const name = (body.name || '').trim();
      const roleSlug = (body.slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-')).trim();
      const description = (body.description || '').trim();
      const permissionIds = Array.isArray(body.permissionIds) ? body.permissionIds : [];

      if (!name || !roleSlug) {
        return NextResponse.json({ success: false, error: 'Role name and slug are required.' }, { status: 400 });
      }

      // Insert role
      const rRes = await queryDb(`
        INSERT INTO website_roles (website_id, name, slug, description, is_system)
        VALUES ($1, $2, $3, $4, FALSE)
        ON CONFLICT (website_id, slug) DO UPDATE
        SET name = EXCLUDED.name, description = EXCLUDED.description
        RETURNING *
      `, [websiteId, name, roleSlug, description]);

      const role = rRes.rows[0];

      // Assign selected permissions
      if (permissionIds.length > 0) {
        for (const pId of permissionIds) {
          await queryDb(`
            INSERT INTO website_role_permissions (role_id, permission_id)
            VALUES ($1, $2)
            ON CONFLICT (role_id, permission_id) DO NOTHING
          `, [role.id, pId]);
        }
      }

      return NextResponse.json({ success: true, role });
    }

    // 2. Delete Custom Role
    if (action === 'delete_role') {
      const roleId = Number(body.roleId);
      if (!roleId) {
        return NextResponse.json({ success: false, error: 'Role ID is required.' }, { status: 400 });
      }

      // Do not allow deleting system roles
      const roleCheck = await queryDb('SELECT is_system FROM website_roles WHERE id = $1 AND website_id = $2', [roleId, websiteId]);
      if (roleCheck.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Role not found.' }, { status: 404 });
      }
      if (roleCheck.rows[0].is_system) {
        return NextResponse.json({ success: false, error: 'System roles cannot be deleted.' }, { status: 403 });
      }

      await queryDb('DELETE FROM website_roles WHERE id = $1 AND website_id = $2', [roleId, websiteId]);
      return NextResponse.json({ success: true, deletedRoleId: roleId });
    }

    // 3. Create Team User & Assign Multiple Roles
    if (action === 'create_user') {
      const name = (body.name || '').trim();
      const email = (body.email || '').trim().toLowerCase();
      const password = body.password || 'password123';
      const roleIds = Array.isArray(body.roleIds) ? body.roleIds : [];

      if (!name || !email) {
        return NextResponse.json({ success: false, error: 'User name and email are required.' }, { status: 400 });
      }

      const hashedPassword = await hashPassword(password);

      const uRes = await queryDb(`
        INSERT INTO website_users (website_id, name, email, password, is_active)
        VALUES ($1, $2, $3, $4, TRUE)
        ON CONFLICT (website_id, email) DO UPDATE
        SET name = EXCLUDED.name, is_active = TRUE
        RETURNING id, name, email, is_active
      `, [websiteId, name, email, hashedPassword]);

      const user = uRes.rows[0];

      // Assign multiple roles
      if (roleIds.length > 0) {
        for (const rId of roleIds) {
          await queryDb(`
            INSERT INTO website_user_roles (user_id, role_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, role_id) DO NOTHING
          `, [user.id, rId]);
        }
      }

      return NextResponse.json({ success: true, user });
    }

    // 4. Update User Role Assignments
    if (action === 'update_user_roles') {
      const userId = Number(body.userId);
      const roleIds = Array.isArray(body.roleIds) ? body.roleIds : [];

      if (!userId) {
        return NextResponse.json({ success: false, error: 'User ID is required.' }, { status: 400 });
      }

      await queryDb('DELETE FROM website_user_roles WHERE user_id = $1', [userId]);

      for (const rId of roleIds) {
        await queryDb(`
          INSERT INTO website_user_roles (user_id, role_id)
          VALUES ($1, $2)
          ON CONFLICT (user_id, role_id) DO NOTHING
        `, [userId, rId]);
      }

      return NextResponse.json({ success: true, userId, updatedRoleIds: roleIds });
    }

    return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('Website roles POST API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
