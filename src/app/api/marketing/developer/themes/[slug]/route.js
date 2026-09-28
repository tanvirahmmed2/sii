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

export async function GET(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'themes');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 401 });
    }

    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug || '').trim();

    const res = await queryDb(
      `SELECT t.*, a.title AS app_title, a.slug AS app_slug
       FROM themes t
       LEFT JOIN apps a ON t.app_id = a.id
       WHERE t.slug = $1 OR t.id::text = $1
       LIMIT 1`,
      [cleanSlug]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Theme not found' }, { status: 404 });
    }

    const record = res.rows[0];
    return NextResponse.json({ success: true, record, theme: record, ...record });
  } catch (error) {
    console.error('Developer theme GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'themes');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 401 });
    }

    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug || '').trim();

    const existingRes = await queryDb('SELECT * FROM themes WHERE slug = $1 OR id::text = $1 LIMIT 1', [cleanSlug]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Theme not found' }, { status: 404 });
    }

    const current = existingRes.rows[0];
    const body = await request.json();
    const data = body.data || body;

    const title = data.title !== undefined ? data.title.trim() : (data.name !== undefined ? data.name.trim() : current.title);
    const name = title;
    let newSlug = current.slug;

    if (title && (title !== current.title && title !== current.name)) {
      const baseSlug = slugify(title) || 'theme';
      newSlug = baseSlug;
      const slugCheck = await queryDb('SELECT id FROM themes WHERE slug = $1 AND id != $2 LIMIT 1', [newSlug, current.id]);
      if (slugCheck.rows.length > 0) {
        newSlug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }

    const link = data.link !== undefined ? data.link.trim() : current.link;
    const description = data.description !== undefined ? data.description : current.description;
    const category = data.category !== undefined ? data.category : current.category;
    const previewImage = data.preview_image !== undefined ? data.preview_image : current.preview_image;
    const themeConfig = data.theme_config !== undefined ? (typeof data.theme_config === 'object' ? JSON.stringify(data.theme_config) : data.theme_config) : current.theme_config;
    const isActive = data.is_active !== undefined ? Boolean(data.is_active) : current.is_active;
    const isPremium = data.is_premium !== undefined ? Boolean(data.is_premium) : current.is_premium;
    const appId = data.app_id !== undefined ? (data.app_id ? Number(data.app_id) : null) : current.app_id;

    const res = await queryDb(
      `UPDATE themes
       SET title = $1, name = $2, slug = $3, link = $4, description = $5,
           category = $6, preview_image = $7, theme_config = $8, is_active = $9,
           is_premium = $10, app_id = $11, updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING *`,
      [title, name, newSlug, link, description, category, previewImage, themeConfig, isActive, isPremium, appId, current.id]
    );

    return NextResponse.json({
      success: true,
      record: res.rows[0],
      theme: res.rows[0],
      message: 'Theme updated successfully',
    });
  } catch (error) {
    console.error('Developer theme PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'themes');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 401 });
    }

    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug || '').trim();

    const deleteRes = await queryDb(
      'DELETE FROM themes WHERE slug = $1 OR id::text = $1 RETURNING id, title',
      [cleanSlug]
    );

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Theme not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Theme "${deleteRes.rows[0].title}" deleted successfully`,
    });
  } catch (error) {
    console.error('Developer theme DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
