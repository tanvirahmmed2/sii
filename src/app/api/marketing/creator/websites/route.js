import { NextResponse } from 'next/server.js';
import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import { queryDb } from '../../../../../lib/database/db.js';
import { getCreatorSession } from '../../../../../lib/middleware/creator.js';
import { BASE_DOMAIN, getBaseUrl, CUSTOM_DOMAIN_CNAME_TARGET, CUSTOM_DOMAIN_A_TARGET } from '../../../../../lib/database/secret.js';
import { uploadImage, deleteImage, uploadPdf } from '../../../../../lib/database/cloudinary.js';
import { checkDomainAvailability, checkCustomDomainAvailability } from './check-domain/route.js';

export const dynamic = 'force-dynamic';

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

export async function GET(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const { searchParams } = new URL(request.url);
    const creatorIdParam = searchParams.get('creatorId');
    const websiteIdParam = searchParams.get('id');
    const domainParam = searchParams.get('domain') || searchParams.get('subdomain') || searchParams.get('slug') || searchParams.get('website');
    const checkDomainParam = searchParams.get('checkDomain');

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

    const targetIdentifier = websiteIdParam || domainParam;
    if (targetIdentifier && targetIdentifier !== 'new') {
      const cleanIdent = String(targetIdentifier).trim().toLowerCase();
      const isNum = /^[0-9]+$/.test(cleanIdent);

      const singleRes = await queryDb(
        `SELECT w.*, 
                w.name AS site_title,
                ('Excellence in ' || COALESCE(w.institution_type, 'Education')) AS tagline,
                ('Excellence in ' || COALESCE(w.institution_type, 'Education')) AS motto,
                '' AS mission,
                '' AS vision,
                '' AS history,
                '' AS map_url,
                COALESCE(w.facebook_url, '') AS facebook_url,
                COALESCE(w.twitter_url, '') AS twitter_url,
                COALESCE(w.instagram_url, '') AS instagram_url,
                COALESCE(w.youtube_url, '') AS youtube_url,
                COALESCE(w.linkedin_url, '') AS linkedin_url,
                p.id AS package_id,
                p.name AS package_name,
                p.slug AS package_slug,
                p.short_description AS package_short_description,
                p.description AS package_description,
                p.tagline AS package_tagline,
                p.monthly_price_usd AS package_monthly_price_usd,
                p.yearly_price_usd AS package_yearly_price_usd,
                p.monthly_price_bdt AS package_monthly_price_bdt,
                p.yearly_price_bdt AS package_yearly_price_bdt,
                p.monthly_price AS package_monthly_price,
                p.yearly_price AS package_yearly_price,
                p.discount_percentage AS package_discount_percentage,
                p.max_students AS package_max_students,
                p.max_teachers AS package_max_teachers,
                p.max_staff AS package_max_staff,
                p.max_storage_mb AS package_max_storage_mb,
                p.monthly_mail AS package_monthly_mail,
                p.monthly_sms AS package_monthly_sms,
                p.is_available_student_panel AS package_is_available_student_panel,
                p.is_available_teacher_panel AS package_is_available_teacher_panel,
                p.is_available_custom_domain AS package_is_available_custom_domain,
                p.features AS package_features,
                p.grace_period AS package_grace_period,
                s.id AS subscription_id,
                s.status AS subscription_status,
                s.billing_cycle AS subscription_billing_cycle,
                s.current_period_end AS subscription_period_end,
                (CASE WHEN w.status = 'active' AND w.is_maintenance_mode = false THEN true ELSE false END) AS is_published,
                COALESCE(
                  (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.is_primary = TRUE LIMIT 1),
                  (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'subdomain' LIMIT 1),
                  w.slug
                ) AS subdomain,
                (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'custom_domain' LIMIT 1) AS custom_domain,
                (SELECT COALESCE(wd.is_verified, FALSE) FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'custom_domain' LIMIT 1) AS custom_domain_verified,
                (SELECT row_to_json(wd.*) FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'custom_domain' LIMIT 1) AS custom_domain_record,
                (SELECT row_to_json(wi.*) FROM website_information wi WHERE wi.website_id = w.id LIMIT 1) AS website_information,
                (SELECT json_agg(wd.*) FROM website_domains wd WHERE wd.website_id = w.id) AS domains
         FROM websites w
         LEFT JOIN subscriptions s ON w.subscription_id = s.id
         LEFT JOIN packages p ON s.package_id = p.id
         WHERE w.creator_id = $1 
           AND (
             ($2 = true AND w.id = $3::bigint) OR
             LOWER(w.slug) = LOWER($4) OR
             EXISTS (
               SELECT 1 FROM website_domains wd 
               WHERE wd.website_id = w.id 
                 AND (
                   LOWER(wd.domain) = LOWER($4) 
                   OR LOWER(COALESCE(wd.domain_name, '')) = LOWER($4)
                   OR LOWER(wd.domain) LIKE LOWER($5)
                 )
             )
           )
         LIMIT 1`,
        [creatorId, isNum, isNum ? Number(cleanIdent) : -1, cleanIdent, `${cleanIdent}.%`]
      );

      if (singleRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
      }

      const site = singleRes.rows[0];
      let allowedHomeModules = [];
      let allowedControlModules = [];

      if (site.package_id) {
        const [hmRes, cmRes] = await Promise.all([
          queryDb(
            `SELECT hm.id, hm.name, hm.path, hm.category, hm.description, hm.icon, hm.is_active, hm.display_order
             FROM package_home_modules phm
             JOIN website_home_modules hm ON hm.id = phm.home_module_id
             WHERE phm.package_id = $1 AND hm.is_active = TRUE
             ORDER BY hm.display_order ASC, hm.id ASC`,
            [site.package_id]
          ).catch(() => ({ rows: [] })),
          queryDb(
            `SELECT cm.id, cm.name, cm.path, cm.category, cm.description, cm.icon, cm.is_active, cm.display_order
             FROM package_control_modules pcm
             JOIN website_control_modules cm ON cm.id = pcm.control_module_id
             WHERE pcm.package_id = $1 AND cm.is_active = TRUE
             ORDER BY cm.display_order ASC, cm.id ASC`,
            [site.package_id]
          ).catch(() => ({ rows: [] }))
        ]);
        allowedHomeModules = hmRes.rows || [];
        allowedControlModules = cmRes.rows || [];
      }

      if (allowedHomeModules.length === 0) {
        const allHmRes = await queryDb(
          `SELECT hm.id, hm.name, hm.path, hm.category, hm.description, hm.icon, hm.is_active, hm.display_order
           FROM website_home_modules hm
           WHERE hm.is_active = TRUE
           ORDER BY hm.display_order ASC, hm.id ASC`
        ).catch(() => ({ rows: [] }));
        allowedHomeModules = allHmRes.rows || [];
      }

      if (allowedControlModules.length === 0) {
        const allCmRes = await queryDb(
          `SELECT cm.id, cm.name, cm.path, cm.category, cm.description, cm.icon, cm.is_active, cm.display_order
           FROM website_control_modules cm
           WHERE cm.is_active = TRUE
           ORDER BY cm.display_order ASC, cm.id ASC`
        ).catch(() => ({ rows: [] }));
        allowedControlModules = allCmRes.rows || [];
      }

      site.package = {
        id: site.package_id,
        name: site.package_name,
        slug: site.package_slug,
        short_description: site.package_short_description,
        description: site.package_description,
        tagline: site.package_tagline,
        monthly_price_usd: site.package_monthly_price_usd,
        yearly_price_usd: site.package_yearly_price_usd,
        monthly_price_bdt: site.package_monthly_price_bdt,
        yearly_price_bdt: site.package_yearly_price_bdt,
        monthly_price: site.package_monthly_price,
        yearly_price: site.package_yearly_price,
        discount_percentage: site.package_discount_percentage,
        max_students: site.package_max_students,
        max_teachers: site.package_max_teachers,
        max_staff: site.package_max_staff,
        max_storage_mb: site.package_max_storage_mb,
        monthly_mail: site.package_monthly_mail,
        monthly_sms: site.package_monthly_sms,
        is_available_student_panel: site.package_is_available_student_panel ?? true,
        is_available_teacher_panel: site.package_is_available_teacher_panel ?? true,
        is_available_custom_domain: site.package_is_available_custom_domain ?? false,
        features: site.package_features || [],
        grace_period: site.package_grace_period,
        subscription_id: site.subscription_id,
        subscription_status: site.subscription_status,
        subscription_billing_cycle: site.subscription_billing_cycle,
        subscription_period_end: site.subscription_period_end,
      };

      site.allowed_home_modules = allowedHomeModules;
      site.allowed_control_modules = allowedControlModules;
      site.is_available_student_panel = site.package.is_available_student_panel;
      site.is_available_teacher_panel = site.package.is_available_teacher_panel;
      site.is_available_custom_domain = site.package.is_available_custom_domain;

      return NextResponse.json({
        success: true,
        baseDomain: BASE_DOMAIN || 'localhost:3000',
        baseUrl: dynamicBaseUrl,
        cnameTarget: CUSTOM_DOMAIN_CNAME_TARGET,
        aTarget: CUSTOM_DOMAIN_A_TARGET,
        website: site,
      });
    }

    const res = await queryDb(
      `SELECT w.*, 
              w.name AS site_title,
              ('Excellence in ' || COALESCE(w.institution_type, 'Education')) AS tagline,
              p.name AS package_name,
              p.slug AS package_slug,
              s.id AS subscription_id,
              s.status AS subscription_status,
              s.billing_cycle AS subscription_billing_cycle,
              s.current_period_end AS subscription_period_end,
              (CASE WHEN w.status = 'active' AND w.is_maintenance_mode = false THEN true ELSE false END) AS is_published,
              COALESCE(
                (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.is_primary = TRUE LIMIT 1),
                (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'subdomain' LIMIT 1),
                w.slug
              ) AS subdomain,
              (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'custom_domain' LIMIT 1) AS custom_domain,
              (SELECT COALESCE(wd.is_verified, FALSE) FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'custom_domain' LIMIT 1) AS custom_domain_verified,
              (SELECT row_to_json(wd.*) FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'custom_domain' LIMIT 1) AS custom_domain_record,
              (SELECT row_to_json(wi.*) FROM website_information wi WHERE wi.website_id = w.id LIMIT 1) AS website_information
       FROM websites w
       LEFT JOIN subscriptions s ON w.subscription_id = s.id
       LEFT JOIN packages p ON s.package_id = p.id
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

export async function handleWebsitesAction(body, sessionCreator, request = null) {
  const { action } = body;
  const creatorId = Number(body.creatorId || sessionCreator?.id);

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

  const baseDomain = BASE_DOMAIN || 'localhost:3000';

  if (action === 'upload_document' || action === 'upload_pdf' || action === 'upload_verification') {
    const fileInput = body.file || body.pdf || body.data;
    if (!fileInput) {
      return NextResponse.json({ success: false, error: 'Document data is required.' }, { status: 400 });
    }
    const folder = `school/verification/${creatorId}`;
    try {
      const uploadRes = await uploadPdf(fileInput, folder);
      return NextResponse.json({
        success: true,
        message: 'PDF document uploaded successfully to Cloudinary.',
        url: uploadRes.secure_url || uploadRes.url,
        publicId: uploadRes.publicId,
        format: uploadRes.format,
        bytes: uploadRes.bytes,
        originalFilename: uploadRes.original_filename || body.fileName || 'certificate.pdf',
      });
    } catch (upErr) {
      console.error('Cloudinary document upload error:', upErr);
      return NextResponse.json({ success: false, error: `Failed to upload document to Cloudinary: ${upErr.message}` }, { status: 500 });
    }
  }

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

    const requestedSubId = Number(body.subscriptionId || body.subscription_id || 0);
    let chosenSub = null;

    if (requestedSubId > 0) {
      const subRes = await queryDb(
        `SELECT s.*, p.name AS package_name, 1 AS max_websites, p.id AS pkg_id
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

      const countRes = await queryDb(
        `SELECT COUNT(*)::int AS count 
         FROM websites 
         WHERE creator_id = $1 
           AND subscription_id = $2`,
        [creatorId, chosenSub.id]
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
      const allActiveSubsRes = await queryDb(
        `SELECT s.*, p.name AS package_name, 1 AS max_websites, p.id AS pkg_id,
                (SELECT COUNT(*)::int FROM websites w WHERE w.creator_id = $1 AND w.subscription_id = s.id) AS current_count
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
    const secondaryColor = body.secondaryColor || body.secondary_color || body.themeConfig?.secondaryColor || '#0ea5e9';
    const themeName = body.theme || body.themeConfig?.mode || 'default';
    const currency = (body.currency || 'BDT').toString().trim().toUpperCase();
    const isMaintenanceMode = Boolean(body.is_maintenance_mode !== undefined ? body.is_maintenance_mode : (body.isMaintenanceMode || false));
    const maintenanceMessage = (body.maintenance_message || body.maintenanceMessage || 'Our campus portal is temporarily under scheduled maintenance. Please check back shortly.').toString().trim();

    let initialLogo = null;
    let initialLogoId = null;
    if (body.logo && typeof body.logo === 'string' && body.logo.startsWith('data:image/')) {
      try {
        const up = await uploadImage(body.logo, 'school/branding');
        initialLogo = up.url;
        initialLogoId = up.publicId;
      } catch (err) {
        console.warn('Initial logo upload warning:', err.message);
      }
    } else if (body.logo) {
      initialLogo = String(body.logo).trim();
      initialLogoId = body.logo_id ? String(body.logo_id).trim() : null;
    }

    let initialFavicon = null;
    let initialFaviconId = null;
    if (body.favicon && typeof body.favicon === 'string' && (body.favicon.startsWith('data:image/') || body.favicon.startsWith('data:application/'))) {
      try {
        const up = await uploadImage(body.favicon, 'school/branding');
        initialFavicon = up.url;
        initialFaviconId = up.publicId;
      } catch (err) {
        console.warn('Initial favicon upload warning:', err.message);
      }
    } else if (body.favicon) {
      initialFavicon = String(body.favicon).trim();
      initialFaviconId = body.favicon_id ? String(body.favicon_id).trim() : null;
    }

    const res = await queryDb(
      `INSERT INTO websites (
         creator_id,
         subscription_id,
         name,
         slug,
         institution_type,
         eiin_number,
         status,
         theme,
         primary_color,
         secondary_color,
         contact_email,
         contact_phone,
         address,
         currency,
         logo,
         logo_id,
         favicon,
         favicon_id,
         storage_used_mb,
         is_maintenance_mode,
         maintenance_message,
         subscription_expires_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, 'active', $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 15, $18, $19, $20
       ) RETURNING *`,
      [
        creatorId,
        chosenSub.id,
        name,
        slug,
        institutionType,
        eiinNumber || null,
        themeName,
        primaryColor,
        secondaryColor,
        contactEmail || null,
        contactPhone || null,
        address || null,
        currency,
        initialLogo,
        initialLogoId,
        initialFavicon,
        initialFaviconId,
        isMaintenanceMode,
        maintenanceMessage,
        chosenSub.current_period_end || null,
      ]
    );

    const newWebsite = res.rows[0];

    await queryDb(
      `INSERT INTO website_domains (
         website_id, domain_type, domain, domain_name, is_primary, is_verified,
         dns_record_type, dns_record_value
       ) VALUES ($1, 'subdomain', $2, $2, TRUE, TRUE, 'CNAME', 'domains.hiesci.com')`,
      [newWebsite.id, cleanSubdomain]
    );

    const customDomainInput = (body.customDomain || body.custom_domain || '').trim().toLowerCase();
    if (customDomainInput) {
      const dnsRecords = JSON.stringify([
        { type: 'CNAME', host: '@', value: 'domains.hiesci.com' },
        { type: 'CNAME', host: 'www', value: 'domains.hiesci.com' }
      ]);
      await queryDb(
        `INSERT INTO website_domains (
           website_id, domain_type, domain, domain_name, is_primary, is_verified,
           dns_record_type, dns_record_value, dns_records
         ) VALUES ($1, 'custom_domain', $2, $2, FALSE, FALSE, 'CNAME', 'domains.hiesci.com', $3::jsonb)`,
        [newWebsite.id, customDomainInput, dnsRecords]
      ).catch((e) => console.warn('Custom domain insert warning:', e.message));
    }

    const creatorNid = (body.creatorNid || body.creator_nid || '').trim();
    let creatorNidUrl = (body.creatorNidUrl || body.creator_nid_url || '').trim();
    if (creatorNidUrl.startsWith('data:')) {
      try {
        const up = creatorNidUrl.startsWith('data:application/pdf')
          ? await uploadPdf(creatorNidUrl, `school/verification/${creatorId}`)
          : await uploadImage(creatorNidUrl, `school/verification/${creatorId}`);
        creatorNidUrl = up.secure_url || up.url;
      } catch (err) {
        console.warn('Creator NID upload warning:', err.message);
      }
    }

    const eiinCertificate = (body.eiinCertificate || body.eiin_certificate || '').trim();
    let eiinCertificateUrl = (body.eiinCertificateUrl || body.eiin_certificate_url || '').trim();
    if (eiinCertificateUrl.startsWith('data:application/pdf') || eiinCertificateUrl.startsWith('data:')) {
      try {
        const up = await uploadPdf(eiinCertificateUrl, `school/verification/${creatorId}`);
        eiinCertificateUrl = up.secure_url || up.url;
      } catch (err) {
        console.warn('EIIN certificate upload warning during creation:', err.message);
      }
    }
    const verificationAddress = (body.verificationAddress || body.verification_address || address || '').trim();
    const otherDetails = typeof body.otherDetails === 'object' && body.otherDetails !== null
      ? JSON.stringify(body.otherDetails)
      : (typeof body.other_details === 'object' && body.other_details !== null ? JSON.stringify(body.other_details) : '{}');

    await queryDb(
      `INSERT INTO website_information (
         website_id, creator_nid, creator_nid_url, eiin_certificate, eiin_certificate_url, address, other_details, verification_status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'pending')
       ON CONFLICT (website_id) DO UPDATE SET
         creator_nid = EXCLUDED.creator_nid,
         creator_nid_url = EXCLUDED.creator_nid_url,
         eiin_certificate = EXCLUDED.eiin_certificate,
         eiin_certificate_url = EXCLUDED.eiin_certificate_url,
         address = EXCLUDED.address,
         other_details = EXCLUDED.other_details,
         updated_at = CURRENT_TIMESTAMP`,
      [
        newWebsite.id,
        creatorNid || null,
        creatorNidUrl || null,
        eiinCertificate || null,
        eiinCertificateUrl || null,
        verificationAddress || null,
        otherDetails
      ]
    ).catch((e) => console.warn('website_information insert warning:', e.message));

    await queryDb(
      `UPDATE subscriptions 
       SET website_id = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND website_id IS NULL`,
      [newWebsite.id, chosenSub.id]
    ).catch(() => {});

    await seedWebsiteDefaults(newWebsite.id, newWebsite.name, { primaryColor, secondaryColor, theme: themeName }, {
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
        subdomain: cleanSubdomain,
        custom_domain: customDomainInput || null,
        is_published: true,
      },
      baseDomain,
      fullDomain: fullSubdomain,
      subdomain: cleanSubdomain,
      customDomain: customDomainInput || null,
    });
  }

  if (action === 'upload_branding') {
    const websiteId = Number(body.websiteId || body.id);
    const type = body.type; 
    const imageInput = body.image || body.file || body.data;

    if (!websiteId || !type || !imageInput) {
      return NextResponse.json({ success: false, error: 'websiteId, type (logo or favicon), and image data are required.' }, { status: 400 });
    }

    const siteRes = await queryDb(
      `SELECT id, creator_id, logo, logo_id, favicon, favicon_id FROM websites WHERE id = $1 AND creator_id = $2 LIMIT 1`,
      [websiteId, creatorId]
    );
    if (siteRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Website not found or unauthorized.' }, { status: 404 });
    }
    const currentSite = siteRes.rows[0];

    const folder = type === 'logo' ? 'website_logos' : 'website_favicons';
    const oldPublicId = type === 'logo' ? currentSite.logo_id : currentSite.favicon_id;

    if (oldPublicId) {
      try {
        await deleteImage(oldPublicId);
      } catch (delErr) {
        console.warn(`Notice deleting old Cloudinary ${type}:`, delErr.message);
      }
    }

    let uploadRes;
    try {
      uploadRes = await uploadImage(imageInput, folder);
    } catch (upErr) {
      console.error(`Cloudinary ${type} upload error:`, upErr);
      return NextResponse.json({ success: false, error: `Failed to upload ${type} to Cloudinary: ${upErr.message}` }, { status: 500 });
    }

    const colUrl = type === 'logo' ? 'logo' : 'favicon';
    const colId = type === 'logo' ? 'logo_id' : 'favicon_id';

    const updRes = await queryDb(
      `UPDATE websites
       SET ${colUrl} = $1, ${colId} = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND creator_id = $4
       RETURNING *`,
      [uploadRes.url, uploadRes.publicId, websiteId, creatorId]
    );

    return NextResponse.json({
      success: true,
      message: `${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully.`,
      url: uploadRes.url,
      publicId: uploadRes.publicId,
      website: updRes.rows[0],
    });
  }

  if (action === 'remove_branding') {
    const websiteId = Number(body.websiteId || body.id);
    const type = body.type; 

    if (!websiteId || !type) {
      return NextResponse.json({ success: false, error: 'websiteId and type are required.' }, { status: 400 });
    }

    const siteRes = await queryDb(
      `SELECT id, creator_id, logo, logo_id, favicon, favicon_id FROM websites WHERE id = $1 AND creator_id = $2 LIMIT 1`,
      [websiteId, creatorId]
    );
    if (siteRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Website not found or unauthorized.' }, { status: 404 });
    }
    const currentSite = siteRes.rows[0];
    const oldPublicId = type === 'logo' ? currentSite.logo_id : currentSite.favicon_id;

    if (oldPublicId) {
      try {
        await deleteImage(oldPublicId);
      } catch (delErr) {
        console.warn(`Notice deleting Cloudinary ${type} on remove:`, delErr.message);
      }
    }

    const colUrl = type === 'logo' ? 'logo' : 'favicon';
    const colId = type === 'logo' ? 'logo_id' : 'favicon_id';

    const updRes = await queryDb(
      `UPDATE websites
       SET ${colUrl} = NULL, ${colId} = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND creator_id = $2
       RETURNING *`,
      [websiteId, creatorId]
    );

    return NextResponse.json({
      success: true,
      message: `${type === 'logo' ? 'Logo' : 'Favicon'} removed successfully.`,
      website: updRes.rows[0],
    });
  }

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

    if (body.facebook_url !== undefined || body.facebookUrl !== undefined) {
      const fbVal = body.facebook_url !== undefined ? body.facebook_url : body.facebookUrl;
      updates.push(`facebook_url = $${idx++}`);
      values.push(fbVal ? String(fbVal).trim() : null);
    }

    if (body.twitter_url !== undefined || body.twitterUrl !== undefined) {
      const twVal = body.twitter_url !== undefined ? body.twitter_url : body.twitterUrl;
      updates.push(`twitter_url = $${idx++}`);
      values.push(twVal ? String(twVal).trim() : null);
    }

    if (body.instagram_url !== undefined || body.instagramUrl !== undefined) {
      const igVal = body.instagram_url !== undefined ? body.instagram_url : body.instagramUrl;
      updates.push(`instagram_url = $${idx++}`);
      values.push(igVal ? String(igVal).trim() : null);
    }

    if (body.youtube_url !== undefined || body.youtubeUrl !== undefined) {
      const ytVal = body.youtube_url !== undefined ? body.youtube_url : body.youtubeUrl;
      updates.push(`youtube_url = $${idx++}`);
      values.push(ytVal ? String(ytVal).trim() : null);
    }

    if (body.linkedin_url !== undefined || body.linkedinUrl !== undefined) {
      const liVal = body.linkedin_url !== undefined ? body.linkedin_url : body.linkedinUrl;
      updates.push(`linkedin_url = $${idx++}`);
      values.push(liVal ? String(liVal).trim() : null);
    }

    if (body.subdomain !== undefined) {
      const rawSub = String(body.subdomain).trim().toLowerCase();
      if (rawSub) {
        const valRes = await checkDomainAvailability(rawSub, id, request);
        if (!valRes.available) {
          return NextResponse.json({ success: false, error: valRes.error }, { status: 400 });
        }
        updates.push(`slug = $${idx++}`);
        values.push(valRes.domain);
        await queryDb(
          `INSERT INTO website_domains (website_id, domain_type, domain, domain_name, is_primary, is_verified, dns_record_type, dns_record_value)
           VALUES ($1, 'subdomain', $2, $2, TRUE, TRUE, 'CNAME', 'domains.hiesci.com')
           ON CONFLICT (domain) DO UPDATE SET is_primary = TRUE, updated_at = CURRENT_TIMESTAMP`,
          [id, valRes.domain]
        ).catch(() => {});
      }
    }

    if (body.custom_domain !== undefined || body.customDomain !== undefined) {
      const rawCustom = (body.custom_domain !== undefined ? body.custom_domain : body.customDomain);
      if (!rawCustom || String(rawCustom).trim() === '') {
        await queryDb(`DELETE FROM website_domains WHERE website_id = $1 AND domain_type = 'custom_domain'`, [id]).catch(() => {});
      } else {
        const pkgCheck = await queryDb(
          `SELECT p.id, p.name, p.is_available_custom_domain
           FROM websites w
           LEFT JOIN subscriptions s ON w.subscription_id = s.id
           LEFT JOIN packages p ON s.package_id = p.id
           WHERE w.id = $1 AND w.creator_id = $2
           LIMIT 1`,
          [id, creatorId]
        );
        const sitePkg = pkgCheck.rows[0];
        if (!sitePkg || sitePkg.is_available_custom_domain !== true) {
          return NextResponse.json({
            success: false,
            error: `Custom domain connection is not included in your current subscription package ("${sitePkg?.name || 'Current Plan'}"). Please upgrade your plan to connect a custom domain.`,
          }, { status: 403 });
        }

        const valRes = await checkCustomDomainAvailability(String(rawCustom).trim(), id, request);
        if (!valRes.available) {
          return NextResponse.json({ success: false, error: valRes.error }, { status: 400 });
        }
        await queryDb(
          `INSERT INTO website_domains (website_id, domain_type, domain, domain_name, is_primary, is_verified, dns_record_type, dns_record_value)
           VALUES ($1, 'custom_domain', $2, $2, FALSE, FALSE, 'CNAME', 'domains.hiesci.com')
           ON CONFLICT (domain) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
          [id, valRes.customDomain]
        ).catch(() => {});
      }
    }

    if (
      body.creator_nid !== undefined || body.creatorNid !== undefined ||
      body.creator_nid_url !== undefined || body.creatorNidUrl !== undefined ||
      body.eiin_certificate !== undefined || body.eiinCertificate !== undefined ||
      body.eiin_certificate_url !== undefined || body.eiinCertificateUrl !== undefined ||
      body.verification_address !== undefined || body.verificationAddress !== undefined ||
      body.other_details !== undefined || body.otherDetails !== undefined
    ) {
      const cNid = body.creator_nid !== undefined ? body.creator_nid : body.creatorNid;
      const cNidUrl = body.creator_nid_url !== undefined ? body.creator_nid_url : body.creatorNidUrl;
      const eCert = body.eiin_certificate !== undefined ? body.eiin_certificate : body.eiinCertificate;
      const eCertUrl = body.eiin_certificate_url !== undefined ? body.eiin_certificate_url : body.eiinCertificateUrl;
      const vAddr = body.verification_address !== undefined ? body.verification_address : body.verificationAddress;
      const oDetails = body.other_details !== undefined ? body.other_details : body.otherDetails;

      await queryDb(
        `INSERT INTO website_information (
           website_id, creator_nid, creator_nid_url, eiin_certificate, eiin_certificate_url, address, other_details
         ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
         ON CONFLICT (website_id) DO UPDATE SET
           creator_nid = COALESCE(EXCLUDED.creator_nid, website_information.creator_nid),
           creator_nid_url = COALESCE(EXCLUDED.creator_nid_url, website_information.creator_nid_url),
           eiin_certificate = COALESCE(EXCLUDED.eiin_certificate, website_information.eiin_certificate),
           eiin_certificate_url = COALESCE(EXCLUDED.eiin_certificate_url, website_information.eiin_certificate_url),
           address = COALESCE(EXCLUDED.address, website_information.address),
           other_details = COALESCE(EXCLUDED.other_details, website_information.other_details),
           updated_at = CURRENT_TIMESTAMP`,
        [
          id,
          cNid || null,
          cNidUrl || null,
          eCert || null,
          eCertUrl || null,
          vAddr || null,
          typeof oDetails === 'object' && oDetails !== null ? JSON.stringify(oDetails) : '{}'
        ]
      ).catch(() => {});
    }

    const finalPrimaryColor = body.primary_color || body.primaryColor || (typeof body.theme_config === 'object' ? body.theme_config?.primaryColor : undefined);
    if (finalPrimaryColor !== undefined) {
      updates.push(`primary_color = $${idx++}`);
      values.push(finalPrimaryColor);
    }

    const finalSecondaryColor = body.secondary_color || body.secondaryColor || (typeof body.theme_config === 'object' ? body.theme_config?.secondaryColor : undefined);
    if (finalSecondaryColor !== undefined) {
      updates.push(`secondary_color = $${idx++}`);
      values.push(finalSecondaryColor);
    }

    const finalTheme = body.theme || (typeof body.theme_config === 'object' ? (body.theme_config?.mode || body.theme_config?.theme) : undefined);
    if (finalTheme !== undefined) {
      updates.push(`theme = $${idx++}`);
      values.push(finalTheme);
    }

    let currentSiteForBranding = null;
    if (
      body.logo !== undefined ||
      body.removeLogo ||
      body.favicon !== undefined ||
      body.removeFavicon
    ) {
      const siteCheck = await queryDb(
        `SELECT id, logo, logo_id, favicon, favicon_id FROM websites WHERE id = $1 AND creator_id = $2 LIMIT 1`,
        [id, creatorId]
      );
      currentSiteForBranding = siteCheck.rows[0] || null;
    }

    if (body.removeLogo || body.logo === '' || body.logo === null) {
      if (currentSiteForBranding?.logo_id) {
        try { await deleteImage(currentSiteForBranding.logo_id); } catch (_) {}
      }
      updates.push(`logo = NULL`);
      updates.push(`logo_id = NULL`);
    } else if (body.logo !== undefined) {
      const logoInput = String(body.logo).trim();
      if (logoInput.startsWith('data:image')) {
        if (currentSiteForBranding?.logo_id) {
          try { await deleteImage(currentSiteForBranding.logo_id); } catch (_) {}
        }
        try {
          const uploadRes = await uploadImage(logoInput, 'website_logos');
          updates.push(`logo = $${idx++}`);
          values.push(uploadRes.url);
          updates.push(`logo_id = $${idx++}`);
          values.push(uploadRes.publicId);
        } catch (logoErr) {
          console.error('Cloudinary logo upload error during website update:', logoErr);
        }
      } else if (logoInput) {
        if (body.logo_id !== undefined && body.logo_id !== currentSiteForBranding?.logo_id && currentSiteForBranding?.logo_id) {
          try { await deleteImage(currentSiteForBranding.logo_id); } catch (_) {}
        }
        updates.push(`logo = $${idx++}`);
        values.push(logoInput);
        if (body.logo_id !== undefined) {
          updates.push(`logo_id = $${idx++}`);
          values.push(body.logo_id);
        }
      }
    }

    if (body.removeFavicon || body.favicon === '' || body.favicon === null) {
      if (currentSiteForBranding?.favicon_id) {
        try { await deleteImage(currentSiteForBranding.favicon_id); } catch (_) {}
      }
      updates.push(`favicon = NULL`);
      updates.push(`favicon_id = NULL`);
    } else if (body.favicon !== undefined) {
      const faviconInput = String(body.favicon).trim();
      if (faviconInput.startsWith('data:image') || faviconInput.startsWith('data:')) {
        if (currentSiteForBranding?.favicon_id) {
          try { await deleteImage(currentSiteForBranding.favicon_id); } catch (_) {}
        }
        try {
          const uploadRes = await uploadImage(faviconInput, 'website_favicons');
          updates.push(`favicon = $${idx++}`);
          values.push(uploadRes.url);
          updates.push(`favicon_id = $${idx++}`);
          values.push(uploadRes.publicId);
        } catch (favErr) {
          console.error('Cloudinary favicon upload error during website update:', favErr);
        }
      } else if (faviconInput) {
        if (body.favicon_id !== undefined && body.favicon_id !== currentSiteForBranding?.favicon_id && currentSiteForBranding?.favicon_id) {
          try { await deleteImage(currentSiteForBranding.favicon_id); } catch (_) {}
        }
        updates.push(`favicon = $${idx++}`);
        values.push(faviconInput);
        if (body.favicon_id !== undefined) {
          updates.push(`favicon_id = $${idx++}`);
          values.push(body.favicon_id);
        }
      }
    }

    if (body.currency !== undefined) {
      updates.push(`currency = $${idx++}`);
      values.push(String(body.currency).trim().toUpperCase());
    }

    if (body.maintenance_message !== undefined) {
      updates.push(`maintenance_message = $${idx++}`);
      values.push(String(body.maintenance_message).trim());
    }

    let finalStatus = undefined;
    if (body.status !== undefined) {
      finalStatus = body.status;
    } else if (body.is_published !== undefined) {
      finalStatus = Boolean(body.is_published) ? 'active' : 'suspended';
    }

    if (finalStatus !== undefined) {
      updates.push(`status = $${idx++}`);
      values.push(finalStatus);
    }

    let finalMaintenanceMode = undefined;
    if (body.is_maintenance_mode !== undefined) {
      finalMaintenanceMode = Boolean(body.is_maintenance_mode);
    } else if (body.is_published !== undefined) {
      finalMaintenanceMode = !Boolean(body.is_published);
    }

    if (finalMaintenanceMode !== undefined) {
      updates.push(`is_maintenance_mode = $${idx++}`);
      values.push(finalMaintenanceMode);
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

    const refreshed = await queryDb(
      `SELECT w.*, 
              w.name AS site_title,
              ('Excellence in ' || COALESCE(w.institution_type, 'Education')) AS tagline,
              ('Excellence in ' || COALESCE(w.institution_type, 'Education')) AS motto,
              '' AS mission,
              '' AS vision,
              '' AS history,
              '' AS map_url,
              COALESCE(w.facebook_url, '') AS facebook_url,
              COALESCE(w.twitter_url, '') AS twitter_url,
              COALESCE(w.instagram_url, '') AS instagram_url,
              COALESCE(w.youtube_url, '') AS youtube_url,
              COALESCE(w.linkedin_url, '') AS linkedin_url,
              (CASE WHEN w.status = 'active' AND w.is_maintenance_mode = false THEN true ELSE false END) AS is_published
       FROM websites w
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
          secondaryColor: updated.secondary_color || '#0ea5e9',
          mode: updated.theme || 'default',
        },
      },
    });
  }

  if (action === 'connect_custom_domain') {
    const id = Number(body.id || body.websiteId);
    if (!id) {
      return NextResponse.json({ success: false, error: 'Website ID is required.' }, { status: 400 });
    }

    const pkgCheck = await queryDb(
      `SELECT p.id, p.name, p.is_available_custom_domain
       FROM websites w
       LEFT JOIN subscriptions s ON w.subscription_id = s.id
       LEFT JOIN packages p ON s.package_id = p.id
       WHERE w.id = $1 AND w.creator_id = $2
       LIMIT 1`,
      [id, creatorId]
    );

    const sitePkg = pkgCheck.rows[0];
    if (!sitePkg || sitePkg.is_available_custom_domain !== true) {
      return NextResponse.json({
        success: false,
        error: `Custom domain addition is not included in your current subscription package ("${sitePkg?.name || 'Current Plan'}"). Please upgrade your plan to connect a custom domain.`,
      }, { status: 403 });
    }

    const rawDomain = String(body.custom_domain || body.domain || '').trim().toLowerCase();
    const cleanDomain = rawDomain
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/:\d+$/, '')
      .trim();

    const valRes = await checkCustomDomainAvailability(cleanDomain, id, request);
    if (!valRes.available) {
      return NextResponse.json({
        success: false,
        error: valRes.error || 'Invalid or unavailable custom domain.',
      }, { status: 400 });
    }

    const token = `hiesci-verification-${crypto.randomBytes(8).toString('hex')}`;
    const isApex = cleanDomain.split('.').length === 2;
    const dnsRecords = [];

    if (isApex) {
      dnsRecords.push({
        type: 'A',
        name: '@',
        value: CUSTOM_DOMAIN_A_TARGET,
        ttl: '3600',
        description: 'Apex root IP address pointing to platform edge network',
      });
      dnsRecords.push({
        type: 'CNAME',
        name: 'www',
        value: CUSTOM_DOMAIN_CNAME_TARGET,
        ttl: '3600',
        description: 'WWW subdomain routing to platform host',
      });
    } else {
      const subHost = cleanDomain.split('.')[0];
      dnsRecords.push({
        type: 'CNAME',
        name: subHost,
        value: CUSTOM_DOMAIN_CNAME_TARGET,
        ttl: '3600',
        description: 'Canonical hostname pointing traffic to platform host',
      });
    }

    dnsRecords.push({
      type: 'TXT',
      name: `_hiesci-challenge${isApex ? '' : '.' + cleanDomain.split('.')[0]}`,
      value: token,
      ttl: '3600',
      description: 'Domain ownership challenge verification record',
    });

    const existingRes = await queryDb(
      `SELECT id FROM website_domains WHERE website_id = $1 AND domain_type = 'custom_domain' LIMIT 1`,
      [id]
    );

    let savedDomain;
    if (existingRes.rows.length > 0) {
      const upd = await queryDb(
        `UPDATE website_domains
         SET domain = $1,
             domain_name = $1,
             is_verified = FALSE,
             is_primary = FALSE,
             verification_token = $2,
             dns_record_type = 'CNAME',
             dns_record_value = $3,
             dns_records = $4::jsonb,
             ssl_status = 'pending',
             verified_at = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING *`,
        [cleanDomain, token, CUSTOM_DOMAIN_CNAME_TARGET, JSON.stringify(dnsRecords), existingRes.rows[0].id]
      );
      savedDomain = upd.rows[0];
    } else {
      const ins = await queryDb(
        `INSERT INTO website_domains (
           website_id, domain_type, domain, domain_name, is_primary, is_verified,
           verification_token, dns_record_type, dns_record_value, dns_records, ssl_status
         ) VALUES (
           $1, 'custom_domain', $2, $2, FALSE, FALSE,
           $3, 'CNAME', $4, $5::jsonb, 'pending'
         ) RETURNING *`,
        [id, cleanDomain, token, CUSTOM_DOMAIN_CNAME_TARGET, JSON.stringify(dnsRecords)]
      );
      savedDomain = ins.rows[0];
    }

    return NextResponse.json({
      success: true,
      message: `Domain "${cleanDomain}" registered! Configure the DNS records below at your DNS provider.`,
      domain: savedDomain,
      dns_records: dnsRecords,
      custom_domain: cleanDomain,
      custom_domain_verified: false,
    });
  }

  if (action === 'verify_dns' || action === 'verify_custom_domain') {
    const id = Number(body.id || body.websiteId);
    if (!id) {
      return NextResponse.json({ success: false, error: 'Website ID is required.' }, { status: 400 });
    }

    const domRes = await queryDb(
      `SELECT * FROM website_domains WHERE website_id = $1 AND domain_type = 'custom_domain' LIMIT 1`,
      [id]
    );

    if (domRes.rows.length === 0 || !domRes.rows[0].domain) {
      return NextResponse.json({ success: false, error: 'Please enter and save a custom domain first before verifying.' }, { status: 400 });
    }

    const targetDomain = domRes.rows[0].domain.toLowerCase().trim();
    const token = domRes.rows[0].verification_token;
    const isApex = targetDomain.split('.').length === 2;
    const isDev = process.env.NODE_ENV !== 'production';
    const isLocalOrTest =
      targetDomain.endsWith('.localhost') ||
      targetDomain.endsWith('.local') ||
      targetDomain.endsWith('.test') ||
      targetDomain.includes('localhost');

    let verified = false;
    let detectionDetails = { cname: [], txt: [], a: [] };

    if (isLocalOrTest || (isDev && body.bypassInDev === true)) {
      verified = true;
    } else {
      try {
        const cnames = await dns.resolveCname(targetDomain);
        detectionDetails.cname = cnames;
        if (
          cnames.some(
            (c) =>
              c.toLowerCase() === CUSTOM_DOMAIN_CNAME_TARGET.toLowerCase() ||
              c.toLowerCase().includes('hiesci') ||
              c.toLowerCase() === 'domains.hiesci.com'
          )
        ) {
          verified = true;
        }
      } catch {}

      if (!verified) {
        try {
          const txtHost = `_hiesci-challenge.${targetDomain}`;
          const txtRecords = await dns.resolveTxt(txtHost).catch(() => dns.resolveTxt(targetDomain));
          detectionDetails.txt = txtRecords.flat();
          if (token && detectionDetails.txt.some((t) => t.includes(token))) {
            verified = true;
          }
        } catch {}
      }

      if (!verified && isApex) {
        try {
          const aRecords = await dns.resolve4(targetDomain);
          detectionDetails.a = aRecords;
          if (aRecords.includes(CUSTOM_DOMAIN_A_TARGET) || aRecords.includes('76.76.21.21')) {
            verified = true;
          }
        } catch {}
      }
    }

    if (verified) {
      const updRes = await queryDb(
        `UPDATE website_domains 
         SET is_verified = TRUE,
             ssl_status = 'active',
             verified_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [domRes.rows[0].id]
      );

      return NextResponse.json({
        success: true,
        verified: true,
        message: `DNS records successfully detected and verified for "${targetDomain}"! Proceed to confirm and activate this domain.`,
        domain: updRes.rows[0],
        custom_domain_verified: true,
      });
    }

    return NextResponse.json({
      success: true,
      verified: false,
      message: `DNS records for "${targetDomain}" were not detected yet. DNS changes can take a few minutes up to 24 hours to propagate worldwide. Please check your DNS provider settings.`,
      detected: detectionDetails,
      canBypassInDev: isDev,
      custom_domain_verified: false,
    });
  }

  if (action === 'confirm_custom_domain') {
    const id = Number(body.id || body.websiteId);
    if (!id) {
      return NextResponse.json({ success: false, error: 'Website ID is required.' }, { status: 400 });
    }

    const domRes = await queryDb(
      `SELECT * FROM website_domains WHERE website_id = $1 AND domain_type = 'custom_domain' LIMIT 1`,
      [id]
    );

    if (domRes.rows.length === 0 || !domRes.rows[0].domain) {
      return NextResponse.json({ success: false, error: 'Please enter and verify a custom domain first before confirming.' }, { status: 400 });
    }

    const targetDomain = domRes.rows[0].domain;

    await queryDb(
      `UPDATE website_domains 
       SET is_primary = FALSE 
       WHERE website_id = $1 AND domain_type != 'custom_domain'`,
      [id]
    );

    const updRes = await queryDb(
      `UPDATE website_domains 
       SET is_verified = TRUE,
           is_primary = TRUE,
           ssl_status = 'active',
           verified_at = COALESCE(verified_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [domRes.rows[0].id]
    );

    return NextResponse.json({
      success: true,
      message: `Domain "${targetDomain}" is now confirmed, active, and live! All traffic is routed to your custom domain.`,
      domain: updRes.rows[0],
      custom_domain: targetDomain,
      custom_domain_verified: true,
    });
  }

  if (action === 'disconnect_custom_domain') {
    const id = Number(body.id || body.websiteId);
    if (!id) {
      return NextResponse.json({ success: false, error: 'Website ID is required.' }, { status: 400 });
    }

    await queryDb(
      `DELETE FROM website_domains WHERE website_id = $1 AND domain_type = 'custom_domain'`,
      [id]
    );

    await queryDb(
      `UPDATE website_domains SET is_primary = TRUE WHERE website_id = $1 AND domain_type = 'subdomain'`,
      [id]
    );

    return NextResponse.json({
      success: true,
      message: 'Custom domain removed successfully. Traffic reverted to default subdomain.',
    });
  }

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
    const contentType = request.headers.get('content-type') || '';
    let body;
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
      const file = formData.get('file');
      if (file) {
        body.file = file;
      }
    } else {
      body = await request.json();
    }
    return await handleWebsitesAction(body, sessionCreator, request);
  } catch (error) {
    console.error('Websites POST API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function seedWebsiteDefaults(websiteId, websiteName, themeConfig = {}, extraSettings = {}) {
  try {
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
