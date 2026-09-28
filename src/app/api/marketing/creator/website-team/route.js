import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { getCreatorSession, hashPassword } from '@/lib/middleware/creator';

/**
 * API Route: /api/creator/website-team
 * Dedicated to `website_users`, `website_roles`, and `website_permissions` tables.
 */

export async function GET(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const { searchParams } = new URL(request.url);
    const websiteIdParam = searchParams.get('websiteId') || searchParams.get('id');

    if (!websiteIdParam) {
      return NextResponse.json({ success: false, error: 'websiteId query parameter is required' }, { status: 400 });
    }

    const websiteId = Number(websiteIdParam);

    // Verify creator ownership
    if (sessionCreator) {
      const ownerCheck = await queryDb('SELECT id FROM websites WHERE id = $1 AND creator_id = $2 LIMIT 1', [websiteId, sessionCreator.id]);
      if (ownerCheck.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Unauthorized: Website not owned by creator' }, { status: 403 });
      }
    }

    // Parallel fetch: website_users, website_roles, website_modules, website_permissions
    const [usersRes, rolesRes, modulesRes, permissionsRes] = await Promise.all([
      // Users with their assigned roles
      queryDb(
        `SELECT u.id, u.website_id, u.name, u.email, u.phone, u.avatar_url, u.is_active, u.is_verified, u.created_at,
                r.id AS role_id, r.name AS role_name, r.slug AS role_slug
         FROM website_users u
         LEFT JOIN website_user_roles ur ON u.id = ur.user_id
         LEFT JOIN website_roles r ON ur.role_id = r.id
         WHERE u.website_id = $1
         ORDER BY u.id ASC`,
        [websiteId]
      ),
      // Roles
      queryDb(
        `SELECT * FROM website_roles WHERE website_id = $1 ORDER BY id ASC`,
        [websiteId]
      ),
      // Modules
      queryDb(
        `SELECT * FROM website_modules WHERE website_id = $1 AND is_enabled = TRUE ORDER BY id ASC`,
        [websiteId]
      ),
      // Permissions
      queryDb(
        `SELECT p.*, m.name AS module_name, m.slug AS module_slug
         FROM website_permissions p
         JOIN website_modules m ON p.module_id = m.id
         WHERE p.website_id = $1
         ORDER BY m.id ASC, p.id ASC`,
        [websiteId]
      ),
    ]);

    return NextResponse.json({
      success: true,
      users: usersRes.rows,
      roles: rolesRes.rows,
      modules: modulesRes.rows,
      permissions: permissionsRes.rows,
    });
  } catch (error) {
    console.error('Website Team GET API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const body = await request.json();
    const { action } = body;
    const websiteId = Number(body.websiteId || body.website_id);

    if (!websiteId) {
      return NextResponse.json({ success: false, error: 'websiteId is required' }, { status: 400 });
    }

    // Verify creator ownership
    if (sessionCreator) {
      const ownerCheck = await queryDb('SELECT id FROM websites WHERE id = $1 AND creator_id = $2 LIMIT 1', [websiteId, sessionCreator.id]);
      if (ownerCheck.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Unauthorized: Website not owned by creator' }, { status: 403 });
      }
    }

    // 1. Add / Create Website User
    if (action === 'add_user' || action === 'create_user') {
      const { name, email, password, roleId, phone, permissionIds } = body;

      if (!name || !email || !roleId) {
        return NextResponse.json({ success: false, error: 'Name, email, and role are required.' }, { status: 400 });
      }

      const cleanEmail = String(email).trim().toLowerCase();

      // Check if user exists on this website
      const existing = await queryDb(
        'SELECT id FROM website_users WHERE website_id = $1 AND LOWER(email) = $2 LIMIT 1',
        [websiteId, cleanEmail]
      );
      if (existing.rows.length > 0) {
        return NextResponse.json({ success: false, error: 'A user with this email already exists on this website.' }, { status: 409 });
      }

      const userPassword = password || 'User@' + Math.random().toString(36).slice(-6);
      const hashedPassword = await hashPassword(userPassword);

      // Insert website user
      const userRes = await queryDb(
        `INSERT INTO website_users (website_id, name, email, password, phone, is_active, is_verified)
         VALUES ($1, $2, $3, $4, $5, TRUE, TRUE)
         RETURNING id, website_id, name, email, phone, is_active, created_at`,
        [websiteId, name.trim(), cleanEmail, hashedPassword, phone || null]
      );
      const newUser = userRes.rows[0];

      // Assign Role in website_user_roles
      await queryDb(
        `INSERT INTO website_user_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [newUser.id, Number(roleId)]
      );

      // Assign Custom Module Permissions if provided
      if (Array.isArray(permissionIds) && permissionIds.length > 0) {
        for (const pId of permissionIds) {
          await queryDb(
            `INSERT INTO website_user_permissions (user_id, permission_id, is_granted)
             VALUES ($1, $2, TRUE)
             ON CONFLICT (user_id, permission_id) DO NOTHING`,
            [newUser.id, Number(pId)]
          );
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Team user created and role assigned successfully.',
        user: newUser,
      });
    }

    // 2. Update Website User
    if (action === 'update_user') {
      const { userId, roleId, isActive, permissionIds } = body;
      if (!userId) {
        return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
      }

      if (isActive !== undefined) {
        await queryDb('UPDATE website_users SET is_active = $1 WHERE id = $2 AND website_id = $3', [Boolean(isActive), userId, websiteId]);
      }

      if (roleId) {
        await queryDb('DELETE FROM website_user_roles WHERE user_id = $1', [userId]);
        await queryDb('INSERT INTO website_user_roles (user_id, role_id) VALUES ($1, $2)', [userId, Number(roleId)]);
      }

      if (Array.isArray(permissionIds)) {
        await queryDb('DELETE FROM website_user_permissions WHERE user_id = $1', [userId]);
        for (const pId of permissionIds) {
          await queryDb(
            `INSERT INTO website_user_permissions (user_id, permission_id, is_granted) VALUES ($1, $2, TRUE)`,
            [userId, Number(pId)]
          );
        }
      }

      return NextResponse.json({ success: true, message: 'User updated successfully' });
    }

    // 3. Delete Website User
    if (action === 'delete_user') {
      const { userId } = body;
      if (!userId) {
        return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
      }

      await queryDb('DELETE FROM website_users WHERE id = $1 AND website_id = $2', [userId, websiteId]);
      return NextResponse.json({ success: true, message: 'User removed from website team.' });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('Website Team POST API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
