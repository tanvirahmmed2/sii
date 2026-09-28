import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { getCreatorSession } from '@/lib/middleware/creator';

/**
 * API Route: /api/creator/websites
 * Dedicated to the `websites` table.
 */

export async function GET(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const { searchParams } = new URL(request.url);
    const creatorIdParam = searchParams.get('creatorId');
    const websiteIdParam = searchParams.get('id');

    const creatorId = creatorIdParam ? Number(creatorIdParam) : sessionCreator?.id;
    if (!creatorId) {
      return NextResponse.json({ success: false, error: 'Unauthorized or missing creator ID' }, { status: 401 });
    }

    if (sessionCreator && sessionCreator.id !== creatorId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // If specific website requested
    if (websiteIdParam) {
      const singleRes = await queryDb(
        `SELECT w.*, 
                ws.site_title, ws.tagline, ws.contact_email, ws.contact_phone, 
                ws.primary_color, ws.secondary_color, ws.font_family, ws.currency AS setting_currency,
                ws.social_links, ws.seo_config
         FROM websites w
         LEFT JOIN website_settings ws ON w.id = ws.website_id
         WHERE w.id = $1 AND w.creator_id = $2
         LIMIT 1`,
        [Number(websiteIdParam), creatorId]
      );

      if (singleRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, website: singleRes.rows[0] });
    }

    // List all websites for creator
    const res = await queryDb(
      `SELECT w.*, 
              ws.site_title, ws.tagline, ws.contact_email, ws.contact_phone, 
              ws.primary_color, ws.secondary_color, ws.font_family, ws.currency AS setting_currency,
              ws.social_links, ws.seo_config
       FROM websites w
       LEFT JOIN website_settings ws ON w.id = ws.website_id
       WHERE w.creator_id = $1
       ORDER BY w.id DESC`,
      [creatorId]
    );

    return NextResponse.json({ success: true, websites: res.rows });
  } catch (error) {
    console.error('Websites GET API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function handleWebsitesAction(body, sessionCreator, request = null) {
  const { action } = body;
  const creatorId = Number(body.creatorId || sessionCreator?.id);

  if (!creatorId) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Creator ID required' }, { status: 401 });
  }

  if (sessionCreator && sessionCreator.id !== creatorId) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  // Determine default host/domain for constructing full subdomain format: subdomain.maindomain.com
  const mainHost = request?.headers?.get('host') || 'localhost:3000';
  const mainDomain = mainHost.includes(':') ? mainHost.split(':')[0] : mainHost;

  // 1. Create or Setup Website (Stores primary subdomain as subdomain.maindomain.com)
  if (action === 'create_website' || action === 'setup_website' || !action) {
    const name = (body.name || body.websiteName || 'My Portfolio & Store').trim();
    let rawSubdomain = (body.subdomain || `portfolio-${creatorId}`).trim().toLowerCase().replace(/[^a-z0-9.-]/g, '');

    // Strip existing domain suffix if user entered full subdomain
    if (rawSubdomain.includes('.')) {
      rawSubdomain = rawSubdomain.split('.')[0];
    }

    if (!rawSubdomain || rawSubdomain.length < 3) {
      return NextResponse.json({
        success: false,
        error: 'Subdomain prefix is required and must be at least 3 characters.',
      }, { status: 400 });
    }

    // Check active package subscription and quotas
    const activeSub = await queryDb(
      `SELECT s.*, COALESCE(p.max_websites, p.max_portfolios, 1) AS max_websites, p.max_portfolios 
       FROM subscription s 
       JOIN packages p ON s.package_id = p.id 
       WHERE s.creator_id = $1 AND s.status = 'ACTIVE' AND s.current_period_end > CURRENT_TIMESTAMP
       ORDER BY s.id DESC LIMIT 1`,
      [creatorId]
    );

    if (activeSub.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'An active package subscription is required to setup or create a website. Please purchase a package first.',
      }, { status: 403 });
    }

    const maxLimit = Number(activeSub.rows[0].max_websites ?? activeSub.rows[0].max_portfolios ?? 1);
    const countRes = await queryDb('SELECT COUNT(*)::int AS count FROM websites WHERE creator_id = $1', [creatorId]);
    const currentCount = countRes.rows[0].count;

    if (currentCount >= maxLimit) {
      return NextResponse.json({
        success: false,
        error: `Your current package allows up to ${maxLimit} website(s). Please upgrade your package to create more websites.`,
      }, { status: 403 });
    }

    // Format as subdomain.maindomain.com (primary requirement)
    let fullSubdomain = `${rawSubdomain}.${mainDomain}`;

    // Ensure uniqueness
    const subCheck = await queryDb(
      'SELECT id FROM websites WHERE LOWER(subdomain) = LOWER($1) OR LOWER(subdomain) = LOWER($2) LIMIT 1',
      [fullSubdomain, rawSubdomain]
    );
    if (subCheck.rows.length > 0) {
      fullSubdomain = `${rawSubdomain}-${Date.now().toString().slice(-4)}.${mainDomain}`;
    }

    const themeConfig = body.themeConfig || {
      primaryColor: body.primaryColor || '#6366f1',
      secondaryColor: body.secondaryColor || '#4f46e5',
      fontFamily: body.fontFamily || 'Inter',
      accent: '#10b981',
      mode: 'dark',
    };

    const res = await queryDb(
      `INSERT INTO websites (creator_id, name, subdomain, custom_domain, theme_config, status, storage_used_mb, is_published)
       VALUES ($1, $2, $3, $4, $5, 'ACTIVE', 15, TRUE)
       RETURNING *`,
      [
        creatorId,
        name,
        fullSubdomain,
        body.customDomain || null,
        JSON.stringify(themeConfig),
      ]
    );
    const newWebsite = res.rows[0];

    // Seed default settings, modules, roles, permissions, and sample catalog items
    await seedWebsiteDefaults(newWebsite.id, newWebsite.name, themeConfig, body);

    return NextResponse.json({
      success: true,
      message: 'Website setup completed successfully!',
      website: newWebsite,
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
      values.push(body.name);
    }
    if (body.subdomain !== undefined) {
      let sub = body.subdomain.toLowerCase().trim();
      if (!sub.includes('.')) {
        sub = `${sub}.${mainDomain}`;
      }
      updates.push(`subdomain = $${idx++}`);
      values.push(sub);
    }
    if (body.custom_domain !== undefined) {
      updates.push(`custom_domain = $${idx++}`);
      values.push(body.custom_domain || null);
    }
    if (body.theme_config !== undefined) {
      updates.push(`theme_config = $${idx++}`);
      values.push(typeof body.theme_config === 'object' ? JSON.stringify(body.theme_config) : body.theme_config);
    }
    if (body.status !== undefined) {
      updates.push(`status = $${idx++}`);
      values.push(body.status);
    }
    if (body.is_published !== undefined) {
      updates.push(`is_published = $${idx++}`);
      values.push(Boolean(body.is_published));
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: true });
    }

    values.push(id, creatorId);
    const res = await queryDb(
      `UPDATE websites SET ${updates.join(', ')} WHERE id = $${idx++} AND creator_id = $${idx++} RETURNING *`,
      values
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Website not found or unauthorized.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, website: res.rows[0] });
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
    return NextResponse.json({ success: true, id });
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

export async function seedWebsiteDefaults(websiteId, websiteName, themeConfig = {}, extraSettings = {}) {
  try {
    const primaryColor = themeConfig.primaryColor || extraSettings.primaryColor || '#6366f1';
    const secondaryColor = themeConfig.secondaryColor || extraSettings.secondaryColor || '#4f46e5';
    const fontFamily = themeConfig.fontFamily || extraSettings.fontFamily || 'Inter';

    // 1. Settings
    await queryDb(`
      INSERT INTO website_settings (
        website_id, site_title, tagline, contact_email, contact_phone, 
        primary_color, secondary_color, font_family, currency
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (website_id) DO UPDATE SET
        site_title = EXCLUDED.site_title,
        tagline = EXCLUDED.tagline,
        primary_color = EXCLUDED.primary_color,
        font_family = EXCLUDED.font_family
    `, [
      websiteId,
      websiteName || 'My Portfolio & Store',
      extraSettings.tagline || 'Modern Showcase & Digital Hub',
      extraSettings.contactEmail || null,
      extraSettings.contactPhone || null,
      primaryColor,
      secondaryColor,
      fontFamily,
      extraSettings.currency || 'USD',
    ]);

    // 2. Modules
    const defaultModules = [
      { name: 'Products & Store', slug: 'products', description: 'E-commerce products, digital downloads & inventory' },
      { name: 'Blog & Articles', slug: 'blogs', description: 'Articles, news and blog publishing' },
      { name: 'Appointment Booking', slug: 'appointments', description: 'Client booking and schedule management' },
      { name: 'Support Tickets', slug: 'support', description: 'Customer inquiry and support ticketing' },
      { name: 'Portfolio Gallery', slug: 'gallery', description: 'Media showcase and portfolio visual gallery' },
      { name: 'Experiences Timeline', slug: 'experiences', description: 'Work history, education and milestones' },
      { name: 'Services Offered', slug: 'services', description: 'Bespoke service packages and pricing' },
      { name: 'Client Testimonials', slug: 'testimonials', description: 'Customer reviews and endorsements' },
      { name: 'Contact Inquiries', slug: 'contact', description: 'Direct contact messaging and leads' },
    ];
    for (const m of defaultModules) {
      await queryDb(`
        INSERT INTO website_modules (website_id, name, slug, description, is_enabled)
        VALUES ($1, $2, $3, $4, TRUE)
        ON CONFLICT (website_id, slug) DO NOTHING
      `, [websiteId, m.name, m.slug, m.description]);
    }

    // 3. Roles
    const defaultRoles = [
      { name: 'Owner', slug: 'owner', description: 'Full owner access with all privileges', is_system: true },
      { name: 'Admin', slug: 'admin', description: 'Site administrator with full management rights', is_system: true },
      { name: 'Editor', slug: 'editor', description: 'Content editor for blogs, products & portfolio', is_system: false },
      { name: 'Support Specialist', slug: 'support-specialist', description: 'Support ticket and inquiry handler', is_system: false },
    ];
    for (const r of defaultRoles) {
      await queryDb(`
        INSERT INTO website_roles (website_id, name, slug, description, is_system)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (website_id, slug) DO NOTHING
      `, [websiteId, r.name, r.slug, r.description, r.is_system]);
    }

    // 4. Permissions
    const modRows = await queryDb('SELECT id, slug FROM website_modules WHERE website_id = $1', [websiteId]);
    const actions = ['view', 'create', 'edit', 'delete', 'manage'];
    for (const mod of modRows.rows) {
      for (const act of actions) {
        const pName = `${act.charAt(0).toUpperCase() + act.slice(1)} ${mod.slug}`;
        const pSlug = `${mod.slug}.${act}`;
        await queryDb(`
          INSERT INTO website_permissions (website_id, module_id, name, slug, action, is_custom)
          VALUES ($1, $2, $3, $4, $5, FALSE)
          ON CONFLICT (website_id, slug) DO NOTHING
        `, [websiteId, mod.id, pName, pSlug, act]);
      }
    }

    // 5. Grant Owner all permissions
    const ownerRole = await queryDb('SELECT id FROM website_roles WHERE website_id = $1 AND slug = $2', [websiteId, 'owner']);
    if (ownerRole.rows.length > 0) {
      const allPerms = await queryDb('SELECT id FROM website_permissions WHERE website_id = $1', [websiteId]);
      for (const p of allPerms.rows) {
        await queryDb(`
          INSERT INTO website_role_permissions (role_id, permission_id)
          VALUES ($1, $2)
          ON CONFLICT (role_id, permission_id) DO NOTHING
        `, [ownerRole.rows[0].id, p.id]);
      }
    }

    // 6. Sample services, experiences, products, blog
    await queryDb(`
      INSERT INTO website_services (website_id, title, slug, description, price_starting_at, features) VALUES
      ($1, 'Full-Stack Web Architecture', 'full-stack-architecture', 'Bespoke web applications built with Next.js & PostgreSQL.', 1499, '["Full-Stack Design", "Modern Database", "SEO Ready"]'::jsonb),
      ($1, 'UI/UX & Brand Design', 'ui-ux-design', 'Award-winning visual identities and interactive component systems.', 899, '["Design System", "Prototypes", "Responsive UI"]'::jsonb)
      ON CONFLICT (website_id, slug) DO NOTHING
    `, [websiteId]);

    await queryDb(`
      INSERT INTO website_products (website_id, name, slug, description, short_description, price_in_cents, status, is_featured, is_digital) VALUES
      ($1, 'Flagship Creator Digital Bundle', 'creator-bundle', 'Complete suite of digital assets, design kits, and templates.', 'Exclusive creator starter bundle.', 3900, 'ACTIVE', TRUE, TRUE)
      ON CONFLICT (website_id, slug) DO NOTHING
    `, [websiteId]);

    await queryDb(`
      INSERT INTO website_blogs (website_id, title, slug, excerpt, content, is_published) VALUES
      ($1, 'Welcome to Our New Website', 'welcome-to-our-new-website', 'We are delighted to launch our official website and showcase our latest works.', '<p>Welcome! Explore our services, portfolio, and digital offerings. Feel free to contact us or book a consultation anytime.</p>', TRUE)
      ON CONFLICT (website_id, slug) DO NOTHING
    `, [websiteId]);
  } catch (err) {
    console.error('Error seeding website defaults:', err);
  }
}
