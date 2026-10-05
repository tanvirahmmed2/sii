import { NextResponse } from 'next/server.js';
import { queryDb } from '../../../../../lib/database/db.js';
import { getCreatorSession } from '../../../../../lib/middleware/creator.js';
import { BASE_DOMAIN, BASE_URL } from '../../../../../lib/database/secret.js';
import { checkDomainAvailability } from './check-domain/route.js';

export const dynamic = 'force-dynamic';

/**
 * Normalizes institution type string to a consistent capitalised label.
 */
function normalizeInstitutionType(type) {
  if (!type) return 'School';
  const lower = String(type).trim().toLowerCase();
  switch (lower) {
    case 'school':
      return 'School';
    case 'university':
      return 'University';
    case 'high-school':
    case 'high school':
      return 'High School';
    case 'college':
      return 'College';
    case 'coaching academy':
    case 'coaching-academy':
    case 'coaching':
      return 'Coaching Academy';
    case 'private isntitution':
    case 'private institution':
    case 'private-institution':
      return 'Private Institution';
    default:
      return type.trim();
  }
}

/**
 * GET /api/marketing/creator/websites
 */
export async function GET(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const { searchParams } = new URL(request.url);
    const creatorIdParam = searchParams.get('creatorId');
    const websiteIdParam = searchParams.get('id');
    const checkDomainParam = searchParams.get('checkDomain') || searchParams.get('domain');

    // 1. Fast Domain Check query if requested
    if (checkDomainParam) {
      const checkRes = await checkDomainAvailability(checkDomainParam, websiteIdParam);
      return NextResponse.json({
        success: true,
        baseDomain: BASE_DOMAIN,
        baseUrl: BASE_URL,
        ...checkRes,
      });
    }

    const creatorId = creatorIdParam ? Number(creatorIdParam) : Number(sessionCreator?.id);
    if (!creatorId) {
      return NextResponse.json({ success: false, error: 'Unauthorized or missing creator ID' }, { status: 401 });
    }

    if (sessionCreator && Number(sessionCreator.id) !== creatorId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // 2. If specific website requested
    if (websiteIdParam) {
      const singleRes = await queryDb(
        `SELECT w.*, 
                w.name AS site_title,
                ws.motto AS tagline,
                COALESCE(w.contact_email, ws.contact_email) AS contact_email,
                COALESCE(w.contact_phone, ws.contact_phone) AS contact_phone, 
                COALESCE(w.address, ws.address) AS address,
                w.primary_color,
                (CASE WHEN w.status = 'active' AND w.is_maintenance_mode = false THEN true ELSE false END) AS is_published
         FROM websites w
         LEFT JOIN website_settings ws ON w.id = ws.website_id
         WHERE w.id = $1 AND w.creator_id = $2
         LIMIT 1`,
        [Number(websiteIdParam), creatorId]
      );

      if (singleRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        baseDomain: BASE_DOMAIN,
        baseUrl: BASE_URL,
        website: singleRes.rows[0],
      });
    }

    // 3. List all websites for creator
    const res = await queryDb(
      `SELECT w.*, 
              w.name AS site_title,
              ws.motto AS tagline,
              COALESCE(w.contact_email, ws.contact_email) AS contact_email,
              COALESCE(w.contact_phone, ws.contact_phone) AS contact_phone, 
              COALESCE(w.address, ws.address) AS address,
              w.primary_color,
              (CASE WHEN w.status = 'active' AND w.is_maintenance_mode = false THEN true ELSE false END) AS is_published
       FROM websites w
       LEFT JOIN website_settings ws ON w.id = ws.website_id
       WHERE w.creator_id = $1
       ORDER BY w.id DESC`,
      [creatorId]
    ).catch(() => ({ rows: [] }));

    const hostHeader = request?.headers?.get?.('x-forwarded-host') || request?.headers?.get?.('host') || BASE_DOMAIN || 'localhost:3000';
    const cleanHost = hostHeader.split(',')[0].trim();
    const proto = request?.headers?.get?.('x-forwarded-proto') || 'http';
    const dynamicBaseUrl = `${proto}://${cleanHost}`;

    return NextResponse.json({
      success: true,
      baseDomain: cleanHost,
      baseUrl: dynamicBaseUrl,
      websites: res.rows,
    });
  } catch (error) {
    console.error('Websites GET API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * Dispatches Website actions (create, setup, update, delete, check_domain)
 */
export async function handleWebsitesAction(body, sessionCreator, request = null) {
  const { action } = body;
  const creatorId = Number(body.creatorId || sessionCreator?.id);

  // Allow check_domain even before auth if user is checking in the UI
  if (action === 'check_domain') {
    const domainToCheck = body.domain || body.subdomain || body.customDomain || '';
    const websiteId = body.websiteId || body.id || null;
    const checkRes = await checkDomainAvailability(domainToCheck, websiteId);
    return NextResponse.json({
      success: true,
      baseDomain: BASE_DOMAIN,
      baseUrl: BASE_URL,
      ...checkRes,
    });
  }

  if (!creatorId) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Creator ID required' }, { status: 401 });
  }

  if (sessionCreator && Number(sessionCreator.id) !== creatorId) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const reqHost = request?.headers?.get?.('x-forwarded-host') || request?.headers?.get?.('host');
  const baseDomain = (reqHost ? reqHost.split(',')[0].trim() : '') || BASE_DOMAIN || 'localhost:3000';

  // 1. Create or Setup Website
  if (action === 'create_website' || action === 'setup_website' || !action) {
    const name = (body.name || body.websiteName || '').trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Institution or website name is required.' }, { status: 400 });
    }

    const contactEmail = (body.mail || body.email || body.contactEmail || body.contact_email || '').trim();
    const contactPhone = (body.contactNumber || body.contact_number || body.phone || body.contactPhone || body.contact_phone || '').trim();
    const rawInstitutionType = body.institutionType || body.institution_type || body.type || 'school';
    const institutionType = normalizeInstitutionType(rawInstitutionType);
    const eiinNumber = (body.eeinNumber || body.eein_number || body.eiinNumber || body.eiin_number || '').trim();
    const address = (body.address || '').trim();

    const rawDomain = (body.customDomain || body.custom_domain || body.domain || body.subdomain || '').trim();
    if (!rawDomain) {
      return NextResponse.json({ success: false, error: 'Custom domain prefix is required.' }, { status: 400 });
    }

    // Check domain availability with the helper
    const domainValidation = await checkDomainAvailability(rawDomain);
    if (!domainValidation.available) {
      return NextResponse.json({
        success: false,
        error: domainValidation.error || 'Requested domain is not available. Please choose another prefix.',
      }, { status: 400 });
    }

    const cleanDomainPrefix = domainValidation.domain;
    const fullDomain = domainValidation.fullDomain || `${cleanDomainPrefix}.${baseDomain}`;
    const slug = cleanDomainPrefix;

    // Check active package subscription and quotas from purchases table
    const activeSub = await queryDb(
      `SELECT pu.*, COALESCE(p.max_websites, 1) AS max_websites, pu.package_id 
       FROM purchases pu 
       JOIN packages p ON pu.package_id = p.id 
       WHERE pu.creator_id = $1 
         AND pu.status IN ('completed', 'active') 
         AND (pu.period_end IS NULL OR pu.period_end > CURRENT_TIMESTAMP)
       ORDER BY pu.id DESC LIMIT 1`,
      [creatorId]
    ).catch(() => ({ rows: [] }));

    if (activeSub.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'An active package subscription is required to create a website. Please purchase a package first.',
      }, { status: 403 });
    }

    const packageRecord = activeSub.rows[0];
    const maxLimit = Number(packageRecord.max_websites || 1);
    const countRes = await queryDb('SELECT COUNT(*)::int AS count FROM websites WHERE creator_id = $1', [creatorId]);
    const currentCount = countRes.rows[0].count;

    if (currentCount >= maxLimit) {
      return NextResponse.json({
        success: false,
        error: `Your current package tier allows up to ${maxLimit} website(s). Please upgrade your package to create more websites.`,
      }, { status: 403 });
    }

    const primaryColor = body.primaryColor || body.primary_color || body.themeConfig?.primaryColor || '#1e40af';
    const themeName = body.theme || body.themeConfig?.mode || 'default';

    const res = await queryDb(
      `INSERT INTO websites (
         creator_id,
         package_id,
         name,
         slug,
         subdomain,
         custom_domain,
         custom_domain_verified,
         institution_type,
         eiin_number,
         status,
         theme,
         primary_color,
         contact_email,
         contact_phone,
         address,
         storage_used_mb,
         is_maintenance_mode
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $11, $12, $13, $14, 15, FALSE
       ) RETURNING *`,
      [
        creatorId,
        packageRecord.package_id || null,
        name,
        slug,
        fullDomain,
        fullDomain,
        true,
        institutionType,
        eiinNumber || null,
        themeName,
        primaryColor,
        contactEmail || null,
        contactPhone || null,
        address || null,
      ]
    );

    const newWebsite = res.rows[0];

    // Seed default settings, modules, roles & content
    await seedWebsiteDefaults(newWebsite.id, newWebsite.name, { primaryColor, theme: themeName }, {
      contactEmail,
      contactPhone,
      address,
      institutionType,
      eiinNumber,
      tagline: body.tagline || `Excellence in ${institutionType} Education`,
    });

    return NextResponse.json({
      success: true,
      message: `Website "${newWebsite.name}" has been created successfully!`,
      website: {
        ...newWebsite,
        is_published: true,
      },
      baseDomain,
      fullDomain,
    });
  }

  // 2. Update Website
  if (action === 'update_website') {
    const id = Number(body.id || body.websiteId);
    if (!id) {
      return NextResponse.json({ success: false, error: 'Website ID is required.' }, { status: 400 });
    }

    const updates = [];
    const values = [];
    let idx = 1;

    if (body.name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(body.name.trim());
    }

    if (body.institution_type !== undefined || body.institutionType !== undefined) {
      const rawType = body.institution_type || body.institutionType;
      updates.push(`institution_type = $${idx++}`);
      values.push(normalizeInstitutionType(rawType));
    }

    if (body.eiin_number !== undefined || body.eein_number !== undefined || body.eiinNumber !== undefined) {
      const eiinVal = body.eiin_number || body.eein_number || body.eiinNumber;
      updates.push(`eiin_number = $${idx++}`);
      values.push(eiinVal ? String(eiinVal).trim() : null);
    }

    if (body.contact_email !== undefined || body.email !== undefined || body.mail !== undefined) {
      const emailVal = body.contact_email || body.email || body.mail;
      updates.push(`contact_email = $${idx++}`);
      values.push(emailVal ? String(emailVal).trim() : null);
    }

    if (body.contact_phone !== undefined || body.phone !== undefined || body.contactNumber !== undefined) {
      const phoneVal = body.contact_phone || body.phone || body.contactNumber;
      updates.push(`contact_phone = $${idx++}`);
      values.push(phoneVal ? String(phoneVal).trim() : null);
    }

    if (body.address !== undefined) {
      updates.push(`address = $${idx++}`);
      values.push(body.address ? String(body.address).trim() : null);
    }

    if (body.subdomain !== undefined || body.custom_domain !== undefined || body.customDomain !== undefined) {
      const domainVal = body.custom_domain || body.customDomain || body.subdomain;
      if (domainVal) {
        const valRes = await checkDomainAvailability(domainVal, id);
        if (!valRes.available) {
          return NextResponse.json({ success: false, error: valRes.error }, { status: 400 });
        }
        const fullDomain = valRes.fullDomain;
        updates.push(`subdomain = $${idx++}`);
        values.push(fullDomain);
        updates.push(`custom_domain = $${idx++}`);
        values.push(fullDomain);
        updates.push(`slug = $${idx++}`);
        values.push(valRes.domain);
      }
    }

    if (body.theme_config !== undefined) {
      const tc = typeof body.theme_config === 'object' ? body.theme_config : {};
      if (tc.primaryColor) {
        updates.push(`primary_color = $${idx++}`);
        values.push(tc.primaryColor);
      }
      if (tc.mode || tc.theme) {
        updates.push(`theme = $${idx++}`);
        values.push(tc.mode || tc.theme || 'default');
      }
    }

    if (body.primary_color !== undefined || body.primaryColor !== undefined) {
      updates.push(`primary_color = $${idx++}`);
      values.push(body.primary_color || body.primaryColor);
    }

    if (body.status !== undefined) {
      updates.push(`status = $${idx++}`);
      values.push(body.status);
    }

    if (body.is_published !== undefined) {
      const isPub = Boolean(body.is_published);
      updates.push(`status = $${idx++}`);
      values.push(isPub ? 'active' : 'suspended');
      updates.push(`is_maintenance_mode = $${idx++}`);
      values.push(!isPub);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: true, message: 'No changes provided' });
    }

    values.push(id, creatorId);
    const res = await queryDb(
      `UPDATE websites SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx++} AND creator_id = $${idx++} RETURNING *`,
      values
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Website not found or unauthorized.' }, { status: 404 });
    }

    const updated = res.rows[0];

    // Synchronize website_settings
    if (body.contact_email !== undefined || body.contact_phone !== undefined || body.address !== undefined) {
      await queryDb(`
        UPDATE website_settings
        SET contact_email = COALESCE($1, contact_email),
            contact_phone = COALESCE($2, contact_phone),
            address = COALESCE($3, address),
            updated_at = CURRENT_TIMESTAMP
        WHERE website_id = $4
      `, [
        body.contact_email || body.email || body.mail || updated.contact_email,
        body.contact_phone || body.phone || body.contactNumber || updated.contact_phone,
        body.address || updated.address,
        id,
      ]).catch(() => null);
    }

    return NextResponse.json({
      success: true,
      message: 'Website updated successfully.',
      website: {
        ...updated,
        is_published: updated.status === 'active' && !updated.is_maintenance_mode,
        theme_config: {
          primaryColor: updated.primary_color || '#1e40af',
          mode: updated.theme || 'default',
        },
      },
    });
  }

  // 3. Delete Website
  if (action === 'delete_website') {
    const id = Number(body.id || body.websiteId);
    if (!id) {
      return NextResponse.json({ success: false, error: 'Website ID required.' }, { status: 400 });
    }

    const res = await queryDb('DELETE FROM websites WHERE id = $1 AND creator_id = $2 RETURNING id', [id, creatorId]);
    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Website not found or unauthorized.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, id, message: 'Website deleted successfully.' });
  }

  return NextResponse.json({ success: false, error: `Unknown websites action: ${action}` }, { status: 400 });
}

export async function POST(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const body = await request.json();
    return await handleWebsitesAction(body, sessionCreator, request);
  } catch (error) {
    console.error('Websites POST API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * Seed default configurations, settings and demo content for a new website
 */
export async function seedWebsiteDefaults(websiteId, websiteName, themeConfig = {}, extraSettings = {}) {
  try {
    const primaryColor = themeConfig.primaryColor || extraSettings.primaryColor || '#1e40af';

    // 1. Settings
    await queryDb(`
      INSERT INTO website_settings (
        website_id, contact_email, contact_phone, motto, address
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (website_id) DO UPDATE SET
        contact_email = EXCLUDED.contact_email,
        contact_phone = EXCLUDED.contact_phone,
        motto = EXCLUDED.motto,
        address = EXCLUDED.address,
        updated_at = CURRENT_TIMESTAMP
    `, [
      websiteId,
      extraSettings.contactEmail || extraSettings.contact_email || extraSettings.mail || null,
      extraSettings.contactPhone || extraSettings.contact_phone || extraSettings.contactNumber || null,
      extraSettings.tagline || extraSettings.motto || `Excellence in ${extraSettings.institutionType || 'Academic'} Education`,
      extraSettings.address || null,
    ]);

    // 2. Default Modules
    const defaultModules = [
      { name: 'Admissions & Student Enrolment', slug: 'admissions', description: 'Student online registration, admission tests & document verification' },
      { name: 'Attendance & Timetables', slug: 'attendance', description: 'Daily attendance logs, period schedules and routine management' },
      { name: 'Exams & Result Transcripts', slug: 'exams', description: 'Exam schedules, mark grading sheets and report cards generation' },
      { name: 'Student Tuition & Fees', slug: 'fees', description: 'Monthly fee invoices, fines, receipts and online collections' },
      { name: 'Notices & Announcements', slug: 'notices', description: 'Official campus bulletins, urgent alerts and student circulars' },
      { name: 'Events & Academic Calendar', slug: 'events', description: 'Campus symposiums, competitions, holidays and sports events' },
      { name: 'Academic Clubs & Activities', slug: 'clubs', description: 'Student interest clubs, leadership panels and student news' },
      { name: 'Faculty & Staff Directory', slug: 'faculty', description: 'Teacher profiles, designations, qualifications and payroll' },
    ];

    for (const m of defaultModules) {
      await queryDb(`
        INSERT INTO website_modules (website_id, name, slug, description, is_enabled)
        VALUES ($1, $2, $3, $4, TRUE)
        ON CONFLICT (website_id, slug) DO NOTHING
      `, [websiteId, m.name, m.slug, m.description]);
    }

    // 3. Default Roles
    const defaultRoles = [
      { name: 'Principal / Headmaster', slug: 'principal', description: 'Full institutional authority and operational oversight', is_system: true },
      { name: 'Campus Administrator', slug: 'admin', description: 'Staff and system manager with administrative access', is_system: true },
      { name: 'Faculty Member', slug: 'teacher', description: 'Teacher portal for attendance, marks and study materials', is_system: true },
      { name: 'Academic Staff', slug: 'staff', description: 'Office executive for admissions and accounts', is_system: false },
    ];

    for (const r of defaultRoles) {
      await queryDb(`
        INSERT INTO website_roles (website_id, name, slug, description, is_system)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (website_id, slug) DO NOTHING
      `, [websiteId, r.name, r.slug, r.description, r.is_system]);
    }

    // 4. Default Sample Notice
    await queryDb(`
      INSERT INTO website_notices (website_id, title, content, is_published, published_at)
      VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP)
      ON CONFLICT DO NOTHING
    `, [
      websiteId,
      `Welcome to ${websiteName}`,
      `We take immense pride in announcing the launch of our digital campus portal for ${websiteName}. Students and parents can access admission notices, timetables, and academic records seamlessly.`,
    ]).catch(() => null);

  } catch (err) {
    console.error('Error seeding website defaults:', err);
  }
}
