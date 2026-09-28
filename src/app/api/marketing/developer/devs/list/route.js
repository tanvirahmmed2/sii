import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { getAuthenticatedUser, hasModulePermission, hashPassword } from '@/lib/middleware/developer';

async function checkLastActiveAdminGuard(targetId, willDeactivateOrDelete = true) {
  if (!willDeactivateOrDelete) return null;

  const adminRes = await queryDb(
    `SELECT d.id, d.role_id, COALESCE(r.slug, 'developer') AS role, d.is_active 
     FROM developers d 
     LEFT JOIN roles r ON d.role_id = r.id 
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
       JOIN roles r ON d.role_id = r.id 
       WHERE LOWER(r.slug) = 'admin' AND d.is_active = TRUE`
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
    const [devsRes, rolesRes] = await Promise.all([
      queryDb(`
        SELECT d.id, d.name, d.email, d.role_id, COALESCE(r.slug, 'developer') AS role, COALESCE(r.name, 'Developer') AS role_name,
               d.is_active, d.is_verified, d.last_login_at, d.created_at
        FROM developers d
        LEFT JOIN roles r ON d.role_id = r.id
        ORDER BY d.id DESC
      `),
      queryDb(`
        SELECT id, name, slug, description, is_system
        FROM roles
        ORDER BY id ASC
      `),
    ]);

    return NextResponse.json({
      success: true,
      table: 'developers',
      records: devsRes.rows,
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

      const roleRes = await queryDb('SELECT id, slug, name FROM roles WHERE LOWER(slug) = LOWER($1) LIMIT 1', [cleanRole]);
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
         RETURNING id, name, email, role_id, is_active, is_verified, created_at`,
        [roleRow.id, targetId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Developer account not found.' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        record: { ...res.rows[0], role: roleRow.slug, role_name: roleRow.name },
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
         RETURNING id, name, email, role_id, is_active, is_verified, created_at`,
        [Boolean(nextActive), targetId]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Developer not found.' }, { status: 404 });
      }

      const fullRes = await queryDb(
        `SELECT d.id, d.name, d.email, d.role_id, COALESCE(r.slug, 'developer') AS role, COALESCE(r.name, 'Developer') AS role_name,
                d.is_active, d.is_verified, d.created_at
         FROM developers d
         LEFT JOIN roles r ON d.role_id = r.id
         WHERE d.id = $1 LIMIT 1`,
        [targetId]
      );

      return NextResponse.json({
        success: true,
        record: fullRes.rows[0] || res.rows[0],
        message: `Status updated to ${nextActive ? 'Active' : 'Inactive'}.`,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action for POST.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const authCheck = await hasModulePermission(request, 'developers');
    if (!authCheck.success) {
      return NextResponse.json(
        { success: false, error: authCheck.message || 'Forbidden: developers permission required.' },
        { status: authCheck.status || 403 }
      );
    }

    const body = await request.json();
    const targetId = body.id || body.adminId;
    if (!targetId) {
      return NextResponse.json({ success: false, error: 'Admin ID is required.' }, { status: 400 });
    }

    const data = { ...(body.data || body) };

    // Validate role if changing
    if (data.role || data.role_id || data.roleId) {
      const inputRoleId = data.role_id || data.roleId;
      const roleRes = inputRoleId
        ? await queryDb('SELECT id, slug, name FROM roles WHERE id = $1 LIMIT 1', [Number(inputRoleId)])
        : await queryDb('SELECT id, slug, name FROM roles WHERE LOWER(slug) = LOWER($1) LIMIT 1', [data.role.toLowerCase().trim()]);

      if (roleRes.rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid role. Role not found in database.`,
          },
          { status: 400 }
        );
      }
      const roleRow = roleRes.rows[0];
      if (roleRow.slug !== 'admin') {
        const guard = await checkLastActiveAdminGuard(targetId, true);
        if (guard) {
          return NextResponse.json({ success: false, error: guard.error }, { status: guard.status });
        }
      }
      data.role_id = roleRow.id;
      delete data.role;
      delete data.roleId;
    }

    if (data.is_active === false || data.isActive === false) {
      const guard = await checkLastActiveAdminGuard(targetId, true);
      if (guard) {
        return NextResponse.json({ success: false, error: guard.error }, { status: guard.status });
      }
    }

    // Handle optional password update
    if (data.password && data.password.trim()) {
      data.password = await hashPassword(data.password.trim());
    } else {
      delete data.password;
    }

    delete data.id;
    delete data.adminId;
    delete data.action;

    const keys = Object.keys(data);
    if (keys.length === 0) return NextResponse.json({ success: true });

    const values = keys.map((k) => data[k]);
    const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`);
    values.push(targetId);

    const res = await queryDb(
      `UPDATE developers SET ${setClauses.join(', ')} WHERE id = $${values.length} 
       RETURNING id, name, email, role_id, is_active, is_verified, created_at`,
      values
    );

    const fullRes = await queryDb(
      `SELECT d.id, d.name, d.email, d.role_id, COALESCE(r.slug, 'developer') AS role, COALESCE(r.name, 'Developer') AS role_name,
              d.is_active, d.is_verified, d.created_at
       FROM developers d
       LEFT JOIN roles r ON d.role_id = r.id
       WHERE d.id = $1 LIMIT 1`,
      [targetId]
    );

    return NextResponse.json({
      success: true,
      record: fullRes.rows[0] || res.rows[0],
      message: 'Developer account updated successfully.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const authCheck = await hasModulePermission(request, 'developers');
    if (!authCheck.success) {
      return NextResponse.json(
        { success: false, error: authCheck.message || 'Forbidden: developers permission required.' },
        { status: authCheck.status || 403 }
      );
    }

    const body = await request.json();
    const { id, is_active, role, role_id, roleId } = body;
    const targetId = id || body.adminId;

    if (!targetId) {
      return NextResponse.json({ success: false, error: 'Admin ID is required.' }, { status: 400 });
    }

    // Role update via PATCH
    if (role !== undefined || role_id !== undefined || roleId !== undefined) {
      const inputId = role_id || roleId;
      const roleRes = inputId
        ? await queryDb('SELECT id, slug, name FROM roles WHERE id = $1 LIMIT 1', [Number(inputId)])
        : await queryDb('SELECT id, slug, name FROM roles WHERE LOWER(slug) = LOWER($1) LIMIT 1', [(role || '').toLowerCase().trim()]);

      if (roleRes.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: `Invalid role. Role not found in database.` },
          { status: 400 }
        );
      }
      const roleRow = roleRes.rows[0];

      if (roleRow.slug !== 'admin') {
        const guard = await checkLastActiveAdminGuard(targetId, true);
        if (guard) {
          return NextResponse.json({ success: false, error: guard.error }, { status: guard.status });
        }
      }

      const res = await queryDb(
        `UPDATE developers SET role_id = $1 WHERE id = $2 
         RETURNING id, name, email, role_id, is_active, is_verified, created_at`,
        [roleRow.id, targetId]
      );
      return NextResponse.json({
        success: true,
        record: { ...res.rows[0], role: roleRow.slug, role_name: roleRow.name },
        message: `Role updated to ${roleRow.name}.`,
      });
    }

    // Active toggle via PATCH
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
       RETURNING id, name, email, role_id, is_active, is_verified, created_at`,
      [Boolean(nextActive), targetId]
    );

    const fullRes = await queryDb(
      `SELECT d.id, d.name, d.email, d.role_id, COALESCE(r.slug, 'developer') AS role, COALESCE(r.name, 'Developer') AS role_name,
              d.is_active, d.is_verified, d.created_at
       FROM developers d
       LEFT JOIN roles r ON d.role_id = r.id
       WHERE d.id = $1 LIMIT 1`,
      [targetId]
    );

    return NextResponse.json({
      success: true,
      record: fullRes.rows[0] || res.rows[0],
      message: `Status updated to ${nextActive ? 'Active' : 'Inactive'}.`,
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
    let id = searchParams.get('id');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id || body.adminId;
    }
    if (!id) {
      return NextResponse.json({ success: false, error: 'Admin ID is required.' }, { status: 400 });
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
