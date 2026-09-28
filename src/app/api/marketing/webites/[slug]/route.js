import { NextResponse } from 'next/server';
import { resolveWebsiteFromRequest } from '@/lib/middleware/user';
import { queryDb } from '@/lib/db/pg';

export async function GET(request, context) {
  try {
    const params = await context.params;
    const slug = params.slug;

    const website = await resolveWebsiteFromRequest(request, slug);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
    }

    const websiteId = website.id;

    // Fetch public content across all active modules in parallel
    const [
      servicesRes,
      productsRes,
      blogsRes,
      experiencesRes,
      galleryRes,
      skillsRes,
      testimonialsRes,
      offersRes,
      allowedModsRes,
    ] = await Promise.all([
      queryDb('SELECT * FROM website_services WHERE website_id = $1 AND is_active = TRUE ORDER BY sort_order ASC, id ASC', [websiteId]).catch(() => ({ rows: [] })),
      queryDb('SELECT * FROM website_products WHERE website_id = $1 AND status = $2 ORDER BY is_featured DESC, id DESC', [websiteId, 'ACTIVE']).catch(() => ({ rows: [] })),
      queryDb('SELECT * FROM website_blogs WHERE website_id = $1 AND is_published = TRUE ORDER BY published_at DESC, id DESC', [websiteId]).catch(() => ({ rows: [] })),
      queryDb('SELECT * FROM website_experiences WHERE website_id = $1 ORDER BY sort_order ASC, id DESC', [websiteId]).catch(() => ({ rows: [] })),
      queryDb('SELECT * FROM website_gallery WHERE website_id = $1 ORDER BY sort_order ASC, id DESC', [websiteId]).catch(() => ({ rows: [] })),
      queryDb('SELECT * FROM website_skills WHERE website_id = $1 ORDER BY sort_order ASC, proficiency DESC', [websiteId]).catch(() => ({ rows: [] })),
      queryDb('SELECT * FROM website_testimonials WHERE website_id = $1 ORDER BY sort_order ASC, id DESC', [websiteId]).catch(() => ({ rows: [] })),
      queryDb('SELECT * FROM website_offers WHERE website_id = $1 AND is_active = TRUE ORDER BY id DESC', [websiteId]).catch(() => ({ rows: [] })),
      queryDb(
        `SELECT DISTINCT am.module_title
         FROM websites w
         LEFT JOIN subscription s ON s.creator_id = w.creator_id AND s.status = 'ACTIVE'
         JOIN allowed_modules am ON am.package_id = s.package_id
         WHERE w.id = $1
         ORDER BY am.module_title ASC`,
        [websiteId]
      ).catch(() => ({ rows: [] })),
    ]);

    let allowedModules = (allowedModsRes.rows || []).map((r) => r.module_title);
    if (allowedModules.length === 0) {
      const defaultModRes = await queryDb(
        `SELECT DISTINCT am.module_title
         FROM allowed_modules am
         JOIN packages p ON p.id = am.package_id
         WHERE p.is_active = TRUE
         ORDER BY am.module_title ASC`
      ).catch(() => ({ rows: [] }));
      allowedModules = defaultModRes.rows.map((r) => r.module_title);
    }

    return NextResponse.json({
      success: true,
      website: {
        id: website.id,
        name: website.name,
        subdomain: website.subdomain,
        custom_domain: website.custom_domain,
        theme_config: website.theme_config,
        status: website.status,
        is_published: website.is_published,
        settings: website.settings,
        modules: website.modules,
        allowed_modules: allowedModules,
      },
      services: servicesRes.rows,
      products: productsRes.rows,
      blogs: blogsRes.rows,
      experiences: experiencesRes.rows,
      gallery: galleryRes.rows,
      skills: skillsRes.rows,
      testimonials: testimonialsRes.rows,
      offers: offersRes.rows,
    });
  } catch (error) {
    console.error('Website public website API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, context) {
  try {
    const params = await context.params;
    const slug = params.slug;

    const website = await resolveWebsiteFromRequest(request, slug);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
    }

    const body = await request.json();
    const websiteId = website.id;

    // 1. Update website_settings
    if (body.settings) {
      const s = body.settings;
      await queryDb(`
        UPDATE website_settings
        SET site_title = COALESCE($1, site_title),
            tagline = COALESCE($2, tagline),
            bio = COALESCE($3, bio),
            primary_color = COALESCE($4, primary_color),
            secondary_color = COALESCE($5, secondary_color),
            font_family = COALESCE($6, font_family),
            contact_email = COALESCE($7, contact_email),
            contact_phone = COALESCE($8, contact_phone),
            address = COALESCE($9, address)
        WHERE website_id = $10
      `, [
        s.site_title,
        s.tagline,
        s.bio,
        s.primary_color,
        s.secondary_color,
        s.font_family,
        s.contact_email,
        s.contact_phone,
        s.address,
        websiteId,
      ]);
    }

    // 2. Update website record (custom_domain, name, theme_config)
    if (body.custom_domain !== undefined || body.name !== undefined || body.theme_config !== undefined) {
      await queryDb(`
        UPDATE websites
        SET custom_domain = COALESCE($1, custom_domain),
            name = COALESCE($2, name),
            theme_config = COALESCE($3, theme_config)
        WHERE id = $4
      `, [
        body.custom_domain !== undefined ? (body.custom_domain ? body.custom_domain.trim().toLowerCase() : null) : null,
        body.name || null,
        body.theme_config ? JSON.stringify(body.theme_config) : null,
        websiteId,
      ]);
    }

    const updatedWebsite = await resolveWebsiteFromRequest(request, slug);
    return NextResponse.json({ success: true, website: updatedWebsite });
  } catch (error) {
    console.error('Update website website API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
