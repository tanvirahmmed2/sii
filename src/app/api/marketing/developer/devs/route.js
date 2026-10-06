import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hashPassword, hasModulePermission } from 'src/lib/middleware/developer';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo';
import { SITE_NAME, getBaseUrl } from 'src/lib/database/secret';

import { generateRandomHex, generateRandomCode } from 'src/lib/utils/random';

async function handleCreateAdmin(d, request) {
  const data = d || {};
  const name = data.name?.trim();
  const email = data.email?.trim().toLowerCase();
  const password = data.password?.trim();
  const roleSlug = (data.role || 'developer').toLowerCase().trim();
  const isActive = data.isActive !== undefined ? Boolean(data.isActive) : (data.is_active !== undefined ? Boolean(data.is_active) : true);

  if (!name || !email || !password) {
    throw new Error('Full Name, Email Address, and Password are required.');
  }

  const existing = await queryDb('SELECT id FROM developers WHERE LOWER(email) = $1 LIMIT 1', [email]);
  if (existing.rows.length > 0) {
    throw new Error('A developer with this email address already exists.');
  }

  const inputRoleId = data.role_id || data.roleId;
  const roleRes = inputRoleId
    ? await queryDb('SELECT id, slug, name FROM developer_roles WHERE id = $1 LIMIT 1', [Number(inputRoleId)])
    : await queryDb('SELECT id, slug, name FROM developer_roles WHERE LOWER(slug) = LOWER($1) LIMIT 1', [roleSlug]);
  const roleId = roleRes.rows[0]?.id || 1;

  const hashedPassword = await hashPassword(password);
  const verificationToken = generateRandomHex(32);
  const verificationCode = generateRandomCode(100000, 999999);

  const insertRes = await queryDb(
    `INSERT INTO developers (
       name, email, password, role_id, is_active, email_verified,
       verification_token, verification_token_expires, two_factor_code, two_factor_expires
     )
     VALUES ($1, $2, $3, $4, $5, FALSE, $6, CURRENT_TIMESTAMP + INTERVAL '24 hours', $7, CURRENT_TIMESTAMP + INTERVAL '24 hours')
     RETURNING id, name, email, role_id, is_active, email_verified, created_at`,
    [name, email, hashedPassword, roleId, isActive, verificationToken, verificationCode]
  );

  const baseUrl = getBaseUrl(request);
  const verifyUrl = `${baseUrl}/developer-auth/verify?token=${verificationToken}&email=${encodeURIComponent(email)}`;

  const newAdmin = {
    ...insertRes.rows[0],
    role: roleRes.rows[0]?.slug || roleSlug,
    role_name: roleRes.rows[0]?.name || 'Developer',
    is_verified: false,
  };

  try {
    await sendEmail({
      to: email,
      subject: `Verify Your Developer Account - ${SITE_NAME}`,
      html: buildStyledEmail({
        title: `${SITE_NAME} Developer Portal`,
        subtitle: 'Account Verification & Activation',
        recipientName: name,
        bodyParagraphs: [
          `An administrator account has been created for you on ${SITE_NAME} with the role of ${newAdmin.role_name}.`,
          'To activate your account and set up access, please click the button below to verify your email address.',
        ],
        actionUrl: verifyUrl,
        actionText: 'Verify & Activate Account',
        footerNote: 'This activation link is valid for 24 hours. If you did not expect this invitation, please ignore this email.',
      }),
      text: `Hello ${name},\n\nAn administrator account was created for you on ${SITE_NAME}.\n\nPlease click the link below to verify your email and activate your account:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
    });
  } catch (mailErr) {
    console.warn('Brevo email sending notice during developer creation:', mailErr.message);
  }

  return newAdmin;
}

export async function GET() {
  try {
    const [devsRes, rolesRes] = await Promise.all([
      queryDb(`
        SELECT d.id, d.name, d.email, d.phone, d.designation, d.avatar_url, d.role_id,
               COALESCE(dr.slug, 'developer') AS role, COALESCE(dr.name, 'Developer') AS role_name,
               d.is_active, COALESCE(d.email_verified, FALSE) AS email_verified, d.last_login_at, d.created_at
        FROM developers d
        LEFT JOIN developer_roles dr ON d.role_id = dr.id
        ORDER BY d.id DESC
      `),
      queryDb(`SELECT id, name, slug, description FROM developer_roles ORDER BY id ASC`).catch(() => ({ rows: [] })),
    ]);

    const records = devsRes.rows.map((r) => ({ ...r, is_verified: Boolean(r.email_verified) }));
    return NextResponse.json({ success: true, table: 'developers', records, roles: rolesRes.rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function checkLastActiveAdminGuard(targetId, willDeactivateOrDelete = true) {
  if (!willDeactivateOrDelete) return null;

  const adminRes = await queryDb(`
    SELECT d.id, d.role_id, COALESCE(dr.slug, 'developer') AS role, d.is_active
    FROM developers d
    LEFT JOIN developer_roles dr ON d.role_id = dr.id
    WHERE d.id = $1 LIMIT 1
  `, [targetId]);
  if (adminRes.rows.length === 0) {
    return { error: 'Administrator not found.', status: 404 };
  }

  const admin = adminRes.rows[0];
  const role = (admin.role || '').toLowerCase();

  if (role === 'admin' && admin.is_active) {
    const countRes = await queryDb(`
      SELECT COUNT(*) as count
      FROM developers d
      JOIN developer_roles dr ON d.role_id = dr.id
      WHERE LOWER(dr.slug) = 'admin' AND d.is_active = TRUE
    `);
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

export async function POST(request) {
  try {
    const devCountRes = await queryDb('SELECT COUNT(*)::int AS count FROM developers');
    const devCount = devCountRes.rows[0]?.count || 0;

    // Only bypass auth if there are ZERO developers in the system (initial bootstrap)
    if (devCount > 0) {
      const authCheck = await hasModulePermission(request, 'developers');
      if (!authCheck.success) {
        return NextResponse.json(
          { success: false, error: authCheck.message },
          { status: authCheck.status || 403 }
        );
      }
    }

    const body = await request.json();
    const data = body.data || body.adminData || body;
    if (devCount === 0) {
      // First user is always admin
      data.role = 'admin';
    }

    const newAdmin = await handleCreateAdmin(data, request);

    return NextResponse.json({
      success: true,
      admin: newAdmin,
      record: newAdmin,
      message: 'Developer account created successfully. A verification link has been sent to the developer email.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(request) {
  try {
    const authCheck = await hasModulePermission(request, 'developers');
    if (!authCheck.success) {
      return NextResponse.json(
        { success: false, error: authCheck.message },
        { status: authCheck.status || 403 }
      );
    }

    const body = await request.json();
    const targetId = body.id || body.adminId;
    if (!targetId) {
      return NextResponse.json({ success: false, error: 'Target admin ID is required.' }, { status: 400 });
    }

    const action = body.action;

    if (action === 'change_role' || body.role) {
      const rawRole = body.role || body.newRole;
      const cleanRole = (rawRole || '').toLowerCase().trim();

      const roleRes = await queryDb('SELECT id, slug, name FROM developer_roles WHERE LOWER(slug) = LOWER($1) LIMIT 1', [cleanRole]);
      if (roleRes.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: `Invalid role "${rawRole}". Role not found in database.` },
          { status: 400 }
        );
      }
      const roleRow = roleRes.rows[0];

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
        return NextResponse.json({ success: false, error: 'Developer not found.' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        record: { ...res.rows[0], is_verified: true, role: roleRow.slug, role_name: roleRow.name },
        message: `Role updated to ${cleanRole}.`,
      });
    }

    if (action === 'toggle_status' || body.is_active !== undefined) {
      let nextActive = body.is_active;
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

    // Generic Update
    const data = { ...(body.data || body) };
    delete data.id;
    delete data.adminId;
    delete data.action;

    if (data.role) {
      const cleanRole = data.role.toLowerCase().trim();
      const roleRes = await queryDb('SELECT id FROM developer_roles WHERE LOWER(slug) = LOWER($1) LIMIT 1', [cleanRole]);
      if (roleRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: `Invalid role "${data.role}". Role not found in database.` }, { status: 400 });
      }
      data.role_id = roleRes.rows[0].id;
      delete data.role;
    }

    if (data.password && data.password.trim()) {
      data.password = await hashPassword(data.password.trim());
    } else {
      delete data.password;
    }

    const keys = Object.keys(data);
    if (keys.length === 0) return NextResponse.json({ success: true });

    const values = keys.map((k) => data[k]);
    const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`);
    values.push(targetId);

    const res = await queryDb(
      `UPDATE developers SET ${setClauses.join(', ')} WHERE id = $${values.length} 
       RETURNING id, name, email, role_id, is_active, created_at`,
      values
    );

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
      message: 'Developer account updated successfully.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request) {
  try {
    const authCheck = await hasModulePermission(request, 'developers');
    if (!authCheck.success) {
      return NextResponse.json(
        { success: false, error: authCheck.message },
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
