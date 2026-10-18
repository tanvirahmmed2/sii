import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest, hasTenantModuleAllowance } from 'src/lib/middleware/websiteResolver.js';
import { getStaffSession, hasStaffModulePermission, hashPassword } from 'src/lib/middleware/staff.js';
import { revokeAllOfficerSessions } from 'src/lib/middleware/officer.js';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo.js';
import { uploadImage, deleteImage } from 'src/lib/database/cloudinary.js';

const VALID_DEPARTMENTS = [
  'Hall',
  'Library',
  'Club',
  'Accounts',
  'Administration',
  'General',
  'Hostel',
  'Inventory'
];

/**
 * Validates staff authorization to manage officers for this tenant website.
 * Enforces tenant subscription allowance and explicit staff permissions.
 */
async function verifyStaffOfficerAccess(request, context, action = 'view') {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404, code: 'WEBSITE_NOT_FOUND' };
  }

  // 1. Check Tenant Subscription Package Allowance
  const hasAllowance =
    (await hasTenantModuleAllowance(website, 'officers')) ||
    (await hasTenantModuleAllowance(website, 'staff-payroll')) ||
    (await hasTenantModuleAllowance(website, 'sis'));

  if (!hasAllowance) {
    return {
      error: "The 'officers' / 'staff-payroll' module is not included in this institution's subscription plan.",
      status: 403,
      code: 'MODULE_NOT_SUBSCRIBED',
      website,
    };
  }

  // 2. Check Staff Session & Tenant Boundary
  const staffSession = await getStaffSession(request);
  if (!staffSession) {
    return { error: 'Unauthorized: Staff credentials required.', status: 401, code: 'UNAUTHORIZED' };
  }

  const staffWebsiteId =
    staffSession?.website_id ||
    staffSession?.websiteId ||
    staffSession?.staff?.websiteId ||
    staffSession?.staff?.website_id;

  if (staffSession && staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403, code: 'FORBIDDEN_CROSS_TENANT' };
  }

  // 3. Check Staff Module Permissions
  const hasPerm =
    hasStaffModulePermission(staffSession, 'officers', action) ||
    hasStaffModulePermission(staffSession, 'staff-payroll', action) ||
    hasStaffModulePermission(staffSession, 'sis', action);

  if (!hasPerm) {
    return {
      error: `Forbidden: Insufficient privileges to ${action} officer records.`,
      status: 403,
      code: 'PERMISSION_DENIED',
      website,
      staffSession,
    };
  }

  return {
    website,
    staffSession,
    staff: staffSession.staff || staffSession.user,
    allowed: true,
  };
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

/**
 * Helper to parse multipart/form-data or application/json for officer endpoints
 */
async function parseOfficerRequest(request) {
  const contentType = request.headers.get('content-type') || '';
  let body = {};
  let imageFile = null;

  if (contentType.includes('multipart/form-data') || contentType.includes('form-data')) {
    const formData = await request.formData();
    for (const [key, value] of formData.entries()) {
      if (value && typeof value === 'object' && typeof value.arrayBuffer === 'function') {
        if (key === 'file' || key === 'photo' || key === 'image') {
          imageFile = value;
        }
      } else {
        body[key] = value;
      }
    }
    if (typeof body.permissions === 'string') {
      try {
        body.permissions = JSON.parse(body.permissions);
      } catch (e) {
        body.permissions = {};
      }
    }
  } else {
    body = await request.json().catch(() => ({}));
  }

  return { body, imageFile };
}

// GET: Fetch officers roster, stats, or single officer profile with assigned payroll
export async function GET(request, context) {
  try {
    const auth = await verifyStaffOfficerAccess(request, context, 'view');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email');
    const search = searchParams.get('search')?.trim()?.toLowerCase();
    const department = searchParams.get('department')?.trim();
    const status = searchParams.get('status'); // 'all', 'active', 'inactive', 'pending'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    // 1. Single officer retrieval
    if (id || email) {
      let singleQuery = `
        SELECT wo.id, wo.website_id, wo.name, wo.email, wo.phone, wo.department,
               wo.designation, wo.nid_number, wo.gender, wo.blood_group, wo.date_of_birth,
               wo.religion, wo.address, wo.permanent_address, wo.joining_date, wo.salary,
               wo.photo_url, wo.photo_id, wo.is_active, wo.is_registered, wo.is_two_factor_enabled,
               wo.bio, wo.username, wo.created_at, wo.updated_at,
               os.payroll_id,
               op.title AS payroll_title,
               op.grade_code AS payroll_grade_code,
               op.basic_salary AS payroll_basic_salary,
               (COALESCE(op.basic_salary, 0) + COALESCE(op.house_rent, 0) + COALESCE(op.medical_allowance, 0) + COALESCE(op.transport_allowance, 0) + COALESCE(op.other_allowance, 0)) AS payroll_gross_salary,
               ((COALESCE(op.basic_salary, 0) + COALESCE(op.house_rent, 0) + COALESCE(op.medical_allowance, 0) + COALESCE(op.transport_allowance, 0) + COALESCE(op.other_allowance, 0)) - 
                (COALESCE(op.provident_fund, 0) + COALESCE(op.tax_deduction, 0) + COALESCE(op.other_deductions, 0))) AS payroll_net_salary
        FROM website_officers wo
        LEFT JOIN website_officer_salaries os ON os.officer_id = wo.id AND os.website_id = wo.website_id
        LEFT JOIN website_officer_payrolls op ON op.id = os.payroll_id AND op.website_id = wo.website_id
        WHERE wo.website_id = $1
      `;
      const singleParams = [website.id];

      if (id) {
        singleParams.push(id);
        singleQuery += ` AND wo.id = $2`;
      } else {
        singleParams.push(email.trim());
        singleQuery += ` AND LOWER(wo.email) = LOWER($2)`;
      }

      singleQuery += ` LIMIT 1`;

      const singleRes = await queryDb(singleQuery, singleParams);
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

    if (packageModulesRes.rows.length === 0) {
      packageModulesRes = await queryDb(
        `SELECT id, name, slug, description, icon, is_active
         FROM website_modules
         WHERE is_active = TRUE
         ORDER BY id ASC`
      );
    }
    const packageModules = packageModulesRes.rows;

    // 3. Build filter clauses for roster list
    const whereClauses = ['wo.website_id = $1'];
    const params = [website.id];
    let paramIndex = 2;

    if (search) {
      whereClauses.push(
        `(LOWER(wo.name) LIKE $${paramIndex} OR LOWER(wo.email) LIKE $${paramIndex} OR wo.phone LIKE $${paramIndex} OR LOWER(wo.designation) LIKE $${paramIndex})`
      );
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (department && department !== 'all') {
      whereClauses.push(`wo.department = $${paramIndex}`);
      params.push(department);
      paramIndex++;
    }

    if (status === 'active') {
      whereClauses.push(`wo.is_active = TRUE AND wo.is_registered = TRUE`);
    } else if (status === 'pending') {
      whereClauses.push(`wo.is_registered = FALSE`);
    } else if (status === 'inactive') {
      whereClauses.push(`wo.is_active = FALSE`);
    }

    const whereStr = whereClauses.join(' AND ');

    // 4. Count total matching officers
    const countRes = await queryDb(
      `SELECT COUNT(*)::int AS count FROM website_officers wo WHERE ${whereStr}`,
      params
    );
    const total = countRes.rows[0]?.count || 0;

    // 5. Aggregated metrics for cards
    const statsRes = await queryDb(
      `SELECT 
         COUNT(*)::int AS total_officers,
         COUNT(*) FILTER (WHERE is_active = TRUE AND is_registered = TRUE)::int AS active_officers,
         COUNT(*) FILTER (WHERE is_registered = FALSE)::int AS pending_officers,
         COUNT(*) FILTER (WHERE is_active = FALSE)::int AS inactive_officers,
         COUNT(DISTINCT department)::int AS total_departments
       FROM website_officers
       WHERE website_id = $1`,
      [website.id]
    );
    const stats = statsRes.rows[0] || {
      total_officers: 0,
      active_officers: 0,
      pending_officers: 0,
      inactive_officers: 0,
      total_departments: 0,
    };

    // 6. Query list with joined salaries and payrolls
    const listQuery = `
      SELECT wo.id, wo.website_id, wo.name, wo.email, wo.phone, wo.department,
             wo.designation, wo.nid_number, wo.gender, wo.blood_group, wo.date_of_birth,
             wo.religion, wo.address, wo.permanent_address, wo.joining_date, wo.salary,
             wo.photo_url, wo.photo_id, wo.is_active, wo.is_registered,
             wo.is_two_factor_enabled, wo.bio, wo.username, wo.created_at, wo.updated_at,
             wo.verification_token, wo.verification_token_expires,
             os.payroll_id,
             op.title AS payroll_title,
             op.grade_code AS payroll_grade_code,
             op.basic_salary AS payroll_basic_salary,
             (COALESCE(op.basic_salary, 0) + COALESCE(op.house_rent, 0) + COALESCE(op.medical_allowance, 0) + COALESCE(op.transport_allowance, 0) + COALESCE(op.other_allowance, 0)) AS payroll_gross_salary,
             ((COALESCE(op.basic_salary, 0) + COALESCE(op.house_rent, 0) + COALESCE(op.medical_allowance, 0) + COALESCE(op.transport_allowance, 0) + COALESCE(op.other_allowance, 0)) - 
              (COALESCE(op.provident_fund, 0) + COALESCE(op.tax_deduction, 0) + COALESCE(op.other_deductions, 0))) AS payroll_net_salary
      FROM website_officers wo
      LEFT JOIN website_officer_salaries os ON os.officer_id = wo.id AND os.website_id = wo.website_id
      LEFT JOIN website_officer_payrolls op ON op.id = os.payroll_id AND op.website_id = wo.website_id
      WHERE ${whereStr}
      ORDER BY wo.is_active DESC, wo.id DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const officersRes = await queryDb(listQuery, params);

    // 7. Active login sessions count
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
      activeSessions: sessionsMap[o.id] || 0,
    }));

    return NextResponse.json({
      success: true,
      officers,
      packageModules,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      stats: {
        total: stats.total_officers || total,
        active: stats.active_officers || 0,
        pending: stats.pending_officers || 0,
        inactive: stats.inactive_officers || 0,
        departments: stats.total_departments || 0,
      },
      payload: {
        officers,
        packageModules,
        stats,
      },
    });
  } catch (error) {
    console.error('Error fetching officers roster:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch officers roster.' }, { status: 500 });
  }
}

// POST: Create new officer, optionally assign direct payroll scale, and dispatch verification email
export async function POST(request, context) {
  try {
    const auth = await verifyStaffOfficerAccess(request, context, 'create');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { body, imageFile } = await parseOfficerRequest(request);
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
      payroll_id = null,
      photo_url = null,
      photo_id = null,
      password = null,
      is_active = true,
      bio = null,
      permissions = {},
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

    // Normalize department to valid DB check constraint
    let validDept = 'General';
    if (department && VALID_DEPARTMENTS.includes(department.trim())) {
      validDept = department.trim();
    }

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

    // Verify and calculate direct payroll assignment
    let finalSalary = Number(salary) || 0.00;
    let selectedPayroll = null;
    const targetPayrollId = payroll_id || body.payrollId || null;

    if (
      targetPayrollId &&
      String(targetPayrollId).trim() !== '' &&
      String(targetPayrollId) !== '0' &&
      String(targetPayrollId) !== 'none' &&
      String(targetPayrollId) !== 'null'
    ) {
      const payrollCheck = await queryDb(
        `SELECT id, title, grade_code, basic_salary, house_rent, medical_allowance, transport_allowance, other_allowance,
                provident_fund, tax_deduction, other_deductions
         FROM website_officer_payrolls
         WHERE id = $1 AND website_id = $2 LIMIT 1`,
        [Number(targetPayrollId), website.id]
      );
      if (payrollCheck.rows.length > 0) {
        selectedPayroll = payrollCheck.rows[0];
        const gross =
          Number(selectedPayroll.basic_salary) +
          Number(selectedPayroll.house_rent) +
          Number(selectedPayroll.medical_allowance) +
          Number(selectedPayroll.transport_allowance) +
          Number(selectedPayroll.other_allowance);
        const deductions =
          Number(selectedPayroll.provident_fund) +
          Number(selectedPayroll.tax_deduction) +
          Number(selectedPayroll.other_deductions);
        finalSalary = Math.max(0, gross - deductions);
      }
    }

    // Default demo password if not provided; officer will establish permanent password during verification
    const rawPass = password && password.trim() ? password.trim() : `Officer@${Math.floor(100000 + Math.random() * 900000)}`;
    const hashedPassword = await hashPassword(rawPass);

    // Cryptographic verification token valid for 7 days
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // STEP 1: Insert into website_officers table
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
        validDept,
        designation?.trim() || 'Officer',
        nid_number?.trim() || null,
        ['male', 'female', 'other'].includes(gender) ? gender : 'male',
        blood_group?.trim() || null,
        date_of_birth || null,
        religion?.trim() || null,
        address?.trim() || null,
        permanent_address?.trim() || null,
        joining_date || null,
        finalSalary,
        photo_url?.trim() || null,
        photo_id?.trim() || null,
        hashedPassword,
        Boolean(is_active),
        verificationToken,
        bio?.trim() || null,
      ]
    );

    const createdOfficer = insertOfficerRes.rows[0];

    // STEP 2: Directly assign payroll in website_officer_salaries without separate salary page
    if (selectedPayroll) {
      await queryDb(
        `INSERT INTO website_officer_salaries (
           website_id, officer_id, payroll_id, effective_date, status, remarks
         ) VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE), 'active', 'Assigned on officer registration')
         ON CONFLICT (website_id, officer_id) DO UPDATE SET
           payroll_id = EXCLUDED.payroll_id,
           effective_date = EXCLUDED.effective_date,
           status = EXCLUDED.status,
           remarks = EXCLUDED.remarks,
           updated_at = CURRENT_TIMESTAMP`,
        [website.id, createdOfficer.id, selectedPayroll.id, joining_date || null]
      );
      createdOfficer.payroll_id = selectedPayroll.id;
      createdOfficer.payroll_title = selectedPayroll.title;
      createdOfficer.payroll_grade_code = selectedPayroll.grade_code;
      createdOfficer.payroll_basic_salary = selectedPayroll.basic_salary;
    }

    // STEP 3: Upload photo to Cloudinary if image file provided
    if (imageFile) {
      try {
        const uploadRes = await uploadImage(imageFile, `school/${website.id}/officers`);
        if (uploadRes?.secure_url) {
          const updatePhotoRes = await queryDb(
            `UPDATE website_officers SET photo_url = $1, photo_id = $2 WHERE id = $3 AND website_id = $4 RETURNING *`,
            [uploadRes.secure_url, uploadRes.publicId, createdOfficer.id, website.id]
          );
          if (updatePhotoRes.rows[0]) {
            createdOfficer.photo_url = updatePhotoRes.rows[0].photo_url;
            createdOfficer.photo_id = updatePhotoRes.rows[0].photo_id;
          }
        }
      } catch (uploadErr) {
        console.error('Officer photo Cloudinary upload error:', uploadErr);
      }
    }

    // STEP 4: Save granted permissions if provided
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
            [website.id, createdOfficer.id, moduleId, canView, canCreate, canEdit, canDelete]
          );
        }
      }
    }

    // STEP 5: Generate verification link & dispatch email
    const verificationUrl = buildOfficerVerificationUrl(website, verificationToken, request);
    let emailSent = false;
    let emailError = null;
    try {
      const emailHtml = buildStyledEmail({
        title: 'Officer Account Invitation',
        subtitle: `${website.name} — Administrative Portal`,
        recipientName: name.trim(),
        bodyParagraphs: [
          `You have been registered as an administrative officer (${designation} - ${validDept}) at ${website.name}.`,
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
        websiteId: website.id,
      });
      emailSent = true;
    } catch (mailErr) {
      emailError = mailErr.message;
      console.warn('[Staff Officer Create] Email dispatch note:', mailErr.message);
    }

    if (createdOfficer) {
      delete createdOfficer.password;
      delete createdOfficer.two_factor_code;
      delete createdOfficer.two_factor_expires;
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
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating officer:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to create officer.' }, { status: 500 });
  }
}

// PUT: Update officer profile details, sync assigned payroll scale, and update permissions
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffOfficerAccess(request, context, 'edit');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { body, imageFile } = await parseOfficerRequest(request);
    const {
      id,
      name,
      email,
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
      payroll_id,
      photo_url,
      photo_id,
      password,
      is_active,
      bio,
      permissions = {},
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Officer ID is required for updating.' }, { status: 400 });
    }

    const checkRes = await queryDb(
      `SELECT id, password, photo_id FROM website_officers WHERE website_id = $1 AND id = $2 LIMIT 1`,
      [website.id, id]
    );

    if (checkRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Officer not found or access denied.' }, { status: 404 });
    }

    const currentOfficer = checkRes.rows[0];

    // Check duplicate email
    if (email && email.trim()) {
      const emailConflict = await queryDb(
        `SELECT id FROM website_officers WHERE website_id = $1 AND LOWER(email) = LOWER($2) AND id != $3 LIMIT 1`,
        [website.id, email.trim(), id]
      );
      if (emailConflict.rows.length > 0) {
        return NextResponse.json({ success: false, error: 'Another officer is already using this email.' }, { status: 409 });
      }
    }

    // Handle password update if provided
    let passwordHash = currentOfficer.password;
    if (password && password.trim()) {
      passwordHash = await hashPassword(password.trim());
    }

    // Validate department
    let validDept = undefined;
    if (department !== undefined) {
      if (VALID_DEPARTMENTS.includes(department.trim())) {
        validDept = department.trim();
      } else {
        validDept = 'General';
      }
    }

    // Direct Payroll scale synchronization
    const targetPayrollId = payroll_id !== undefined ? payroll_id : body.payrollId;
    let selectedPayroll = null;
    let computedSalary = undefined;

    if (targetPayrollId !== undefined) {
      if (
        targetPayrollId &&
        String(targetPayrollId).trim() !== '' &&
        String(targetPayrollId) !== '0' &&
        String(targetPayrollId) !== 'null' &&
        String(targetPayrollId) !== 'none'
      ) {
        const payrollCheck = await queryDb(
          `SELECT id, title, grade_code, basic_salary, house_rent, medical_allowance, transport_allowance, other_allowance,
                  provident_fund, tax_deduction, other_deductions
           FROM website_officer_payrolls WHERE id = $1 AND website_id = $2 LIMIT 1`,
          [Number(targetPayrollId), website.id]
        );
        if (payrollCheck.rows.length > 0) {
          selectedPayroll = payrollCheck.rows[0];
          const gross =
            Number(selectedPayroll.basic_salary) +
            Number(selectedPayroll.house_rent) +
            Number(selectedPayroll.medical_allowance) +
            Number(selectedPayroll.transport_allowance) +
            Number(selectedPayroll.other_allowance);
          const deductions =
            Number(selectedPayroll.provident_fund) +
            Number(selectedPayroll.tax_deduction) +
            Number(selectedPayroll.other_deductions);
          computedSalary = Math.max(0, gross - deductions);
        }
      } else {
        computedSalary = 0.00;
      }
    }

    const finalSalaryToUpdate =
      computedSalary !== undefined
        ? computedSalary
        : salary !== undefined && salary !== null && salary !== ''
        ? Number(salary)
        : null;

    // STEP 1: Update website_officers row
    const updateRes = await queryDb(
      `UPDATE website_officers SET
         name = COALESCE($1, name),
         email = COALESCE($2, email),
         phone = COALESCE($3, phone),
         department = COALESCE($4, department),
         designation = COALESCE($5, designation),
         nid_number = $6,
         gender = COALESCE($7, gender),
         blood_group = $8,
         date_of_birth = $9,
         religion = $10,
         address = $11,
         permanent_address = $12,
         joining_date = COALESCE($13::date, joining_date),
         salary = COALESCE($14, salary),
         photo_url = COALESCE($15, photo_url),
         photo_id = COALESCE($16, photo_id),
         password = $17,
         is_active = COALESCE($18, is_active),
         bio = $19,
         updated_at = CURRENT_TIMESTAMP
       WHERE website_id = $20 AND id = $21
       RETURNING *`,
      [
        name?.trim() || null,
        email?.trim()?.toLowerCase() || null,
        phone?.trim() || null,
        validDept,
        designation?.trim() || null,
        nid_number !== undefined ? (nid_number?.trim() || null) : null,
        gender && ['male', 'female', 'other'].includes(gender) ? gender : null,
        blood_group !== undefined ? (blood_group?.trim() || null) : null,
        date_of_birth !== undefined ? (date_of_birth || null) : null,
        religion !== undefined ? (religion?.trim() || null) : null,
        address !== undefined ? (address?.trim() || null) : null,
        permanent_address !== undefined ? (permanent_address?.trim() || null) : null,
        joining_date || null,
        finalSalaryToUpdate,
        photo_url !== undefined ? (photo_url?.trim() || null) : null,
        photo_id !== undefined ? (photo_id?.trim() || null) : null,
        passwordHash,
        is_active !== undefined ? Boolean(is_active) : null,
        bio !== undefined ? (bio?.trim() || null) : null,
        website.id,
        id,
      ]
    );

    let updatedOfficer = updateRes.rows[0];

    // STEP 2: Sync payroll scale assignment in website_officer_salaries
    if (targetPayrollId !== undefined) {
      if (selectedPayroll) {
        await queryDb(
          `INSERT INTO website_officer_salaries (
             website_id, officer_id, payroll_id, effective_date, status, remarks
           ) VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE), 'active', 'Updated from officer profile')
           ON CONFLICT (website_id, officer_id) DO UPDATE SET
             payroll_id = EXCLUDED.payroll_id,
             effective_date = COALESCE(EXCLUDED.effective_date, website_officer_salaries.effective_date),
             status = 'active',
             remarks = 'Updated from officer profile',
             updated_at = CURRENT_TIMESTAMP`,
          [website.id, id, selectedPayroll.id, joining_date || null]
        );
        updatedOfficer.payroll_id = selectedPayroll.id;
        updatedOfficer.payroll_title = selectedPayroll.title;
        updatedOfficer.payroll_grade_code = selectedPayroll.grade_code;
        updatedOfficer.payroll_basic_salary = selectedPayroll.basic_salary;
      } else if (
        !targetPayrollId ||
        String(targetPayrollId) === '0' ||
        String(targetPayrollId) === 'null' ||
        String(targetPayrollId) === 'none'
      ) {
        await queryDb(
          `DELETE FROM website_officer_salaries WHERE website_id = $1 AND officer_id = $2`,
          [website.id, id]
        );
        updatedOfficer.payroll_id = null;
        updatedOfficer.payroll_title = null;
        updatedOfficer.payroll_grade_code = null;
        updatedOfficer.payroll_basic_salary = null;
      }
    }

    // STEP 3: Handle photo update if imageFile provided
    if (imageFile) {
      try {
        const uploadRes = await uploadImage(imageFile, `school/${website.id}/officers`);
        if (uploadRes?.secure_url) {
          if (currentOfficer.photo_id) {
            deleteImage(currentOfficer.photo_id).catch(() => {});
          }
          const photoUpdateRes = await queryDb(
            `UPDATE website_officers SET photo_url = $1, photo_id = $2 WHERE id = $3 AND website_id = $4 RETURNING *`,
            [uploadRes.secure_url, uploadRes.publicId, id, website.id]
          );
          if (photoUpdateRes.rows[0]) {
            updatedOfficer = photoUpdateRes.rows[0];
          }
        }
      } catch (uploadErr) {
        console.error('Officer photo update Cloudinary error:', uploadErr);
      }
    }

    // STEP 4: Update module permissions if provided
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

    if (updatedOfficer) {
      delete updatedOfficer.password;
      delete updatedOfficer.two_factor_code;
      delete updatedOfficer.two_factor_expires;
    }

    return NextResponse.json({
      success: true,
      officer: updatedOfficer,
      message: 'Officer profile and payroll updated successfully.',
    });
  } catch (error) {
    console.error('Error updating officer:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update officer.' }, { status: 500 });
  }
}

// DELETE: Delete an officer and cascade cleanup
export async function DELETE(request, context) {
  try {
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
      `DELETE FROM website_officers WHERE website_id = $1 AND id = $2 RETURNING id, name, photo_id`,
      [website.id, id]
    );

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Officer not found or already deleted.' }, { status: 404 });
    }

    if (deleteRes.rows[0].photo_id) {
      deleteImage(deleteRes.rows[0].photo_id).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: `Officer ${deleteRes.rows[0].name} removed successfully.`,
    });
  } catch (error) {
    console.error('Error deleting officer:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete officer.' }, { status: 500 });
  }
}
