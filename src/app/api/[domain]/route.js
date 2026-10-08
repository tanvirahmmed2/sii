import { NextResponse } from 'next/server';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { queryDb } from 'src/lib/database/db';

export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
    }

    const websiteId = website.id;

    // Fetch public content across active modules strictly from database
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
        `SELECT DISTINCT wm.name AS module_title
         FROM websites w
         LEFT JOIN subscriptions s ON (s.id = w.subscription_id OR s.website_id = w.id OR (s.creator_id = w.creator_id AND s.status = 'active'))
         JOIN package_modules pm ON pm.package_id = s.package_id
         JOIN website_modules wm ON pm.website_module_id = wm.id
         WHERE w.id = $1
         ORDER BY wm.name ASC`,
        [websiteId]
      ).catch(() => ({ rows: [] })),
    ]);

    const allowedModules = (allowedModsRes.rows || []).map((r) => r.module_title);

    return NextResponse.json({
      success: true,
      website: {
        id: website.id,
        name: website.name,
        subdomain: website.subdomain,
        custom_domain: website.custom_domain,
        institution_type: website.institution_type,
        eiin_number: website.eiin_number,
        contact_email: website.contact_email,
        contact_phone: website.contact_phone,
        address: website.address,
        logo: website.logo,
        logo_id: website.logo_id,
        favicon: website.favicon,
        favicon_id: website.favicon_id,
        primary_color: website.primary_color || '#1e40af',
        secondary_color: website.secondary_color || '#0ea5e9',
        theme: website.theme || 'default',
        slug: website.slug,
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
    console.error('Website public API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
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
        SET motto = COALESCE($1, motto),
            contact_email = COALESCE($2, contact_email),
            contact_phone = COALESCE($3, contact_phone),
            address = COALESCE($4, address),
            mission = COALESCE($5, mission),
            vision = COALESCE($6, vision),
            history = COALESCE($7, history),
            updated_at = CURRENT_TIMESTAMP
        WHERE website_id = $8
      `, [
        s.tagline || s.motto || null,
        s.contact_email || null,
        s.contact_phone || null,
        s.address || null,
        s.mission || null,
        s.vision || null,
        s.history || null,
        websiteId,
      ]);
    }

    // 2. Update website record
    const updates = [];
    const values = [];
    let idx = 1;

    if (body.name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(body.name);
    }
    if (body.custom_domain !== undefined) {
      updates.push(`custom_domain = $${idx++}`);
      values.push(body.custom_domain ? String(body.custom_domain).trim().toLowerCase() : null);
    }
    if (body.primary_color !== undefined) {
      updates.push(`primary_color = $${idx++}`);
      values.push(body.primary_color);
    }
    if (body.secondary_color !== undefined) {
      updates.push(`secondary_color = $${idx++}`);
      values.push(body.secondary_color);
    }
    if (body.theme !== undefined) {
      updates.push(`theme = $${idx++}`);
      values.push(body.theme);
    }

    if (updates.length > 0) {
      values.push(websiteId);
      await queryDb(`
        UPDATE websites
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${idx++}
      `, values);
    }

    const updatedWebsite = await resolveWebsiteFromRequest(request, context);
    return NextResponse.json({ success: true, website: updatedWebsite });
  } catch (error) {
    console.error('Update website API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
