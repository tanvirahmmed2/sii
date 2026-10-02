import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { getAuthenticatedUser, hasModulePermission, hashPassword } from 'src/lib/middleware/developer';

async function checkLastActiveAdminGuard(targetId, willDeactivateOrDelete = true) {
  if (!willDeactivateOrDelete) return null;

  const adminRes = await queryDb(
    `SELECT d.id, d.role_id, COALESCE(dr.slug, 'developer') AS role, d.is_active 
     FROM developers d 
     LEFT JOIN developer_roles dr ON d.role_id = dr.id 
     WHERE d.id = $1 LIMIT 1`,
    [targetId]
  );
  if (adminRes.rows.length === 0) {
    return { error: 'Administrator not found.', status: 404 };
  }

  const admin = adminRes.rows[0];
  const role = (admin.role || '').toLowerCase();

  // If this account has the 'admin' role and is active, ensure another active 'admin' exists
  if (role === 'admin' && admin.is_active) {
    const countRes = await queryDb(
      `SELECT COUNT(*) as count 
       FROM developers d 
       JOIN developer_roles dr ON d.role_id = dr.id 
       WHERE LOWER(dr.slug) = 'admin' AND d.is_active = TRUE`
    );
    const activeAdminCount = parseInt(countRes.rows[0].count, 10);
    if (activeAdminCount <= 1) {
      return {
        error: 'Operation rejected: At least one active Super Admin account must remain in the platform.',
        status: 400,
      };
    }
  }

  return null;
}

export async function GET(request) {
  try {
    const auth = await getAuthenticatedUser(request);
    const [devsRes, rolesRes] = await Promise.all([
      queryDb(`
        SELECT d.id, d.name, d.email, d.phone, d.designation, d.avatar_url, d.role_id,
               COALESCE(dr.slug, 'developer') AS role, COALESCE(dr.name, 'Developer') AS role_name,
               d.is_active, COALESCE(d.email_verified, FALSE) AS email_verified, d.last_login_at, d.created_at
        FROM developers d
        LEFT JOIN developer_roles dr ON d.role_id = dr.id
        ORDER BY d.id DESC
      `),
      queryDb(`
        SELECT id, name, slug, description
        FROM developer_roles
        ORDER BY id ASC
      `).catch(() => ({ rows: [] })),
    ]);

    const records = devsRes.rows.map((r) => ({ ...r, is_verified: Boolean(r.email_verified) }));

    return NextResponse.json({
      success: true,
      table: 'developers',
      records,
      roles: rolesRes.rows,
      currentUser: auth
        ? {
            id: auth.id,
            name: auth.name,
            email: auth.email,
            role: auth.role,
            roleName: auth.role_name,
            permissions: auth.permissions || [],
            isAdmin: Boolean(auth.permissions?.includes('developers')),
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

    // --- CHANGE / UPDATE ROLE ---
    if (action === 'change_role' || action === 'update_role') {
      const rawRole = body.role || body.newRole;
      const cleanRole = (rawRole || '').toLowerCase().trim();

      const roleRes = await queryDb('SELECT id, slug, name FROM developer_roles WHERE LOWER(slug) = LOWER($1) LIMIT 1', [cleanRole]);
      if (roleRes.rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid role "${rawRole}". Role not found in database.`,
          },
          { status: 400 }
        );
      }
      const roleRow = roleRes.rows[0];

      // If moving away from 'admin', ensure at least one other active admin remains
      if (cleanRole !== 'admin') {
        const guard = await checkLastActiveAdminGuard(targetId, true);
        if (guard) {
          return NextResponse.json({ success: false, error: guard.error }, { status: guard.status });
        }
      }

      const res = await queryDb(
        `UPDATE developers SET role_id = $1 WHERE id = $2 
         RETURNING id, name, email, role_id, is_active, created_at`,
        [roleRow.id, targetId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Developer account not found.' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        record: { ...res.rows[0], is_verified: true, role: roleRow.slug, role_name: roleRow.name },
        message: `Role updated to ${cleanRole}.`,
      });
    }

    // --- TOGGLE / UPDATE ACTIVE STATUS ---
    if (action === 'toggle_status' || action === 'update_status') {
      let nextActive = is_active;
      if (nextActive === undefined) {
        const currentRes = await queryDb('SELECT is_active FROM developers WHERE id = $1 LIMIT 1', [targetId]);
        if (currentRes.rows.length === 0) {
          return NextResponse.json({ success: false, error: 'Developer not found.' }, { status: 404 });
        }
        nextActive = !currentRes.rows[0].is_active;
      }

      // If turning inactive, check guard
      if (nextActive === false) {
        const guard = await checkLastActiveAdminGuard(targetId, true);
        if (guard) {
          return NextResponse.json({ success: false, error: guard.error }, { status: guard.status });
        }
      }

      const res = await queryDb(
        `UPDATE developers SET is_active = $1 WHERE id = $2 
         RETURNING id, name, email, role_id, is_active, created_at`,
        [Boolean(nextActive), targetId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Developer not found.' }, { status: 404 });
      }

      const fullRes = await queryDb(
        `SELECT d.id, d.name, d.email, d.phone, d.designation, d.avatar_url, d.role_id,
                COALESCE(dr.slug, 'developer') AS role, COALESCE(dr.name, 'Developer') AS role_name,
                d.is_active, d.created_at
         FROM developers d
         LEFT JOIN developer_roles dr ON d.role_id = dr.id
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

    // --- GENERIC UPDATE ---
    const updateData = { ...body };
    delete updateData.action;
    delete updateData.id;
    delete updateData.adminId;

    if (updateData.role) {
      const cleanRole = updateData.role.toLowerCase().trim();
      const roleRes = await queryDb('SELECT id FROM developer_roles WHERE LOWER(slug) = LOWER($1) LIMIT 1', [cleanRole]);
      if (roleRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: `Invalid role "${updateData.role}".` }, { status: 400 });
      }
      updateData.role_id = roleRes.rows[0].id;
      delete updateData.role;
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
       RETURNING id, name, email, role_id, is_active, created_at`,
      values
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Developer not found.' }, { status: 404 });
    }

    const fullRes = await queryDb(
      `SELECT d.id, d.name, d.email, d.phone, d.designation, d.avatar_url, d.role_id,
              COALESCE(dr.slug, 'developer') AS role, COALESCE(dr.name, 'Developer') AS role_name,
              d.is_active, d.created_at
       FROM developers d
       LEFT JOIN developer_roles dr ON d.role_id = dr.id
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
