import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { hasModulePermission } from '@/lib/middleware/developer';

function slugify(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

function parseModuleIds(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .map((id) => (typeof id === 'object' && id !== null ? Number(id.id) : Number(id)))
      .filter((id) => !isNaN(id) && id > 0);
  }
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) return parseModuleIds(parsed);
    } catch (_) {}
    return input
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((id) => !isNaN(id) && id > 0);
  }
  return [];
}

export async function GET(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'apps');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug || '').trim();

    const sql = `
      SELECT 
        a.id,
        a.title,
        a.slug,
        a.description,
        a.short_description,
        a.is_published,
        a.created_at,
        a.updated_at,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', ai.id,
                'app_id', ai.app_id,
                'image', ai.image,
                'image_id', ai.image_id,
                'title', ai.title,
                'created_at', ai.created_at
              ) ORDER BY ai.id ASC
            )
            FROM apps_images ai
            WHERE ai.app_id = a.id
          ),
          '[]'::json
        ) AS images,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', wm.id,
                'name', wm.name,
                'slug', wm.slug,
                'description', wm.description,
                'is_active', am.is_active
              ) ORDER BY wm.id ASC
            )
            FROM app_modules am
            JOIN website_modules wm ON am.website_module_id = wm.id
            WHERE am.app_id = a.id
          ),
          '[]'::json
        ) AS modules,
        COALESCE(
          (
            SELECT array_agg(am.website_module_id ORDER BY am.website_module_id ASC)
            FROM app_modules am
            WHERE am.app_id = a.id
          ),
          ARRAY[]::integer[]
        ) AS website_module_ids
      FROM apps a
      WHERE a.slug = $1 OR a.id::text = $1
      LIMIT 1
    `;

    const res = await queryDb(sql, [cleanSlug]);
    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'App not found' }, { status: 404 });
    }

    const app = res.rows[0];

    // Fetch selectable website modules
    const availableModulesRes = await queryDb(
      `SELECT id, name, slug, description FROM website_modules WHERE (website_id IS NULL OR is_enabled = TRUE) AND is_active = TRUE ORDER BY id ASC`
    );

    // Fetch associated themes
    const themesRes = await queryDb(
      `SELECT id, title, slug, link, description FROM themes WHERE app_id = $1 ORDER BY id ASC`,
      [app.id]
    );

    // Fetch associated packages
    const pkgsRes = await queryDb(
      `SELECT id, name, slug, price, discount, is_active FROM packages WHERE app_id = $1 ORDER BY price ASC`,
      [app.id]
    );

    return NextResponse.json({
      success: true,
      app,
      record: app,
      available_modules: availableModulesRes.rows || [],
      themes: themesRes.rows || [],
      packages: pkgsRes.rows || [],
    });
  } catch (error) {
    console.error('Developer app GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'apps');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug || '').trim();

    const existingRes = await queryDb('SELECT * FROM apps WHERE slug = $1 OR id::text = $1 LIMIT 1', [cleanSlug]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'App not found' }, { status: 404 });
    }

    const currentApp = existingRes.rows[0];
    const body = await request.json();
    const data = body.data || body;

    const newTitle = data.title !== undefined ? data.title.trim() : currentApp.title;
    let newSlug = currentApp.slug;
    if (newTitle && newTitle !== currentApp.title) {
      const baseSlug = slugify(newTitle) || 'app';
      newSlug = baseSlug;
      const slugCheck = await queryDb(
        'SELECT id FROM apps WHERE slug = $1 AND id != $2 LIMIT 1',
        [newSlug, currentApp.id]
      );
      if (slugCheck.rows.length > 0) {
        newSlug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }

    const newShort = data.short_description !== undefined ? data.short_description : currentApp.short_description;
    const newDesc = data.description !== undefined ? data.description : currentApp.description;
    const newPublished = data.is_published !== undefined ? Boolean(data.is_published) : currentApp.is_published;

    await queryDb(
      `UPDATE apps
       SET title = $1, slug = $2, short_description = $3, description = $4,
           is_published = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6`,
      [newTitle, newSlug, newShort, newDesc, newPublished, currentApp.id]
    );

    // Synchronize website modules if provided
    if (data.website_module_ids !== undefined || data.module_ids !== undefined || data.modules !== undefined) {
      const modIds = parseModuleIds(data.website_module_ids ?? data.module_ids ?? data.modules);
      await queryDb('DELETE FROM app_modules WHERE app_id = $1', [currentApp.id]);
      for (const modId of modIds) {
        await queryDb(
          `INSERT INTO app_modules (app_id, website_module_id, is_active)
           VALUES ($1, $2, TRUE)
           ON CONFLICT (app_id, website_module_id) DO UPDATE SET is_active = TRUE`,
          [currentApp.id, modId]
        );
      }
    }

    // Fetch full updated record
    const fullRes = await queryDb(
      `SELECT 
        a.id,
        a.title,
        a.slug,
        a.description,
        a.short_description,
        a.is_published,
        a.created_at,
        a.updated_at,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', ai.id,
                'app_id', ai.app_id,
                'image', ai.image,
                'image_id', ai.image_id,
                'title', ai.title,
                'created_at', ai.created_at
              ) ORDER BY ai.id ASC
            )
            FROM apps_images ai
            WHERE ai.app_id = a.id
          ),
          '[]'::json
        ) AS images,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', wm.id,
                'name', wm.name,
                'slug', wm.slug,
                'description', wm.description,
                'is_active', am.is_active
              ) ORDER BY wm.id ASC
            )
            FROM app_modules am
            JOIN website_modules wm ON am.website_module_id = wm.id
            WHERE am.app_id = a.id
          ),
          '[]'::json
        ) AS modules,
        COALESCE(
          (
            SELECT array_agg(am.website_module_id ORDER BY am.website_module_id ASC)
            FROM app_modules am
            WHERE am.app_id = a.id
          ),
          ARRAY[]::integer[]
        ) AS website_module_ids
      FROM apps a
      WHERE a.id = $1`,
      [currentApp.id]
    );

    const record = fullRes.rows[0];

    return NextResponse.json({
      success: true,
      record,
      app: record,
      message: 'App updated successfully',
    });
  } catch (error) {
    console.error('Developer app PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'apps');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug || '').trim();

    const existingRes = await queryDb('SELECT id, title FROM apps WHERE slug = $1 OR id::text = $1 LIMIT 1', [cleanSlug]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'App not found' }, { status: 404 });
    }

    const appId = existingRes.rows[0].id;
    const appTitle = existingRes.rows[0].title;

    await queryDb('DELETE FROM apps_images WHERE app_id = $1', [appId]);
    await queryDb('DELETE FROM app_modules WHERE app_id = $1', [appId]);
    await queryDb('UPDATE packages SET app_id = NULL WHERE app_id = $1', [appId]).catch(() => {});
    await queryDb('UPDATE blogs SET app_id = NULL WHERE app_id = $1', [appId]).catch(() => {});
    await queryDb('DELETE FROM apps WHERE id = $1', [appId]);

    return NextResponse.json({
      success: true,
      message: `App "${appTitle}" deleted successfully`,
    });
  } catch (error) {
    console.error('Developer app DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
