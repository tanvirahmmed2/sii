import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';

async function fetchFullWebsite(websiteId) {
  const res = await queryDb(
    `SELECT w.*,
            (CASE WHEN w.status = 'active' AND NOT w.is_maintenance_mode THEN true ELSE false END) AS is_published,
            COALESCE(
              (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.is_primary = TRUE LIMIT 1),
              (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'subdomain' LIMIT 1),
              w.slug
            ) AS subdomain,
            (SELECT wd.domain FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'custom_domain' LIMIT 1) AS custom_domain,
            (SELECT COALESCE(wd.is_verified, FALSE) FROM website_domains wd WHERE wd.website_id = w.id AND wd.domain_type = 'custom_domain' LIMIT 1) AS custom_domain_verified,
            (SELECT row_to_json(wi.*) FROM website_information wi WHERE wi.website_id = w.id LIMIT 1) AS website_information,
            c.id AS creator_id,
            c.name AS creator_name,
            c.email AS creator_email,
            c.phone AS creator_phone,
            w.institution_name AS creator_institution,
            c.country AS creator_country,
            c.city AS creator_city,
            c.address AS creator_address,
            c.is_active AS creator_is_active,
            c.email_verified AS creator_email_verified,
            c.created_at AS creator_created_at,
            p.id AS package_id,
            p.name AS package_name,
            p.slug AS package_slug,
            p.tagline AS package_tagline,
            p.description AS package_description,
            p.monthly_price_usd,
            p.yearly_price_usd,
            p.monthly_price_bdt,
            p.yearly_price_bdt,
            p.discount_percentage,
            p.max_students,
            p.max_teachers,
            p.max_staff,
            p.max_storage_mb,
            p.max_websites,
            p.features AS package_features,
            p.is_active AS package_is_active,
            s.id AS subscription_id,
            s.status AS subscription_status,
            s.billing_cycle AS subscription_billing_cycle,
            s.current_period_start AS subscription_period_start,
            s.current_period_end AS subscription_period_end,
            s.cancel_at_period_end AS subscription_cancel_at_period_end
     FROM websites w
     LEFT JOIN creators c ON w.creator_id = c.id
     LEFT JOIN LATERAL (
       SELECT sub.* FROM subscriptions sub 
       WHERE (sub.id = w.subscription_id OR sub.website_id = w.id OR (sub.creator_id = w.creator_id AND sub.status = 'active'))
       ORDER BY (CASE WHEN sub.id = w.subscription_id THEN 1 WHEN sub.website_id = w.id THEN 2 ELSE 3 END) ASC, sub.id DESC LIMIT 1
     ) s ON true
     LEFT JOIN packages p ON s.package_id = p.id
     WHERE w.id = $1
     LIMIT 1`,
    [websiteId]
  ).catch(() => ({ rows: [] }));

  return res.rows[0] || null;
}

export async function GET(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'websites');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const resolvedParams = await params;
    const websiteId = Number(resolvedParams?.id);
    if (!websiteId || isNaN(websiteId)) {
      return NextResponse.json({ success: false, error: 'Invalid Website ID' }, { status: 400 });
    }

    const website = await fetchFullWebsite(websiteId);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
    }

    const creatorId = Number(website.creator_id);

    const [modulesRes, allTenantModsRes, packagesRes, purchasesRes, creatorsRes, subscriptionsRes] = await Promise.all([
      queryDb(
        `SELECT cm.id AS website_module_id,
                cm.id,
                cm.name AS module_name,
                cm.slug AS module_slug,
                cm.description AS module_description,
                cm.icon AS module_icon,
                cm.is_active,
                TRUE AS is_enabled
         FROM website_control_modules cm
         JOIN package_control_modules pcm ON pcm.control_module_id = cm.id
         JOIN subscriptions s ON s.package_id = pcm.package_id
         JOIN websites w ON (w.subscription_id = s.id OR s.website_id = w.id)
         WHERE w.id = $1 AND cm.is_active = TRUE
         ORDER BY cm.id ASC`,
        [websiteId]
      ).catch(() => ({ rows: [] })),

      queryDb(
        `SELECT id, name, slug, description, icon, is_active FROM website_control_modules WHERE is_active = TRUE ORDER BY id ASC`
      ).catch(() => ({ rows: [] })),

      queryDb(
        `SELECT id, name, slug, tagline, description,
                monthly_price_usd, yearly_price_usd, monthly_price_bdt, yearly_price_bdt,
                max_students, max_teachers, max_staff, max_storage_mb, max_websites,
                features, is_active
         FROM packages
         WHERE is_active = TRUE
         ORDER BY id ASC`
      ).catch(() => ({ rows: [] })),

      queryDb(
        `SELECT pu.*, 
                p.name AS package_name, 
                pay.transaction_id, 
                pay.payment_method, 
                pay.status AS payment_status,
                pay.amount AS payment_amount,
                pay.currency AS payment_currency
         FROM purchases pu
         LEFT JOIN packages p ON pu.package_id = p.id
         LEFT JOIN LATERAL (
           SELECT * FROM payments WHERE purchase_id = pu.id ORDER BY id DESC LIMIT 1
         ) pay ON true
         WHERE pu.website_id = $1 OR (pu.creator_id = $2 AND $2 IS NOT NULL)
         ORDER BY pu.id DESC LIMIT 15`,
        [websiteId, creatorId || 0]
      ).catch(() => ({ rows: [] })),

      queryDb(
        `SELECT id, name, email, institution, phone, is_active FROM creators ORDER BY id DESC LIMIT 100`
      ).catch(() => ({ rows: [] })),

      queryDb(
        `SELECT s.*, 
                p.name AS package_name, 
                p.slug AS package_slug, 
                p.monthly_price_usd, 
                p.yearly_price_usd
         FROM subscriptions s
         LEFT JOIN packages p ON s.package_id = p.id
         WHERE s.creator_id = $1 OR s.website_id = $2 OR s.id = $3
         ORDER BY s.id DESC`,
        [creatorId || 0, websiteId, website.subscription_id || 0]
      ).catch(() => ({ rows: [] })),
    ]);

    let daysRemaining = null;
    if (website.subscription_expires_at) {
      const diff = new Date(website.subscription_expires_at).getTime() - Date.now();
      daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    return NextResponse.json({
      success: true,
      website: {
        ...website,
        days_remaining: daysRemaining,
        is_expired: daysRemaining !== null && daysRemaining < 0,
      },
      creator: {
        id: website.creator_id,
        name: website.creator_name,
        email: website.creator_email,
        phone: website.creator_phone,
        institution: website.creator_institution,
        country: website.creator_country,
        city: website.creator_city,
        address: website.creator_address,
        is_active: website.creator_is_active,
        email_verified: website.creator_email_verified,
        created_at: website.creator_created_at,
      },
      package: {
        id: website.package_id,
        name: website.package_name,
        slug: website.package_slug,
        tagline: website.package_tagline,
        description: website.package_description,
        monthly_price_usd: website.monthly_price_usd,
        yearly_price_usd: website.yearly_price_usd,
        monthly_price_bdt: website.monthly_price_bdt,
        yearly_price_bdt: website.yearly_price_bdt,
        max_students: website.max_students,
        max_teachers: website.max_teachers,
        max_staff: website.max_staff,
        max_storage_mb: website.max_storage_mb,
        max_websites: website.max_websites,
        features: website.package_features,
        is_active: website.package_is_active,
      },
      subscription: website.subscription_id ? {
        id: website.subscription_id,
        status: website.subscription_status,
        billing_cycle: website.subscription_billing_cycle,
        current_period_start: website.subscription_period_start,
        current_period_end: website.subscription_period_end,
        cancel_at_period_end: website.subscription_cancel_at_period_end,
      } : null,
      enabled_modules: modulesRes.rows,
      all_tenant_modules: allTenantModsRes.rows,
      available_packages: packagesRes.rows,
      purchases: purchasesRes.rows,
      creators: creatorsRes.rows,
      creator_subscriptions: subscriptionsRes.rows,
    });
  } catch (error) {
    console.error('Website [id] GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'websites');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const resolvedParams = await params;
    const websiteId = Number(resolvedParams?.id);
    if (!websiteId || isNaN(websiteId)) {
      return NextResponse.json({ success: false, error: 'Invalid Website ID' }, { status: 400 });
    }

    const currentWebsite = await fetchFullWebsite(websiteId);
    if (!currentWebsite) {
      return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
    }

    const body = await request.json();
    const rawData = body.data || body;

    const creatorPayload = rawData.creator_data || rawData.creator || null;
    let targetCreatorId = Number(rawData.creator_id || currentWebsite.creator_id);

    if (creatorPayload && targetCreatorId) {
      const allowedCreatorKeys = [
        'name', 'phone', 'institution', 'country', 'city', 'address', 'is_active', 'email_verified'
      ];
      const creatorKeys = Object.keys(creatorPayload).filter((k) => allowedCreatorKeys.includes(k));
      if (creatorKeys.length > 0) {
        const creatorValues = creatorKeys.map((k) => creatorPayload[k]);
        const setClauses = creatorKeys.map((k, i) => `"${k}" = $${i + 1}`);
        creatorValues.push(targetCreatorId);

        await queryDb(
          `UPDATE creators SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${creatorValues.length}`,
          creatorValues
        );
      }
    }

    const websiteData = { ...rawData };
    delete websiteData.creator_data;
    delete websiteData.creator;
    delete websiteData.toggle_module_id;
    delete websiteData.module_ids;
    delete websiteData.package_id; 

    if (websiteData.subscription_id !== undefined) {
      const targetSubId = websiteData.subscription_id ? Number(websiteData.subscription_id) : null;
      if (targetSubId) {
        const subRes = await queryDb(`SELECT * FROM subscriptions WHERE id = $1`, [targetSubId]);
        if (subRes.rows.length > 0) {
          const sub = subRes.rows[0];
          websiteData.subscription_id = targetSubId;
          if (sub.current_period_end) {
            websiteData.subscription_expires_at = sub.current_period_end;
          }
          await queryDb(`UPDATE websites SET subscription_id = NULL WHERE subscription_id = $1 AND id != $2`, [targetSubId, websiteId]);
          await queryDb(`UPDATE subscriptions SET website_id = NULL WHERE website_id = $1 AND id != $2`, [websiteId, targetSubId]);
          await queryDb(`UPDATE subscriptions SET website_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [websiteId, targetSubId]);
        }
      } else {
        websiteData.subscription_id = null;
        await queryDb(`UPDATE subscriptions SET website_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE website_id = $1`, [websiteId]);
      }
    }

    if (websiteData.is_published !== undefined) {
      const isPub = Boolean(websiteData.is_published);
      websiteData.is_maintenance_mode = !isPub;
      delete websiteData.is_published;
    }

    if (websiteData.status) {
      websiteData.status = String(websiteData.status).toLowerCase();
      if (!['active', 'pending', 'suspended', 'expired', 'archived'].includes(websiteData.status)) {
        websiteData.status = 'active';
      }
    }

    if (websiteData.subdomain) {
      const cleanSub = String(websiteData.subdomain).toLowerCase().trim().replace(/[^a-z0-9-]+/g, '');
      await queryDb(
        `INSERT INTO website_domains (website_id, domain_type, domain, domain_name, is_primary, is_verified, dns_record_type, dns_record_value)
         VALUES ($1, 'subdomain', $2, $2, TRUE, TRUE, 'CNAME', 'domains.hiesci.com')
         ON CONFLICT (domain) DO UPDATE SET is_primary = TRUE, updated_at = CURRENT_TIMESTAMP`,
        [websiteId, cleanSub]
      ).catch(() => {});
    }

    if (websiteData.custom_domain !== undefined) {
      const rawCustom = String(websiteData.custom_domain || '').trim().toLowerCase();
      if (!rawCustom) {
        await queryDb(`DELETE FROM website_domains WHERE website_id = $1 AND domain_type = 'custom_domain'`, [websiteId]).catch(() => {});
      } else {
        await queryDb(
          `INSERT INTO website_domains (website_id, domain_type, domain, domain_name, is_primary, is_verified, dns_record_type, dns_record_value)
           VALUES ($1, 'custom_domain', $2, $2, FALSE, FALSE, 'CNAME', 'domains.hiesci.com')
           ON CONFLICT (domain) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
          [websiteId, rawCustom]
        ).catch(() => {});
      }
    }

    const allowedWebsiteKeys = [
      'creator_id', 'subscription_id', 'name', 'slug',
      'institution_type', 'eiin_number',
      'status', 'theme', 'primary_color', 'secondary_color', 'logo', 'logo_id', 'favicon', 'favicon_id',
      'contact_email', 'contact_phone', 'address', 'subscription_expires_at',
      'storage_used_mb', 'is_maintenance_mode'
    ];

    const keys = Object.keys(websiteData).filter((k) => allowedWebsiteKeys.includes(k));
    if (keys.length > 0) {
      const values = keys.map((k) => (typeof websiteData[k] === 'object' && websiteData[k] !== null ? JSON.stringify(websiteData[k]) : websiteData[k]));
      const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`);
      values.push(websiteId);

      await queryDb(
        `UPDATE websites SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}`,
        values
      );
    }

    const refreshed = await fetchFullWebsite(websiteId);

    return NextResponse.json({
      success: true,
      message: 'Website data and creator updated successfully.',
      record: refreshed,
      website: refreshed,
    });
  } catch (error) {
    console.error('Website [id] PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'websites');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const resolvedParams = await params;
    const websiteId = Number(resolvedParams?.id);
    if (!websiteId || isNaN(websiteId)) {
      return NextResponse.json({ success: false, error: 'Invalid Website ID' }, { status: 400 });
    }

    await queryDb('DELETE FROM websites WHERE id = $1', [websiteId]);

    return NextResponse.json({ success: true, message: 'Website deleted successfully.' });
  } catch (error) {
    console.error('Website [id] DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
