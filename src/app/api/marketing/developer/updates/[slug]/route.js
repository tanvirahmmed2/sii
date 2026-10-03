import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';
import slugify from 'slugify';

function formatSlug(text) {
  return slugify(text || '', {
    lower: true,
    strict: true,
    trim: true,
  });
}

async function generateUniqueSlug(baseTitle, excludeId = null) {
  let baseSlug = formatSlug(baseTitle) || 'update';
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const checkSql = excludeId
      ? 'SELECT id FROM updates WHERE slug = $1 AND id != $2 LIMIT 1'
      : 'SELECT id FROM updates WHERE slug = $1 LIMIT 1';
    const params = excludeId ? [slug, Number(excludeId)] : [slug];
    const existing = await queryDb(checkSql, params);
    if (existing.rows.length === 0) return slug;
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

export async function GET(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'updates');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 401 });
    }

    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug || '').trim();

    const res = await queryDb(
      `SELECT id, version, title, slug, description, changelog, release_date, is_published, created_at, updated_at 
       FROM updates 
       WHERE slug = $1 OR id::text = $1 
       LIMIT 1`,
      [cleanSlug]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Update not found' }, { status: 404 });
    }

    const record = res.rows[0];
    return NextResponse.json({ success: true, record, update: record });
  } catch (error) {
    console.error('Developer update GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const authCheck = await hasModulePermission(request, 'updates');
    if (!authCheck.success) {
      return NextResponse.json({ success: false, error: authCheck.message }, { status: authCheck.status || 403 });
    }

    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug || '').trim();

    const existingRes = await queryDb('SELECT * FROM updates WHERE slug = $1 OR id::text = $1 LIMIT 1', [cleanSlug]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Update not found' }, { status: 404 });
    }

    const current = existingRes.rows[0];
    const body = await request.json();
    const version = body.version?.trim() || current.version || 'v1.0.0';
    const title = body.title?.trim() || current.title;
    const description = body.description !== undefined ? body.description?.trim() : current.description;
    const changelog = body.changelog !== undefined ? body.changelog?.trim() : current.changelog;
    const releaseDate = body.release_date !== undefined ? body.release_date : current.release_date;
    const isPublished = body.is_published !== undefined ? Boolean(body.is_published) : current.is_published;

    let newSlug = current.slug;
    if (title && title !== current.title) {
      newSlug = await generateUniqueSlug(title, current.id);
    }

    const res = await queryDb(
      `UPDATE updates 
       SET version = $1, title = $2, slug = $3, description = $4, changelog = $5, release_date = $6, is_published = $7, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $8 
       RETURNING id, version, title, slug, description, changelog, release_date, is_published, created_at, updated_at`,
      [version, title, newSlug, description, changelog, releaseDate, isPublished, current.id]
    );

    return NextResponse.json({
      success: true,
      record: res.rows[0],
      update: res.rows[0],
      message: 'Update saved successfully',
    });
  } catch (error) {
    console.error('Developer update PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const authCheck = await hasModulePermission(request, 'updates');
    if (!authCheck.success) {
      return NextResponse.json({ success: false, error: authCheck.message }, { status: authCheck.status || 403 });
    }

    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug || '').trim();

    const deleteRes = await queryDb(
      'DELETE FROM updates WHERE slug = $1 OR id::text = $1 RETURNING id, title, version',
      [cleanSlug]
    );

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Update not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Update "${deleteRes.rows[0].version} - ${deleteRes.rows[0].title}" deleted successfully`,
    });
  } catch (error) {
    console.error('Developer update DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
