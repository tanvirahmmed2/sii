import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { getCreatorSession, hashPassword } from 'src/lib/middleware/creator';
import { revokeAllStaffSessions } from 'src/lib/middleware/staff';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo';
import { getBaseUrl } from 'src/lib/database/secret';
import { generateToken } from 'src/lib/utils/random';

/**
 * Validates that the website belongs to the creator
 */
async function verifyWebsiteOwnership(websiteId, sessionCreator, creatorIdParam) {
  const cId = sessionCreator?.id || creatorIdParam;
  if (!cId || !websiteId) return null;

  const res = await queryDb(
    `SELECT id, creator_id, name, subdomain, custom_domain, primary_color 
     FROM websites 
     WHERE id = $1 AND creator_id = $2 LIMIT 1`,
    [websiteId, cId]
  );
  return res.rows[0] || null;
}

// GET: Fetch staff roster, module permissions matrix, active session counts, and modules
export async function GET(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const { searchParams } = new URL(request.url);
    const websiteId = searchParams.get('websiteId') || searchParams.get('id');
    const creatorId = searchParams.get('creatorId') || sessionCreator?.id;

    if (!websiteId) {
      return NextResponse.json({ success: false, error: 'websiteId is required.' }, { status: 400 });
    }

    const website = await verifyWebsiteOwnership(websiteId, sessionCreator, creatorId);
    if (!website && !sessionCreator?.isDeveloper) {
      return NextResponse.json({ success: false, error: 'Unauthorized or website not found.' }, { status: 403 });
    }

    // 1. Fetch staff members
    const staffsRes = await queryDb(
      `SELECT ws.id, ws.website_id, ws.name, ws.email, ws.number, ws.address,
              ws.is_active, ws.is_registered, ws.is_two_factor_enabled, ws.grade_id,
              ws.date_of_birth, ws.gender, ws.nid_number, ws.bio, ws.username,
              ws.created_at, ws.updated_at,
              gp.name AS grade_name, gp.basic_salary, gp.allowance
       FROM website_staffs ws
       LEFT JOIN website_staff_pay_scale gp ON gp.id = ws.grade_id
       WHERE ws.website_id = $1
       ORDER BY ws.id DESC`,
      [websiteId]
    );

    // 2. Fetch permissions for all staffs of this website
    const permsRes = await queryDb(
      `SELECT wmp.staff_id, wm.slug AS module_slug, wmp.website_module_id,
              wmp.can_view, wmp.can_create, wmp.can_edit, wmp.can_delete,
              wm.name AS module_name, wm.icon AS module_icon
       FROM website_modules_permissions wmp
       JOIN website_modules wm ON wm.id = wmp.website_module_id
       WHERE wmp.website_id = $1`,
      [websiteId]
    );

    // 3. Fetch active sessions counts
    const sessionsRes = await queryDb(
      `SELECT staff_id, COUNT(*)::int AS active_sessions
       FROM staff_sessions
       WHERE website_id = $1 AND is_active = TRUE AND expires_at > CURRENT_TIMESTAMP
       GROUP BY staff_id`,
      [websiteId]
    );

    const sessionCountMap = {};
    for (const row of sessionsRes.rows) {
      sessionCountMap[row.staff_id] = row.active_sessions;
    }

    const permsMap = {};
    for (const p of permsRes.rows) {
      if (!permsMap[p.staff_id]) permsMap[p.staff_id] = {};
      permsMap[p.staff_id][p.module_slug] = {
        can_view: Boolean(p.can_view),
        can_create: Boolean(p.can_create),
        can_edit: Boolean(p.can_edit),
        can_delete: Boolean(p.can_delete),
        module_name: p.module_name,
        website_module_id: p.website_module_id,
        module_icon: p.module_icon,
      };
    }

    const staffs = staffsRes.rows.map((s) => ({
      ...s,
      permissions: permsMap[s.id] || {},
      activeSessions: sessionCountMap[s.id] || 0,
    }));

    // 4. Fetch website modules allowed for this website by its subscription package
    let modulesRes = await queryDb(
      `SELECT DISTINCT wm.id, wm.name, wm.slug, wm.description, wm.icon, wm.is_active
       FROM website_modules wm
       JOIN package_modules pm ON pm.website_module_id = wm.id
       JOIN subscriptions s ON s.package_id = pm.package_id
       JOIN websites w ON (w.subscription_id = s.id OR s.website_id = w.id)
       WHERE w.id = $1 AND wm.is_active = TRUE
       ORDER BY wm.id ASC`,
      [websiteId]
    );

    // If website has no subscribed package yet, provide all active website modules
    if (modulesRes.rows.length === 0) {
      modulesRes = await queryDb(
        `SELECT id, name, slug, description, icon, is_active
         FROM website_modules
         WHERE is_active = TRUE
         ORDER BY id ASC`
      );
    }

    // 5. Fetch pay scales
    const payScalesRes = await queryDb(
      `SELECT id, name, basic_salary, allowance
       FROM website_staff_pay_scale
       WHERE website_id = $1
       ORDER BY name ASC`,
      [websiteId]
    ).catch(() => ({ rows: [] }));

    return NextResponse.json({
      success: true,
      staffs,
      modules: modulesRes.rows,
      payScales: payScalesRes.rows,
      website,
    });
  } catch (error) {
    console.error('Creator staff GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Add new staff member with credentials and module permissions
export async function POST(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const body = await request.json();
    const {
      websiteId,
      creatorId,
      name,
      email,
      number,
      address,
      password,
      gradeId,
      bio,
      permissions,
      sendInvite,
    } = body;

    if (!websiteId || !name || !email || !number) {
      return NextResponse.json(
        { success: false, error: 'Website ID, name, email, and phone number are required.' },
        { status: 400 }
      );
    }

    const website = await verifyWebsiteOwnership(websiteId, sessionCreator, creatorId);
    if (!website && !sessionCreator?.isDeveloper) {
      return NextResponse.json({ success: false, error: 'Unauthorized or website not found.' }, { status: 403 });
    }

    // Check email uniqueness within this website
    const existing = await queryDb(
      `SELECT id FROM website_staffs WHERE website_id = $1 AND LOWER(email) = LOWER($2)`,
      [websiteId, email.trim()]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'A staff member with this email already exists for this website.' },
        { status: 400 }
      );
    }

    let hashedPassword = null;
    let verificationToken = null;
    let verificationExpires = null;
    let isRegistered = true;

    if (password && password.length >= 6) {
      hashedPassword = await hashPassword(password);
    } else {
      // Setup invite link token
      verificationToken = generateToken(16);
      verificationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      hashedPassword = await hashPassword(generateToken(12)); // temporary randomized password
      isRegistered = false;
    }

    const usernameCandidate = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') + '_' + Math.floor(Math.random() * 899 + 100);

    const insertStaff = await queryDb(
      `INSERT INTO website_staffs (
        website_id, name, email, number, address, password,
        grade_id, bio, username, is_active, is_registered,
        verification_token, verification_token_expires
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, $11, $12)
      RETURNING *`,
      [
        websiteId,
        name.trim(),
        email.trim().toLowerCase(),
        number.trim(),
        address ? address.trim() : null,
        hashedPassword,
        gradeId ? Number(gradeId) : null,
        bio ? bio.trim() : null,
        usernameCandidate,
        isRegistered,
        verificationToken,
        verificationExpires,
      ]
    );

    const newStaff = insertStaff.rows[0];

    // Insert permissions into website_modules_permissions
    if (permissions && typeof permissions === 'object') {
      const allModulesRes = await queryDb(`SELECT id, slug FROM website_modules WHERE is_active = TRUE`);
      const modIdMap = {};
      allModulesRes.rows.forEach((m) => {
        modIdMap[m.slug] = m.id;
        modIdMap[m.id] = m.id;
      });

      for (const [moduleKey, perm] of Object.entries(permissions)) {
        if (!perm) continue;
        const websiteModuleId = modIdMap[moduleKey] || (Number.isInteger(Number(moduleKey)) ? moduleKey : null);
        if (!websiteModuleId) continue;

        await queryDb(
          `INSERT INTO website_modules_permissions (
            website_id, staff_id, website_module_id,
            can_view, can_create, can_edit, can_delete
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (staff_id, website_module_id) DO UPDATE SET
            can_view = EXCLUDED.can_view,
            can_create = EXCLUDED.can_create,
            can_edit = EXCLUDED.can_edit,
            can_delete = EXCLUDED.can_delete,
            updated_at = CURRENT_TIMESTAMP`,
          [
            websiteId,
            newStaff.id,
            websiteModuleId,
            Boolean(perm.can_view ?? perm.view),
            Boolean(perm.can_create ?? perm.create),
            Boolean(perm.can_edit ?? perm.edit),
            Boolean(perm.can_delete ?? perm.delete),
          ]
        );
      }
    }

    // Send setup email if requested
    if (sendInvite && verificationToken) {
      const baseUrl = getBaseUrl(request);
      const setupUrl = `${baseUrl}/auth/access/staff/verify?token=${verificationToken}`;
      try {
        await sendEmail({
          to: newStaff.email,
          toName: newStaff.name,
          subject: `Welcome to ${website.name} - Complete Your Staff Account Setup`,
          html: buildStyledEmail({
            title: `${website.name} Staff Portal`,
            subtitle: 'Institutional Account Invitation',
            recipientName: newStaff.name,
            bodyParagraphs: [
              `You have been added as an official staff member for ${website.name}.`,
              'Click the button below to set up your password and complete your staff profile:',
            ],
            code: verificationToken,
            codeLabel: 'Setup Token',
            actionUrl: setupUrl,
            actionText: 'Complete Account Setup',
            footerNote: 'This invite link is valid for 7 days. If you were not expecting this, please contact your school administrator.',
          }),
        });
      } catch (err) {
        console.warn('Notice sending staff invite email:', err.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Staff member added successfully.',
      staff: newStaff,
      inviteSent: Boolean(sendInvite && verificationToken),
    });
  } catch (error) {
    console.error('Creator staff POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update staff profile, toggle active status, update permissions matrix, or revoke sessions
export async function PUT(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const body = await request.json();
    const { action = 'update_profile', staffId, websiteId, creatorId } = body;

    if (!staffId || !websiteId) {
      return NextResponse.json(
        { success: false, error: 'staffId and websiteId are required.' },
        { status: 400 }
      );
    }

    const website = await verifyWebsiteOwnership(websiteId, sessionCreator, creatorId);
    if (!website && !sessionCreator?.isDeveloper) {
      return NextResponse.json({ success: false, error: 'Unauthorized or website not found.' }, { status: 403 });
    }

    if (action === 'toggle_active') {
      const currentRes = await queryDb(
        `SELECT is_active FROM website_staffs WHERE id = $1 AND website_id = $2`,
        [staffId, websiteId]
      );
      if (currentRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Staff member not found.' }, { status: 404 });
      }
      const newActive = !currentRes.rows[0].is_active;

      await queryDb(
        `UPDATE website_staffs SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND website_id = $3`,
        [newActive, staffId, websiteId]
      );

      if (!newActive) {
        await revokeAllStaffSessions(staffId, websiteId);
      }

      return NextResponse.json({
        success: true,
        isActive: newActive,
        message: `Staff member is now ${newActive ? 'Active' : 'Inactive'}.`,
      });
    }

    if (action === 'update_permissions') {
      const { permissions } = body;
      if (!permissions || typeof permissions !== 'object') {
        return NextResponse.json({ success: false, error: 'Permissions matrix is required.' }, { status: 400 });
      }

      const allModulesRes = await queryDb(`SELECT id, slug FROM website_modules WHERE is_active = TRUE`);
      const modIdMap = {};
      allModulesRes.rows.forEach((m) => {
        modIdMap[m.slug] = m.id;
        modIdMap[m.id] = m.id;
      });

      for (const [moduleKey, perm] of Object.entries(permissions)) {
        if (!perm) continue;
        const websiteModuleId = modIdMap[moduleKey] || (Number.isInteger(Number(moduleKey)) ? moduleKey : null);
        if (!websiteModuleId) continue;

        await queryDb(
          `INSERT INTO website_modules_permissions (
            website_id, staff_id, website_module_id,
            can_view, can_create, can_edit, can_delete
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (staff_id, website_module_id) DO UPDATE SET
            can_view = EXCLUDED.can_view,
            can_create = EXCLUDED.can_create,
            can_edit = EXCLUDED.can_edit,
            can_delete = EXCLUDED.can_delete,
            updated_at = CURRENT_TIMESTAMP`,
          [
            websiteId,
            staffId,
            websiteModuleId,
            Boolean(perm.can_view ?? perm.view),
            Boolean(perm.can_create ?? perm.create),
            Boolean(perm.can_edit ?? perm.edit),
            Boolean(perm.can_delete ?? perm.delete),
          ]
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Module permissions updated successfully.',
      });
    }

    if (action === 'revoke_sessions') {
      await revokeAllStaffSessions(staffId, websiteId);
      return NextResponse.json({
        success: true,
        message: 'All active sessions for this staff member have been terminated.',
      });
    }

    if (action === 'reset_password') {
      const { newPassword } = body;
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
      }
      const hashed = await hashPassword(newPassword);
      await queryDb(
        `UPDATE website_staffs SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND website_id = $3`,
        [hashed, staffId, websiteId]
      );
      await revokeAllStaffSessions(staffId, websiteId);
      return NextResponse.json({ success: true, message: 'Password reset successfully.' });
    }

    // Default: update_profile
    const { name, email, number, address, gradeId, bio } = body;
    const updRes = await queryDb(
      `UPDATE website_staffs
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           number = COALESCE($3, number),
           address = COALESCE($4, address),
           grade_id = $5,
           bio = COALESCE($6, bio),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND website_id = $8
       RETURNING *`,
      [
        name ? name.trim() : null,
        email ? email.trim().toLowerCase() : null,
        number ? number.trim() : null,
        address ? address.trim() : null,
        gradeId ? Number(gradeId) : null,
        bio ? bio.trim() : null,
        staffId,
        websiteId,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Staff profile updated successfully.',
      staff: updRes.rows[0],
    });
  } catch (error) {
    console.error('Creator staff PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete staff member
export async function DELETE(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId') || searchParams.get('id');
    const websiteId = searchParams.get('websiteId');
    const creatorId = searchParams.get('creatorId') || sessionCreator?.id;

    if (!staffId || !websiteId) {
      return NextResponse.json(
        { success: false, error: 'staffId and websiteId are required.' },
        { status: 400 }
      );
    }

    const website = await verifyWebsiteOwnership(websiteId, sessionCreator, creatorId);
    if (!website && !sessionCreator?.isDeveloper) {
      return NextResponse.json({ success: false, error: 'Unauthorized or website not found.' }, { status: 403 });
    }

    await queryDb(`DELETE FROM website_staffs WHERE id = $1 AND website_id = $2`, [staffId, websiteId]);

    return NextResponse.json({
      success: true,
      message: 'Staff member removed successfully.',
    });
  } catch (error) {
    console.error('Creator staff DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
