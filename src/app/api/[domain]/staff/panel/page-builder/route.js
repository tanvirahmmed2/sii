import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStaffSession } from 'src/lib/middleware/staff.js';

async function verifyStaffAccess(request, context) {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }
  const staffSession = await getStaffSession(request);
  if (!staffSession) {
    return { error: 'Unauthorized: Staff access required.', status: 401 };
  }

  const staffWebsiteId =
    staffSession?.website_id ||
    staffSession?.websiteId ||
    staffSession?.staff?.websiteId ||
    staffSession?.staff?.website_id;

  if (staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
  }

  return { website, staffSession };
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const websiteId = auth.website.id;

    const pagesRes = await queryDb(
      `SELECT * FROM website_pages WHERE website_id = $1 ORDER BY is_homepage DESC, updated_at DESC`,
      [websiteId]
    );

    let themeRes = await queryDb(
      `SELECT * FROM website_themes WHERE website_id = $1 AND is_active = TRUE LIMIT 1`,
      [websiteId]
    );
    if (themeRes.rows.length === 0) {
      const initTheme = await queryDb(
        `INSERT INTO website_themes (website_id, name, colors, fonts)
         VALUES ($1, 'Primary Campus Theme', '{"primary": "#2563eb", "secondary": "#475569", "accent": "#f59e0b"}'::jsonb, '{"body": "Inter", "heading": "Inter"}'::jsonb)
         RETURNING *`,
        [websiteId]
      );
      themeRes = initTheme;
    }

    const blocksRes = await queryDb(
      `SELECT * FROM website_global_blocks WHERE website_id = $1 ORDER BY block_type ASC`,
      [websiteId]
    );

    const menusRes = await queryDb(
      `SELECT * FROM website_menus WHERE website_id = $1 ORDER BY location ASC`,
      [websiteId]
    );

    const mediaRes = await queryDb(
      `SELECT * FROM website_media_files WHERE website_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [websiteId]
    );

    return NextResponse.json({
      success: true,
      pages: pagesRes.rows || [],
      theme: themeRes.rows[0] || null,
      global_blocks: blocksRes.rows || [],
      menus: menusRes.rows || [],
      media_files: mediaRes.rows || [],
    });
  } catch (error) {
    console.error('Error in page-builder GET:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json();
    const { action } = body;
    const websiteId = auth.website.id;

    if (action === 'save_page') {
      const { id, title, slug, content, meta_title, meta_description, is_published, is_homepage, template } = body;
      if (!title) {
        return NextResponse.json({ success: false, error: 'Page title is required' }, { status: 400 });
      }

      const pageSlug = slug ? slugify(slug) : slugify(title);

      if (id) {
        const updateRes = await queryDb(
          `UPDATE website_pages 
           SET title = $1, slug = $2, content = $3, meta_title = $4, meta_description = $5,
               is_published = $6, is_homepage = $7, template = COALESCE($8, template), updated_at = CURRENT_TIMESTAMP
           WHERE id = $9 AND website_id = $10
           RETURNING *`,
          [title, pageSlug, JSON.stringify(content || []), meta_title || null, meta_description || null, Boolean(is_published), Boolean(is_homepage), template, id, websiteId]
        );

        const versionCount = await queryDb(`SELECT COUNT(*) as count FROM website_page_versions WHERE page_id = $1`, [id]);
        const nextVersion = parseInt(versionCount.rows[0]?.count || 0, 10) + 1;
        await queryDb(
          `INSERT INTO website_page_versions (website_id, page_id, version_number, content, change_summary)
           VALUES ($1, $2, $3, $4, 'Page updated from staff panel')`,
          [websiteId, id, nextVersion, JSON.stringify(content || [])]
        );

        return NextResponse.json({ success: true, message: 'Page updated successfully', page: updateRes.rows[0] });
      } else {
        const insertRes = await queryDb(
          `INSERT INTO website_pages (website_id, title, slug, content, meta_title, meta_description, is_published, is_homepage, template)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [websiteId, title, pageSlug, JSON.stringify(content || []), meta_title || null, meta_description || null, Boolean(is_published), Boolean(is_homepage), template || 'default']
        );

        await queryDb(
          `INSERT INTO website_page_versions (website_id, page_id, version_number, content, change_summary)
           VALUES ($1, $2, 1, $3, 'Initial page creation')`,
          [websiteId, insertRes.rows[0].id, JSON.stringify(content || [])]
        );

        return NextResponse.json({ success: true, message: 'Page created successfully', page: insertRes.rows[0] });
      }
    }

    if (action === 'save_block') {
      const { name, block_type, content, is_active } = body;
      if (!name || !block_type) {
        return NextResponse.json({ success: false, error: 'Block name and type are required' }, { status: 400 });
      }

      const res = await queryDb(
        `INSERT INTO website_global_blocks (website_id, name, block_type, content, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [websiteId, name, block_type, JSON.stringify(content || {}), is_active !== false]
      );
      return NextResponse.json({ success: true, message: 'Global block saved', block: res.rows[0] });
    }

    if (action === 'update_theme') {
      const { colors, fonts, custom_css } = body;
      const res = await queryDb(
        `UPDATE website_themes 
         SET colors = COALESCE($1, colors), fonts = COALESCE($2, fonts), custom_css = COALESCE($3, custom_css), updated_at = CURRENT_TIMESTAMP
         WHERE website_id = $4 AND is_active = TRUE
         RETURNING *`,
        [JSON.stringify(colors || {}), JSON.stringify(fonts || {}), custom_css, websiteId]
      );
      return NextResponse.json({ success: true, message: 'Theme updated successfully', theme: res.rows[0] });
    }

    return NextResponse.json({ success: false, error: 'Invalid action specified' }, { status: 400 });
  } catch (error) {
    console.error('Error in page-builder POST:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('page_id');
    const blockId = searchParams.get('block_id');
    const websiteId = auth.website.id;

    if (pageId) {
      await queryDb(`DELETE FROM website_pages WHERE id = $1 AND website_id = $2`, [pageId, websiteId]);
      return NextResponse.json({ success: true, message: 'Page deleted successfully' });
    }

    if (blockId) {
      await queryDb(`DELETE FROM website_global_blocks WHERE id = $1 AND website_id = $2`, [blockId, websiteId]);
      return NextResponse.json({ success: true, message: 'Block removed' });
    }

    return NextResponse.json({ success: false, error: 'Target ID not provided' }, { status: 400 });
  } catch (error) {
    console.error('Error in page-builder DELETE:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

