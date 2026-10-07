import { NextResponse } from 'next/server.js';
import { queryDb } from '../../../../../lib/database/db.js';
import { getCreatorSession } from '../../../../../lib/middleware/creator.js';
import { BASE_DOMAIN, getBaseUrl } from '../../../../../lib/database/secret.js';
import { checkDomainAvailability, checkCustomDomainAvailability } from './check-domain/route.js';

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
    const domainParam = searchParams.get('domain') || searchParams.get('subdomain') || searchParams.get('slug') || searchParams.get('website');
    const checkDomainParam = searchParams.get('checkDomain');

    // 1. Fast Domain Check query if requested
    if (checkDomainParam) {
      const type = searchParams.get('type') || '';
      if (type === 'custom') {
        const checkRes = await checkCustomDomainAvailability(checkDomainParam, websiteIdParam);
        return NextResponse.json({
          success: true,
          baseDomain: BASE_DOMAIN,
          baseUrl: getBaseUrl(request),
          ...checkRes,
        });
      }
      const checkRes = await checkDomainAvailability(checkDomainParam, websiteIdParam);
      return NextResponse.json({
        success: true,
        baseDomain: BASE_DOMAIN,
        baseUrl: getBaseUrl(request),
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

    const dynamicBaseUrl = getBaseUrl(request);

    // 2. If specific website requested by ID, domain, subdomain, or slug
    const targetIdentifier = websiteIdParam || domainParam;
    if (targetIdentifier && targetIdentifier !== 'new') {
      const cleanIdent = String(targetIdentifier).trim().toLowerCase();
      const isNum = /^[0-9]+$/.test(cleanIdent);

      const singleRes = await queryDb(
        `SELECT w.*, 
                w.name AS site_title,
                ws.motto AS tagline,
                ws.motto,
                ws.mission,
                ws.vision,
                ws.history,
                ws.map_url,
                ws.facebook_url,
                ws.twitter_url,
                ws.instagram_url,
                ws.youtube_url,
                p.name AS package_name,
                p.slug AS package_slug,
                s.id AS subscription_id,
                s.status AS subscription_status,
                s.billing_cycle AS subscription_billing_cycle,
                s.current_period_end AS subscription_period_end,
                COALESCE(w.contact_email, ws.contact_email) AS contact_email,
                COALESCE(w.contact_phone, ws.contact_phone) AS contact_phone, 
                COALESCE(w.address, ws.address) AS address,
                w.primary_color,
                (CASE WHEN w.status = 'active' AND w.is_maintenance_mode = false THEN true ELSE false END) AS is_published
         FROM websites w
         LEFT JOIN website_settings ws ON w.id = ws.website_id
         LEFT JOIN subscriptions s ON w.subscription_id = s.id
         LEFT JOIN packages p ON COALESCE(w.package_id, s.package_id) = p.id
         WHERE w.creator_id = $1 
           AND (
             ($2 = true AND w.id = $3::bigint) OR
             LOWER(w.slug) = LOWER($4) OR
             LOWER(w.subdomain) = LOWER($4) OR
             LOWER(w.custom_domain) = LOWER($4) OR
             LOWER(w.subdomain) LIKE LOWER($5)
           )
         LIMIT 1`,
        [creatorId, isNum, isNum ? Number(cleanIdent) : -1, cleanIdent, `${cleanIdent}.%`]
      );

      if (singleRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        baseDomain: BASE_DOMAIN || 'localhost:3000',
        baseUrl: dynamicBaseUrl,
        website: singleRes.rows[0],
      });
    }

    // 3. List all websites for creator linked with package and subscription
    const res = await queryDb(
      `SELECT w.*, 
              w.name AS site_title,
              ws.motto AS tagline,
              p.name AS package_name,
              p.slug AS package_slug,
              s.id AS subscription_id,
              s.status AS subscription_status,
              s.billing_cycle AS subscription_billing_cycle,
              s.current_period_end AS subscription_period_end,
              COALESCE(w.contact_email, ws.contact_email) AS contact_email,
              COALESCE(w.contact_phone, ws.contact_phone) AS contact_phone, 
              COALESCE(w.address, ws.address) AS address,
              w.primary_color,
              (CASE WHEN w.status = 'active' AND w.is_maintenance_mode = false THEN true ELSE false END) AS is_published
       FROM websites w
       LEFT JOIN website_settings ws ON w.id = ws.website_id
       LEFT JOIN subscriptions s ON w.subscription_id = s.id
       LEFT JOIN packages p ON COALESCE(w.package_id, s.package_id) = p.id
       WHERE w.creator_id = $1
       ORDER BY w.id DESC`,
      [creatorId]
    ).catch(() => ({ rows: [] }));

    return NextResponse.json({
      success: true,
      baseDomain: BASE_DOMAIN || 'localhost:3000',
      baseUrl: dynamicBaseUrl,
      websites: res.rows,
    });
  } catch (error) {
    console.error('Websites GET API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * Dispatches Website actions (create, setup, update, delete, check_domain, verify_custom_domain)
 */
export async function handleWebsitesAction(body, sessionCreator, request = null) {
  const { action } = body;
  const creatorId = Number(body.creatorId || sessionCreator?.id);

  // Allow check_domain even before auth if user is checking in the UI
  if (action === 'check_domain') {
    const domainToCheck = body.domain || body.subdomain || body.customDomain || '';
    const websiteId = body.websiteId || body.id || null;
    const isCustom = body.type === 'custom' || Boolean(body.customDomain);

    if (isCustom) {
      const checkRes = await checkCustomDomainAvailability(domainToCheck, websiteId, request);
      return NextResponse.json({
        success: true,
        baseDomain: BASE_DOMAIN,
        baseUrl: getBaseUrl(request),
        ...checkRes,
      });
    }

    const checkRes = await checkDomainAvailability(domainToCheck, websiteId, request);
    return NextResponse.json({
      success: true,
      baseDomain: BASE_DOMAIN,
      baseUrl: getBaseUrl(request),
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

    const rawDomain = (body.subdomain || body.domain || body.customDomain || '').trim();
    if (!rawDomain) {
      return NextResponse.json({ success: false, error: 'Subdomain prefix is required.' }, { status: 400 });
    }

    // Check subdomain availability
    const domainValidation = await checkDomainAvailability(rawDomain, null, request);
    if (!domainValidation.available) {
      return NextResponse.json({
        success: false,
        error: domainValidation.error || 'Requested subdomain is not available. Please choose another prefix.',
      }, { status: 400 });
    }

    const cleanSubdomain = domainValidation.domain;
    const fullSubdomain = domainValidation.fullDomain || `${cleanSubdomain}.${baseDomain}`;
    const slug = cleanSubdomain;

    // Check and validate subscription selection & website limits
    const requestedSubId = Number(body.subscriptionId || body.subscription_id || 0);
    let chosenSub = null;

    if (requestedSubId > 0) {
      const subRes = await queryDb(
        `SELECT s.*, p.name AS package_name, COALESCE(p.max_websites, 1) AS max_websites, p.id AS pkg_id
         FROM subscriptions s
         JOIN packages p ON s.package_id = p.id
         WHERE s.id = $1 AND s.creator_id = $2
         LIMIT 1`,
        [requestedSubId, creatorId]
      );

      if (subRes.rows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'The selected subscription does not exist or does not belong to your account.',
        }, { status: 404 });
      }

      chosenSub = subRes.rows[0];

      const isActiveStatus = ['completed', 'active'].includes(String(chosenSub.status || '').toLowerCase());
      const isPeriodValid = !chosenSub.current_period_end || new Date(chosenSub.current_period_end) > new Date();

      if (!isActiveStatus || !isPeriodValid) {
        return NextResponse.json({
          success: false,
          error: `Selected subscription (${chosenSub.package_name}) is inactive or expired. Please renew your subscription to create websites.`,
        }, { status: 403 });
      }

      // Check quota specifically for this chosen subscription
      const countRes = await queryDb(
        `SELECT COUNT(*)::int AS count 
         FROM websites 
         WHERE creator_id = $1 
           AND (subscription_id = $2 OR (subscription_id IS NULL AND package_id = $3))`,
        [creatorId, chosenSub.id, chosenSub.package_id]
      );
      const usedCount = countRes.rows[0].count;
      const maxLimit = Number(chosenSub.max_websites || 1);

      if (usedCount >= maxLimit) {
        return NextResponse.json({
          success: false,
          error: `Your subscription for "${chosenSub.package_name}" allows a maximum of ${maxLimit} website(s). You have already created ${usedCount} website(s) for this subscription.`,
        }, { status: 403 });
      }
    } else {
      // Auto-select an active subscription that has remaining website creation capacity
      const allActiveSubsRes = await queryDb(
        `SELECT s.*, p.name AS package_name, COALESCE(p.max_websites, 1) AS max_websites, p.id AS pkg_id,
                (SELECT COUNT(*)::int FROM websites w WHERE w.creator_id = $1 AND (w.subscription_id = s.id OR (w.subscription_id IS NULL AND w.package_id = s.package_id))) AS current_count
         FROM subscriptions s
         JOIN packages p ON s.package_id = p.id
         WHERE s.creator_id = $1
           AND s.status IN ('completed', 'active')
           AND (s.current_period_end IS NULL OR s.current_period_end > CURRENT_TIMESTAMP)
         ORDER BY s.id DESC`,
        [creatorId]
      );

      const availableSub = allActiveSubsRes.rows.find((s) => Number(s.current_count) < Number(s.max_websites || 1));

      if (!availableSub) {
        if (allActiveSubsRes.rows.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'An active package subscription is required to create a website. Please purchase a package first.',
          }, { status: 403 });
        } else {
          return NextResponse.json({
            success: false,
            error: 'All your active subscriptions have reached their website creation limits. Please upgrade or purchase an additional package.',
          }, { status: 403 });
        }
      }

      chosenSub = availableSub;
    }

    const primaryColor = body.primaryColor || body.primary_color || body.themeConfig?.primaryColor || '#1e40af';
    const themeName = body.theme || body.themeConfig?.mode || 'default';

    const res = await queryDb(
      `INSERT INTO websites (
         creator_id,
         package_id,
         subscription_id,
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
         is_maintenance_mode,
         subscription_expires_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, NULL, FALSE, $7, $8, 'active', $9, $10, $11, $12, $13, 15, FALSE, $14
       ) RETURNING *`,
      [
        creatorId,
        chosenSub.pkg_id || chosenSub.package_id || null,
        chosenSub.id,
        name,
        slug,
        cleanSubdomain,
        institutionType,
        eiinNumber || null,
        themeName,
        primaryColor,
        contactEmail || null,
        contactPhone || null,
        address || null,
        chosenSub.current_period_end || null,
      ]
    );

    const newWebsite = res.rows[0];

    // Link subscription's website_id if not already pointing to a website
    await queryDb(
      `UPDATE subscriptions 
       SET website_id = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND website_id IS NULL`,
      [newWebsite.id, chosenSub.id]
    ).catch(() => {});

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
      fullDomain: fullSubdomain,
      subdomain: cleanSubdomain,
    });
  }

  // 2. Update Website (Data, Subdomain, or Custom Domain)
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

    // Subdomain change
    if (body.subdomain !== undefined) {
      const rawSub = String(body.subdomain).trim().toLowerCase();
      if (rawSub) {
        const valRes = await checkDomainAvailability(rawSub, id, request);
        if (!valRes.available) {
          return NextResponse.json({ success: false, error: valRes.error }, { status: 400 });
        }
        updates.push(`subdomain = $${idx++}`);
        values.push(valRes.domain);
        updates.push(`slug = $${idx++}`);
        values.push(valRes.domain);
      }
    }

    // Custom domain change (like WordPress / web builders)
    if (body.custom_domain !== undefined || body.customDomain !== undefined) {
      const rawCustom = (body.custom_domain !== undefined ? body.custom_domain : body.customDomain);
      if (!rawCustom || String(rawCustom).trim() === '') {
        // Disconnect custom domain
        updates.push(`custom_domain = NULL`);
        updates.push(`custom_domain_verified = FALSE`);
      } else {
        const valRes = await checkCustomDomainAvailability(String(rawCustom).trim(), id, request);
        if (!valRes.available) {
          return NextResponse.json({ success: false, error: valRes.error }, { status: 400 });
        }
        updates.push(`custom_domain = $${idx++}`);
        values.push(valRes.customDomain);
        if (body.custom_domain_verified !== undefined) {
          updates.push(`custom_domain_verified = $${idx++}`);
          values.push(Boolean(body.custom_domain_verified));
        }
      }
    }

    if (body.custom_domain_verified !== undefined && body.custom_domain === undefined && body.customDomain === undefined) {
      updates.push(`custom_domain_verified = $${idx++}`);
      values.push(Boolean(body.custom_domain_verified));
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

    if (body.theme !== undefined) {
      updates.push(`theme = $${idx++}`);
      values.push(body.theme);
    }

    if (body.logo !== undefined) {
      updates.push(`logo = $${idx++}`);
      values.push(body.logo);
    }

    if (body.favicon !== undefined) {
      updates.push(`favicon = $${idx++}`);
      values.push(body.favicon);
    }

    if (body.status !== undefined) {
      updates.push(`status = $${idx++}`);
      values.push(body.status);
    }

    if (body.is_maintenance_mode !== undefined) {
      updates.push(`is_maintenance_mode = $${idx++}`);
      values.push(Boolean(body.is_maintenance_mode));
    }

    if (body.is_published !== undefined) {
      const isPub = Boolean(body.is_published);
      updates.push(`status = $${idx++}`);
      values.push(isPub ? 'active' : 'suspended');
      updates.push(`is_maintenance_mode = $${idx++}`);
      values.push(!isPub);
    }

    if (updates.length > 0) {
      values.push(id, creatorId);
      const res = await queryDb(
        `UPDATE websites SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx++} AND creator_id = $${idx++} RETURNING *`,
        values
      );

      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Website not found or unauthorized.' }, { status: 404 });
      }
    }

    // Synchronize website_settings
    const settingUpdates = [];
    const settingValues = [];
    let sIdx = 1;

    if (body.contact_email !== undefined || body.email !== undefined || body.mail !== undefined) {
      settingUpdates.push(`contact_email = $${sIdx++}`);
      settingValues.push(body.contact_email || body.email || body.mail);
    }
    if (body.contact_phone !== undefined || body.phone !== undefined || body.contactNumber !== undefined) {
      settingUpdates.push(`contact_phone = $${sIdx++}`);
      settingValues.push(body.contact_phone || body.phone || body.contactNumber);
    }
    if (body.address !== undefined) {
      settingUpdates.push(`address = $${sIdx++}`);
      settingValues.push(body.address);
    }
    if (body.tagline !== undefined || body.motto !== undefined) {
      settingUpdates.push(`motto = $${sIdx++}`);
      settingValues.push(body.tagline || body.motto);
    }
    if (body.mission !== undefined) {
      settingUpdates.push(`mission = $${sIdx++}`);
      settingValues.push(body.mission);
    }
    if (body.vision !== undefined) {
      settingUpdates.push(`vision = $${sIdx++}`);
      settingValues.push(body.vision);
    }
    if (body.history !== undefined) {
      settingUpdates.push(`history = $${sIdx++}`);
      settingValues.push(body.history);
    }
    if (body.map_url !== undefined) {
      settingUpdates.push(`map_url = $${sIdx++}`);
      settingValues.push(body.map_url);
    }
    if (body.facebook_url !== undefined) {
      settingUpdates.push(`facebook_url = $${sIdx++}`);
      settingValues.push(body.facebook_url);
    }
    if (body.twitter_url !== undefined) {
      settingUpdates.push(`twitter_url = $${sIdx++}`);
      settingValues.push(body.twitter_url);
    }
    if (body.instagram_url !== undefined) {
      settingUpdates.push(`instagram_url = $${sIdx++}`);
      settingValues.push(body.instagram_url);
    }
    if (body.youtube_url !== undefined) {
      settingUpdates.push(`youtube_url = $${sIdx++}`);
      settingValues.push(body.youtube_url);
    }

    if (settingUpdates.length > 0) {
      settingValues.push(id);
      await queryDb(`
        UPDATE website_settings
        SET ${settingUpdates.join(', ')},
            updated_at = CURRENT_TIMESTAMP
        WHERE website_id = $${sIdx++}
      `, settingValues).catch(async () => {
        // If row doesn't exist yet, insert it
        await queryDb(`
          INSERT INTO website_settings (website_id, contact_email, contact_phone, address, motto)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (website_id) DO NOTHING
        `, [id, body.contact_email || null, body.contact_phone || null, body.address || null, body.tagline || body.motto || null]);
      });
    }

    // Fetch refreshed website with settings
    const refreshed = await queryDb(
      `SELECT w.*, 
              w.name AS site_title,
              ws.motto AS tagline,
              ws.motto,
              ws.mission,
              ws.vision,
              ws.history,
              ws.map_url,
              ws.facebook_url,
              ws.twitter_url,
              ws.instagram_url,
              ws.youtube_url,
              COALESCE(w.contact_email, ws.contact_email) AS contact_email,
              COALESCE(w.contact_phone, ws.contact_phone) AS contact_phone, 
              COALESCE(w.address, ws.address) AS address,
              w.primary_color,
              (CASE WHEN w.status = 'active' AND w.is_maintenance_mode = false THEN true ELSE false END) AS is_published
       FROM websites w
       LEFT JOIN website_settings ws ON w.id = ws.website_id
       WHERE w.id = $1 AND w.creator_id = $2
       LIMIT 1`,
      [id, creatorId]
    );

    const updated = refreshed.rows[0] || {};

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

  // 3. Verify Custom Domain
  if (action === 'verify_custom_domain') {
    const id = Number(body.id || body.websiteId);
    if (!id) {
      return NextResponse.json({ success: false, error: 'Website ID is required.' }, { status: 400 });
    }

    const checkRes = await queryDb('SELECT custom_domain FROM websites WHERE id = $1 AND creator_id = $2', [id, creatorId]);
    if (checkRes.rows.length === 0 || !checkRes.rows[0].custom_domain) {
      return NextResponse.json({ success: false, error: 'Please enter a custom domain first before verifying.' }, { status: 400 });
    }

    await queryDb('UPDATE websites SET custom_domain_verified = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND creator_id = $2', [id, creatorId]);

    return NextResponse.json({
      success: true,
      message: `Custom domain "${checkRes.rows[0].custom_domain}" verified and activated successfully!`,
      custom_domain_verified: true,
    });
  }

  // 4. Delete Website
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
