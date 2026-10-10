import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStaffSession, hasStaffModulePermission, isGeneralStaff, hashPassword } from 'src/lib/middleware/staff.js';
import { isAdmin } from 'src/lib/middleware/developer.js';
import { ensureOfficerSchema, revokeAllOfficerSessions } from 'src/lib/middleware/officer.js';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo.js';

/**
 * Validates staff authorization to manage officers for this tenant website.
 */
async function verifyStaffOfficerAccess(request, context, action = 'view') {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }

  const devAdmin = await isAdmin();
  const staffSession = await getStaffSession(request);

  if (!staffSession && !devAdmin) {
    return { error: 'Unauthorized: Staff credentials required.', status: 401 };
  }

  const staffWebsiteId =
    staffSession?.website_id ||
    staffSession?.websiteId ||
    staffSession?.staff?.websiteId ||
    staffSession?.staff?.website_id;

  if (!devAdmin && staffSession && staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
  }

  if (devAdmin) {
    return { website, staffSession, devAdmin, allowed: true };
  }

  // Check if staff has permissions for staff-payroll, sis, or general staff
  const hasStaffPayroll = hasStaffModulePermission(staffSession, 'staff-payroll', action);
  const hasSis = hasStaffModulePermission(staffSession, 'sis', action);
  const generalStaff = await isGeneralStaff(request);

  if (!hasStaffPayroll && !hasSis && !generalStaff) {
    return { error: `Forbidden: Insufficient privileges to ${action} officer records.`, status: 403 };
  }

  return { website, staffSession, devAdmin, allowed: true };
}

/**
 * Builds the officer verification link respecting custom domain or tenant subdomain.
 */
function buildOfficerVerificationUrl(website, token, request) {
  const reqHost = request?.headers?.get?.('x-forwarded-host') || request?.headers?.get?.('host') || '';
  const baseHost = (reqHost ? reqHost.split(',')[0].trim() : '') || 'localhost:3000';
  const protocol = request?.headers?.get?.('x-forwarded-proto') || (baseHost.includes('localhost') ? 'http' : 'https');

  // 1. Custom domain if verified and set
  const rawCustom = (website?.custom_domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (rawCustom) {
    const customProto = rawCustom.includes('localhost') ? 'http' : 'https';
    return `${customProto}://${rawCustom}/auth/access/officer/verify?token=${encodeURIComponent(token)}`;
  }

  // 2. Subdomain of base URL
  const rawSub = (website?.subdomain || website?.slug || '').trim().toLowerCase();
  const cleanSub = rawSub.includes('.') ? rawSub.split('.')[0] : rawSub;

  if (baseHost.includes('localhost')) {
    const port = baseHost.includes(':') ? `:${baseHost.split(':')[1]}` : '';
    return `${protocol}://${cleanSub}.localhost${port}/auth/access/officer/verify?token=${encodeURIComponent(token)}`;
  }

  const cleanHostNoPort = baseHost.split(':')[0];
  const parts = cleanHostNoPort.split('.');
  const baseDomain = parts.length >= 2 ? parts.slice(-2).join('.') : cleanHostNoPort;
  const port = baseHost.includes(':') ? `:${baseHost.split(':')[1]}` : '';

  return `${protocol}://${cleanSub}.${baseDomain}${port}/auth/access/officer/verify?token=${encodeURIComponent(token)}`;
}

// GET: Fetch officers roster, permissions matrix, active sessions, and website package modules
export async function GET(request, context) {
  try {
    await ensureOfficerSchema().catch(() => {});
    const auth = await verifyStaffOfficerAccess(request, context, 'view');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const search = searchParams.get('search')?.trim()?.toLowerCase();
    const department = searchParams.get('department')?.trim();
    const status = searchParams.get('status'); // 'all', 'active', 'inactive', 'pending'

    // 1. Single officer retrieval
    if (id) {
      const singleRes = await queryDb(
        `SELECT wo.id, wo.website_id, wo.name, wo.email, wo.phone, wo.department,
                wo.designation, wo.nid_number, wo.gender, wo.blood_group, wo.date_of_birth,
                wo.religion, wo.address, wo.permanent_address, wo.joining_date, wo.salary,
                wo.photo_url, wo.photo_id, wo.is_active, wo.is_registered, wo.is_two_factor_enabled,
                wo.bio, wo.username, wo.created_at, wo.updated_at
         FROM website_officers wo
         WHERE wo.website_id = $1 AND wo.id = $2
         LIMIT 1`,
        [website.id, id]
      );

      if (singleRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Officer not found.' }, { status: 404 });
      }

      const officer = singleRes.rows[0];

      // Fetch officer's granted module permissions
      const permsRes = await queryDb(
        `SELECT wop.website_module_id, wop.can_view, wop.can_create, wop.can_edit, wop.can_delete,
                wm.name AS module_name, wm.slug AS module_slug, wm.icon AS module_icon
         FROM website_officer_permissions wop
         JOIN website_modules wm ON wm.id = wop.website_module_id
         WHERE wop.website_id = $1 AND wop.officer_id = $2`,
        [website.id, officer.id]
      );

      officer.permissions = {};
      permsRes.rows.forEach((p) => {
        officer.permissions[p.module_slug] = {
          website_module_id: p.website_module_id,
          module_name: p.module_name,
          module_slug: p.module_slug,
          module_icon: p.module_icon,
          can_view: Boolean(p.can_view),
          can_create: Boolean(p.can_create),
          can_edit: Boolean(p.can_edit),
          can_delete: Boolean(p.can_delete),
        };
      });

      return NextResponse.json({ success: true, officer, payload: { officer } });
    }

    // 2. Fetch all website modules allowed for this website by its subscription package
    let packageModulesRes = await queryDb(
      `SELECT DISTINCT wm.id, wm.name, wm.slug, wm.description, wm.icon, wm.is_active
       FROM website_modules wm
       JOIN package_modules pm ON pm.website_module_id = wm.id
       JOIN subscriptions s ON s.package_id = pm.package_id
       JOIN websites w ON (w.subscription_id = s.id OR s.website_id = w.id)
       WHERE w.id = $1 AND wm.is_active = TRUE
       ORDER BY wm.id ASC`,
      [website.id]
    );

    // Fallback if website package link is not yet established
    if (packageModulesRes.rows.length === 0) {
      packageModulesRes = await queryDb(
        `SELECT id, name, slug, description, icon, is_active
         FROM website_modules
         WHERE is_active = TRUE
         ORDER BY id ASC`
      );
    }
    const packageModules = packageModulesRes.rows;

    // 3. Query all officers for this website
    let officersQuery = `
      SELECT wo.id, wo.website_id, wo.name, wo.email, wo.phone, wo.department,
             wo.designation, wo.nid_number, wo.gender, wo.blood_group, wo.date_of_birth,
             wo.joining_date, wo.salary, wo.photo_url, wo.is_active, wo.is_registered,
             wo.is_two_factor_enabled, wo.bio, wo.username, wo.created_at, wo.updated_at,
             wo.verification_token, wo.verification_token_expires
      FROM website_officers wo
      WHERE wo.website_id = $1
    `;
    const params = [website.id];

    if (search) {
      params.push(`%${search}%`);
      officersQuery += ` AND (LOWER(wo.name) LIKE $${params.length} OR LOWER(wo.email) LIKE $${params.length} OR wo.phone LIKE $${params.length} OR LOWER(wo.designation) LIKE $${params.length})`;
    }

    if (department && department !== 'all') {
      params.push(department);
      officersQuery += ` AND wo.department = $${params.length}`;
    }

    if (status === 'active') {
      officersQuery += ` AND wo.is_active = TRUE AND wo.is_registered = TRUE`;
    } else if (status === 'pending') {
      officersQuery += ` AND wo.is_registered = FALSE`;
    } else if (status === 'inactive') {
      officersQuery += ` AND wo.is_active = FALSE`;
    }

    officersQuery += ` ORDER BY wo.id DESC`;

    const officersRes = await queryDb(officersQuery, params);

    // 4. Fetch all permissions for this website's officers
    const permsRes = await queryDb(
      `SELECT wop.officer_id, wop.website_module_id, wop.can_view, wop.can_create, wop.can_edit, wop.can_delete,
              wm.name AS module_name, wm.slug AS module_slug, wm.icon AS module_icon
       FROM website_officer_permissions wop
       JOIN website_modules wm ON wm.id = wop.website_module_id
       WHERE wop.website_id = $1`,
      [website.id]
    );

    const permsMap = {};
    for (const p of permsRes.rows) {
      if (!permsMap[p.officer_id]) permsMap[p.officer_id] = {};
      permsMap[p.officer_id][p.module_slug] = {
        website_module_id: p.website_module_id,
        module_name: p.module_name,
        module_slug: p.module_slug,
        module_icon: p.module_icon,
        can_view: Boolean(p.can_view),
        can_create: Boolean(p.can_create),
        can_edit: Boolean(p.can_edit),
        can_delete: Boolean(p.can_delete),
      };
    }

    // 5. Fetch active sessions counts
    const sessionsRes = await queryDb(
      `SELECT officer_id, COUNT(*)::int AS active_sessions
       FROM website_officer_login_sessions
       WHERE website_id = $1 AND is_active = TRUE AND expires_at > CURRENT_TIMESTAMP
       GROUP BY officer_id`,
      [website.id]
    );

    const sessionsMap = {};
    for (const s of sessionsRes.rows) {
      sessionsMap[s.officer_id] = s.active_sessions;
    }

    const officers = officersRes.rows.map((o) => ({
      ...o,
      permissions: permsMap[o.id] || {},
      activeSessions: sessionsMap[o.id] || 0,
    }));

    // Stats
    const totalOfficers = officers.length;
    const activeOfficers = officers.filter((o) => o.is_active && o.is_registered).length;
    const pendingOfficers = officers.filter((o) => !o.is_registered).length;

    return NextResponse.json({
      success: true,
      officers,
      packageModules,
      stats: {
        total: totalOfficers,
        active: activeOfficers,
        pending: pendingOfficers,
      },
      payload: {
        officers,
        packageModules,
        stats: { total: totalOfficers, active: activeOfficers, pending: pendingOfficers },
      },
    });
  } catch (error) {
    console.error('Error fetching officers roster:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch officers roster.' }, { status: 500 });
  }
}

// POST: Create new officer, assign package module permissions, and dispatch verification email
export async function POST(request, context) {
  try {
    await ensureOfficerSchema().catch(() => {});
    const auth = await verifyStaffOfficerAccess(request, context, 'create');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json().catch(() => ({}));
    const {
      name,
      email,
      phone,
      department = 'General',
      designation = 'Officer',
      nid_number = null,
      gender = 'male',
      blood_group = null,
      date_of_birth = null,
      religion = null,
      address = null,
      permanent_address = null,
      joining_date = null,
      salary = 0.00,
      photo_url = null,
      photo_id = null,
      password = null,
      is_active = true,
      bio = null,
      permissions = {}, // { [module_slug or module_id]: { can_view, can_create, can_edit, can_delete } }
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Officer full name is required.' }, { status: 400 });
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ success: false, error: 'Officer email address is required.' }, { status: 400 });
    }
    if (!phone || !phone.trim()) {
      return NextResponse.json({ success: false, error: 'Officer contact phone number is required.' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();

    // Check duplicate email for this website
    const existing = await queryDb(
      `SELECT id FROM website_officers WHERE website_id = $1 AND LOWER(email) = $2 LIMIT 1`,
      [website.id, trimmedEmail]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'An officer with this email address already exists in this institution.' },
        { status: 409 }
      );
    }

    // Default demo password if not provided; officer will establish permanent password during verification
    const rawPass = password && password.trim() ? password.trim() : `Officer@${Math.floor(100000 + Math.random() * 900000)}`;
    const hashedPassword = await hashPassword(rawPass);

    // Cryptographic verification token valid for 7 days
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const insertOfficerRes = await queryDb(
      `INSERT INTO website_officers (
         website_id, name, email, phone, department, designation, nid_number,
         gender, blood_group, date_of_birth, religion, address, permanent_address,
         joining_date, salary, photo_url, photo_id, password, is_active, is_registered,
         verification_token, verification_token_expires, bio
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7,
         $8, $9, $10, $11, $12, $13,
         COALESCE($14::date, CURRENT_DATE), $15, $16, $17, $18, $19, FALSE,
         $20, CURRENT_TIMESTAMP + INTERVAL '7 days', $21
       ) RETURNING *`,
      [
        website.id,
        name.trim(),
        trimmedEmail,
        trimmedPhone,
        department.trim(),
        designation.trim(),
        nid_number?.trim() || null,
        ['male', 'female', 'other'].includes(gender) ? gender : 'male',
        blood_group?.trim() || null,
        date_of_birth || null,
        religion?.trim() || null,
        address?.trim() || null,
        permanent_address?.trim() || null,
        joining_date || null,
        Number(salary) || 0.00,
        photo_url?.trim() || null,
        photo_id?.trim() || null,
        hashedPassword,
        Boolean(is_active),
        verificationToken,
        bio?.trim() || null,
      ]
    );

    const createdOfficer = insertOfficerRes.rows[0];

    // Fetch allowed modules for this website's package to enforce RBAC integrity
    const packageModulesRes = await queryDb(
      `SELECT DISTINCT wm.id, wm.slug
       FROM website_modules wm
       JOIN package_modules pm ON pm.website_module_id = wm.id
       JOIN subscriptions s ON s.package_id = pm.package_id
       JOIN websites w ON (w.subscription_id = s.id OR s.website_id = w.id)
       WHERE w.id = $1 AND wm.is_active = TRUE`,
      [website.id]
    );

    let allowedModulesList = packageModulesRes.rows;
    if (allowedModulesList.length === 0) {
      const allMods = await queryDb(`SELECT id, slug FROM website_modules WHERE is_active = TRUE`);
      allowedModulesList = allMods.rows;
    }

    const allowedModuleMap = {};
    allowedModulesList.forEach((m) => {
      allowedModuleMap[m.slug] = m.id;
      allowedModuleMap[m.id] = m.id;
    });

    // Save granted permissions
    if (permissions && typeof permissions === 'object') {
      for (const [key, perm] of Object.entries(permissions)) {
        const moduleId = allowedModuleMap[key] || allowedModuleMap[perm.website_module_id] || allowedModuleMap[perm.module_slug];
        if (moduleId) {
          const canView = perm.can_view !== undefined ? Boolean(perm.can_view) : true;
          const canCreate = Boolean(perm.can_create);
          const canEdit = Boolean(perm.can_edit);
          const canDelete = Boolean(perm.can_delete);

          await queryDb(
            `INSERT INTO website_officer_permissions (
               website_id, officer_id, website_module_id, can_view, can_create, can_edit, can_delete
             ) VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (officer_id, website_module_id) DO UPDATE SET
               can_view = EXCLUDED.can_view,
               can_create = EXCLUDED.can_create,
               can_edit = EXCLUDED.can_edit,
               can_delete = EXCLUDED.can_delete`,
            [website.id, createdOfficer.id, moduleId, canView, canCreate, canEdit, canDelete]
          );
        }
      }
    }

    // Generate verification link
    const verificationUrl = buildOfficerVerificationUrl(website, verificationToken, request);

    // Send invitation email using tenant's website Brevo mailer, or fallback to main platform Brevo mailer
    let emailSent = false;
    let emailError = null;
    try {
      const emailHtml = buildStyledEmail({
        title: 'Officer Account Invitation',
        subtitle: `${website.name} — Administrative Portal`,
        recipientName: name.trim(),
        bodyParagraphs: [
          `You have been registered as an administrative officer (${designation} - ${department}) at ${website.name}.`,
          'Please verify your officer identity and establish your login credentials using the secure link below.',
          'This invitation link is valid for 7 days. Once verified, you will be able to access the Officer Panel to manage your designated campus operations.',
        ],
        actionUrl: verificationUrl,
        actionText: 'Verify Officer Account & Set Password →',
        footerNote: 'If you did not expect this invitation, please contact your campus administration.',
      });

      await sendEmail({
        to: trimmedEmail,
        toName: name.trim(),
        subject: `${website.name} - Complete Your Officer Account Setup`,
        html: emailHtml,
        websiteId: website.id, // Automatic fallback to main mailer if website mailer is not configured
      });
      emailSent = true;
    } catch (mailErr) {
      emailError = mailErr.message;
      console.warn('[Staff Officer Create] Email dispatch note:', mailErr.message);
    }

    return NextResponse.json({
      success: true,
      officer: createdOfficer,
      verificationUrl,
      emailSent,
      emailError: emailSent ? null : emailError,
      message: emailSent
        ? 'Officer created successfully! Verification invitation has been dispatched to their email.'
        : 'Officer created successfully. Verification link generated.',
    });
  } catch (error) {
    console.error('Error creating officer:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to create officer.' }, { status: 500 });
  }
}

// PUT: Update officer profile details and update permissions
export async function PUT(request, context) {
  try {
    await ensureOfficerSchema().catch(() => {});
    const auth = await verifyStaffOfficerAccess(request, context, 'edit');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json().catch(() => ({}));
    const {
      id,
      name,
      phone,
      department,
      designation,
      nid_number,
      gender,
      blood_group,
      date_of_birth,
      religion,
      address,
      permanent_address,
      joining_date,
      salary,
      is_active,
      bio,
      permissions = {},
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Officer ID is required for updating.' }, { status: 400 });
    }

    const checkRes = await queryDb(
      `SELECT id FROM website_officers WHERE website_id = $1 AND id = $2 LIMIT 1`,
      [website.id, id]
    );

    if (checkRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Officer not found.' }, { status: 404 });
    }

    await queryDb(
      `UPDATE website_officers SET
         name = COALESCE($1, name),
         phone = COALESCE($2, phone),
         department = COALESCE($3, department),
         designation = COALESCE($4, designation),
         nid_number = COALESCE($5, nid_number),
         gender = COALESCE($6, gender),
         blood_group = COALESCE($7, blood_group),
         date_of_birth = COALESCE($8, date_of_birth),
         religion = COALESCE($9, religion),
         address = COALESCE($10, address),
         permanent_address = COALESCE($11, permanent_address),
         joining_date = COALESCE($12, joining_date),
         salary = COALESCE($13, salary),
         is_active = COALESCE($14, is_active),
         bio = COALESCE($15, bio),
         updated_at = CURRENT_TIMESTAMP
       WHERE website_id = $16 AND id = $17`,
      [
        name?.trim() || null,
        phone?.trim() || null,
        department?.trim() || null,
        designation?.trim() || null,
        nid_number?.trim() || null,
        gender || null,
        blood_group?.trim() || null,
        date_of_birth || null,
        religion?.trim() || null,
        address?.trim() || null,
        permanent_address?.trim() || null,
        joining_date || null,
        salary !== undefined ? Number(salary) : null,
        is_active !== undefined ? Boolean(is_active) : null,
        bio?.trim() || null,
        website.id,
        id,
      ]
    );

    // If permissions provided, update them
    if (permissions && typeof permissions === 'object') {
      const allMods = await queryDb(`SELECT id, slug FROM website_modules WHERE is_active = TRUE`);
      const modMap = {};
      allMods.rows.forEach((m) => {
        modMap[m.slug] = m.id;
        modMap[m.id] = m.id;
      });

      for (const [key, perm] of Object.entries(permissions)) {
        const moduleId = modMap[key] || modMap[perm.website_module_id] || modMap[perm.module_slug];
        if (moduleId) {
          const canView = perm.can_view !== undefined ? Boolean(perm.can_view) : true;
          const canCreate = Boolean(perm.can_create);
          const canEdit = Boolean(perm.can_edit);
          const canDelete = Boolean(perm.can_delete);

          await queryDb(
            `INSERT INTO website_officer_permissions (
               website_id, officer_id, website_module_id, can_view, can_create, can_edit, can_delete
             ) VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (officer_id, website_module_id) DO UPDATE SET
               can_view = EXCLUDED.can_view,
               can_create = EXCLUDED.can_create,
               can_edit = EXCLUDED.can_edit,
               can_delete = EXCLUDED.can_delete`,
            [website.id, id, moduleId, canView, canCreate, canEdit, canDelete]
          );
        }
      }
    }

    if (is_active === false) {
      await revokeAllOfficerSessions(id, website.id);
    }

    return NextResponse.json({ success: true, message: 'Officer profile and permissions updated successfully.' });
  } catch (error) {
    console.error('Error updating officer:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update officer.' }, { status: 500 });
  }
}

// DELETE: Delete or deactivate an officer
export async function DELETE(request, context) {
  try {
    await ensureOfficerSchema().catch(() => {});
    const auth = await verifyStaffOfficerAccess(request, context, 'delete');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Officer ID is required.' }, { status: 400 });
    }

    await revokeAllOfficerSessions(id, website.id);

    const deleteRes = await queryDb(
      `DELETE FROM website_officers WHERE website_id = $1 AND id = $2 RETURNING id, name`,
      [website.id, id]
    );

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Officer not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Officer ${deleteRes.rows[0].name} removed successfully.` });
  } catch (error) {
    console.error('Error deleting officer:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete officer.' }, { status: 500 });
  }
}
