import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { hasModulePermission } from '@/lib/middleware/developer';

// Dynamically query database tables to discover website modules
async function fetchDatabaseModules() {
  try {
    const res = await queryDb(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
         AND table_type = 'BASE TABLE'
         AND table_name LIKE 'website_%'
         AND table_name NOT LIKE '%_images'
         AND table_name NOT LIKE '%_messages'
         AND table_name NOT LIKE '%_permissions'
         AND table_name NOT LIKE '%_roles'
         AND table_name NOT LIKE '%_payments'
         AND table_name != 'website_modules'
       ORDER BY table_name ASC`
    );

    const titleMap = {
      website_products: 'Products',
      website_purchase: 'Orders & Payments',
      website_appointments: 'Appointments',
      website_blogs: 'Blog & Articles',
      website_contact: 'Contact Inquiries',
      website_services: 'Services',
      website_experiences: 'Experiences',
      website_gallery: 'Portfolio Gallery',
      website_offers: 'Offers & Discounts',
      website_support: 'Support Tickets',
      website_roles: 'Roles & Permissions',
      website_users: 'Team & Users',
      website_settings: 'Settings & Domain',
      website_skills: 'Skills & Endorsements',
      website_testimonials: 'Testimonials & Reviews',
      website_categories: 'Content Categories',
    };

    return (res.rows || []).map(
      (r) =>
        titleMap[r.table_name] ||
        r.table_name
          .replace('website_', '')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
    );
  } catch (err) {
    console.warn('Error discovering database modules:', err.message);
    return [];
  }
}

import slugify from 'slugify';

async function generateUniqueSlug(name, excludeId = null) {
  const baseSlug = slugify(name || 'package', { lower: true, strict: true, trim: true }) || 'package';
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const params = excludeId ? [slug, Number(excludeId)] : [slug];
    const query = excludeId
      ? 'SELECT id FROM packages WHERE slug = $1 AND id != $2 LIMIT 1'
      : 'SELECT id FROM packages WHERE slug = $1 LIMIT 1';
    const check = await queryDb(query, params);
    if (check.rows.length === 0) return slug;
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const availableModules = await fetchDatabaseModules();

    if (id) {
      const res = await queryDb(
        `SELECT p.*, a.title AS app_title, a.slug AS app_slug,
                COALESCE(
                  (
                    SELECT json_agg(am.module_title ORDER BY am.id ASC)
                    FROM allowed_modules am
                    WHERE am.package_id = p.id
                  ),
                  '[]'::json
                ) AS allowed_modules
         FROM packages p
         LEFT JOIN apps a ON p.app_id = a.id
         WHERE p.id = $1
         LIMIT 1`,
        [Number(id)]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Package not found' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        record: res.rows[0],
        available_modules: availableModules,
      });
    }

    const res = await queryDb(
      `SELECT p.*, a.title AS app_title, a.slug AS app_slug,
              COALESCE(
                (
                  SELECT json_agg(am.module_title ORDER BY am.id ASC)
                  FROM allowed_modules am
                  WHERE am.package_id = p.id
                ),
                '[]'::json
              ) AS allowed_modules
       FROM packages p
       LEFT JOIN apps a ON p.app_id = a.id
       ORDER BY COALESCE(p.monthly_price_usd, p.price_in_cents / 100.0, 0) ASC, p.id ASC`
    ).catch(() => ({ rows: [] }));

    return NextResponse.json({
      success: true,
      table: 'packages',
      records: res.rows,
      available_modules: availableModules,
    });
  } catch (error) {
    console.error('Error fetching packages:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'packages');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message },
        { status: auth.status || 403 }
      );
    }

    const body = await request.json();
    const data = body.data || body;
    const name = (data.name || '').trim() || 'Untitled Package';

    let appId = data.app_id ? Number(data.app_id) : null;
    const isQuickCreate = Boolean(data.is_quick_create || name === 'Untitled Package');

    if (!appId) {
      if (isQuickCreate) {
        // Auto-assign first available app if provisioning default package
        const defaultApp = await queryDb('SELECT id FROM apps ORDER BY id ASC LIMIT 1');
        if (defaultApp.rows.length > 0) {
          appId = defaultApp.rows[0].id;
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'A linked application (app_id) is required.' },
          { status: 400 }
        );
      }
    }

    const slug = await generateUniqueSlug(name);
    const description = data.description || '';
    const monthlyPriceUsd = Math.max(
      0,
      Number(
        data.monthly_price_usd !== undefined
          ? data.monthly_price_usd
          : (data.price !== undefined ? data.price : (data.price_in_cents ? Number(data.price_in_cents) / 100 : 0))
      ) || 0
    );
    const yearlyPriceUsd = Math.max(0, Number(data.yearly_price_usd !== undefined ? data.yearly_price_usd : 0) || 0);
    const monthlyPriceBdt = Math.max(0, Number(data.monthly_price_bdt !== undefined ? data.monthly_price_bdt : 0) || 0);
    const yearlyPriceBdt = Math.max(0, Number(data.yearly_price_bdt !== undefined ? data.yearly_price_bdt : 0) || 0);
    const priceInCents = Math.round(monthlyPriceUsd * 100);
    const currency = (data.currency || 'USD').toUpperCase();
    const billingInterval = (data.billing_interval || data.billingInterval || 'MONTHLY').toUpperCase();
    const maxWebsites = data.max_websites !== undefined
      ? Math.max(1, Number(data.max_websites))
      : (data.max_portfolios !== undefined ? Math.max(1, Number(data.max_portfolios)) : 1);
    const isActive = data.is_active !== undefined ? Boolean(data.is_active) : true;

    const res = await queryDb(
      `INSERT INTO packages (
        name, slug, description, price_in_cents, currency, billing_interval,
        monthly_price_usd, yearly_price_usd, monthly_price_bdt, yearly_price_bdt,
        max_websites, max_portfolios, is_active, app_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        name, slug, description, priceInCents, currency, billingInterval,
        monthlyPriceUsd, yearlyPriceUsd, monthlyPriceBdt, yearlyPriceBdt,
        maxWebsites, maxWebsites, isActive, appId
      ]
    );

    const newPackage = res.rows[0];

    // Handle allowed_modules selection dynamically
    let modulesToSave = Array.isArray(data.allowed_modules)
      ? data.allowed_modules
      : (Array.isArray(data.modules) ? data.modules : null);

    // If no modules provided during quick creation, inherit linked app's modules
    if (!modulesToSave && appId) {
      const appMods = await queryDb(
        `SELECT wm.name 
         FROM app_modules am 
         JOIN website_modules wm ON am.website_module_id = wm.id 
         WHERE am.app_id = $1 
         ORDER BY wm.id ASC`,
        [appId]
      ).catch(() => ({ rows: [] }));
      modulesToSave = appMods.rows.map((r) => r.name);
    }

    if (Array.isArray(modulesToSave) && modulesToSave.length > 0) {
      for (const modItem of modulesToSave) {
        const cleanTitle = String(
          typeof modItem === 'object' && modItem !== null
            ? (modItem.name || modItem.title || modItem.slug || '')
            : (modItem || '')
        ).trim();
        if (cleanTitle) {
          await queryDb(
            `INSERT INTO allowed_modules (package_id, module_title) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [newPackage.id, cleanTitle]
          ).catch((e) => console.warn('Error inserting allowed_module:', e.message));
        }
      }
    }

    const modRes = await queryDb(
      `SELECT module_title FROM allowed_modules WHERE package_id = $1 ORDER BY id ASC`,
      [newPackage.id]
    ).catch(() => ({ rows: [] }));

    newPackage.allowed_modules = modRes.rows.map((r) => r.module_title);

    return NextResponse.json({
      success: true,
      message: 'Package created successfully',
      record: newPackage,
      package: newPackage,
    }, { status: 201 });
  } catch (error) {
    console.error('Error processing package POST request:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(request) {
  try {
    const auth = await hasModulePermission(request, 'packages');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message },
        { status: auth.status || 403 }
      );
    }

    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || body.id || body.packageId || body.data?.id;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Package ID is required' }, { status: 400 });
    }

    const existingRes = await queryDb('SELECT * FROM packages WHERE id = $1', [Number(id)]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Package not found' }, { status: 404 });
    }
    const current = existingRes.rows[0];

    const data = body.data || body;
    const name = data.name !== undefined ? (data.name || '').trim() : current.name;
    if (!name) {
      return NextResponse.json({ success: false, error: 'Package name cannot be empty' }, { status: 400 });
    }

    const appId = data.app_id !== undefined ? (data.app_id ? Number(data.app_id) : null) : current.app_id;
    if (!appId) {
      return NextResponse.json({ success: false, error: 'A linked application (app_id) is required' }, { status: 400 });
    }

    let slug = current.slug;
    if (name && name !== current.name) {
      slug = await generateUniqueSlug(name, Number(id));
    }

    const description = data.description !== undefined ? data.description : current.description;
    const monthlyPriceUsd = data.monthly_price_usd !== undefined
      ? Math.max(0, Number(data.monthly_price_usd) || 0)
      : Number(current.monthly_price_usd !== undefined ? current.monthly_price_usd : 0);
    const yearlyPriceUsd = data.yearly_price_usd !== undefined
      ? Math.max(0, Number(data.yearly_price_usd) || 0)
      : Number(current.yearly_price_usd !== undefined ? current.yearly_price_usd : 0);
    const monthlyPriceBdt = data.monthly_price_bdt !== undefined
      ? Math.max(0, Number(data.monthly_price_bdt) || 0)
      : Number(current.monthly_price_bdt !== undefined ? current.monthly_price_bdt : 0);
    const yearlyPriceBdt = data.yearly_price_bdt !== undefined
      ? Math.max(0, Number(data.yearly_price_bdt) || 0)
      : Number(current.yearly_price_bdt !== undefined ? current.yearly_price_bdt : 0);
    const priceInCents = Math.round(monthlyPriceUsd * 100);
    const currency = data.currency !== undefined ? (data.currency || 'USD').toUpperCase() : current.currency;
    const billingInterval = (data.billing_interval || data.billingInterval) !== undefined
      ? (data.billing_interval || data.billingInterval || 'MONTHLY').toUpperCase()
      : current.billing_interval;
    const maxWebsites = data.max_websites !== undefined
      ? Math.max(1, Number(data.max_websites))
      : (data.max_portfolios !== undefined
          ? Math.max(1, Number(data.max_portfolios))
          : (current.max_websites !== undefined ? current.max_websites : (current.max_portfolios || 1)));
    const isActive = data.is_active !== undefined ? Boolean(data.is_active) : current.is_active;

    const res = await queryDb(
      `UPDATE packages
       SET name = $1,
           slug = $2,
           description = $3,
           price_in_cents = $4,
           currency = $5,
           billing_interval = $6,
           monthly_price_usd = $7,
           yearly_price_usd = $8,
           monthly_price_bdt = $9,
           yearly_price_bdt = $10,
           max_websites = $11,
           max_portfolios = $12,
           is_active = $13,
           app_id = $14,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $15
       RETURNING *`,
      [
        name, slug, description, priceInCents, currency, billingInterval,
        monthlyPriceUsd, yearlyPriceUsd, monthlyPriceBdt, yearlyPriceBdt,
        maxWebsites, maxWebsites, isActive, appId, Number(id)
      ]
    );

    const updatedPackage = res.rows[0];

    // Synchronize allowed_modules if provided
    const modulesToSave = Array.isArray(data.allowed_modules)
      ? data.allowed_modules
      : (Array.isArray(data.modules) ? data.modules : null);

    if (modulesToSave !== null) {
      await queryDb('DELETE FROM allowed_modules WHERE package_id = $1', [Number(id)]);
      for (const modItem of modulesToSave) {
        const cleanTitle = String(
          typeof modItem === 'object' && modItem !== null
            ? (modItem.name || modItem.title || modItem.slug || '')
            : (modItem || '')
        ).trim();
        if (cleanTitle) {
          await queryDb(
            `INSERT INTO allowed_modules (package_id, module_title) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [Number(id), cleanTitle]
          ).catch((e) => console.warn('Error syncing allowed_module:', e.message));
        }
      }
    }

    const modRes = await queryDb(
      `SELECT module_title FROM allowed_modules WHERE package_id = $1 ORDER BY id ASC`,
      [Number(id)]
    ).catch(() => ({ rows: [] }));

    updatedPackage.allowed_modules = modRes.rows.map((r) => r.module_title);

    return NextResponse.json({
      success: true,
      message: 'Package updated successfully',
      record: updatedPackage,
      package: updatedPackage,
    });
  } catch (error) {
    console.error('Error updating package PUT:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request) {
  try {
    const auth = await hasModulePermission(request, 'packages');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message },
        { status: auth.status || 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id') || searchParams.get('packageId');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id || body.packageId;
    }
    if (!id) {
      return NextResponse.json({ success: false, error: 'Package ID is required' }, { status: 400 });
    }

    const res = await queryDb('DELETE FROM packages WHERE id = $1 RETURNING id, name', [Number(id)]);
    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Package not found or already deleted' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Package deleted successfully', deleted: res.rows[0] });
  } catch (error) {
    console.error('Error deleting package:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const auth = await hasModulePermission(request, 'packages');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message },
        { status: auth.status || 403 }
      );
    }

    const body = await request.json();
    const id = body.id || body.packageId;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Package ID is required' }, { status: 400 });
    }

    const res = await queryDb(
      `UPDATE packages
       SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [Number(id)]
    );
    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Package not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, record: res.rows[0] });
  } catch (error) {
    console.error('Error toggling package status:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
