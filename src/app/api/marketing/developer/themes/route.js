import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { hasModulePermission } from '@/lib/middleware/developer';

export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'themes');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const res = await queryDb(`
      SELECT 
        t.*,
        a.title AS app_title,
        a.slug AS app_slug
      FROM themes t
      LEFT JOIN apps a ON t.app_id = a.id
      ORDER BY t.id ASC
    `).catch(() => ({ rows: [] }));
    return NextResponse.json({ success: true, table: 'themes', records: res.rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function slugify(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

// CREATE THEME
export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'themes');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const body = await request.json().catch(() => ({}));
    const data = body.data || body || {};
    const themeName = (data.title || data.name || 'Untitled Theme').trim();
    data.title = themeName;
    data.name = themeName;

    const baseSlug = slugify(themeName) || 'theme';
    let slug = baseSlug;
    const checkSlug = await queryDb('SELECT id FROM themes WHERE slug = $1 LIMIT 1', [slug]);
    if (checkSlug.rows.length > 0) {
      slug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    data.slug = slug;
    if (!data.category) {
      data.category = 'Modern';
    }
    const keys = Object.keys(data).filter((k) => k !== 'id' && k !== 'action');
    const values = keys.map((k) => (typeof data[k] === 'object' && data[k] !== null ? JSON.stringify(data[k]) : data[k]));
    const placeholders = keys.map((_, i) => '$' + (i + 1));
    const res = await queryDb(
      `INSERT INTO themes (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      values
    );
    return NextResponse.json({ success: true, record: res.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// UPDATE THEME
export async function PUT(request) {
  try {
    const auth = await hasModulePermission(request, 'themes');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const body = await request.json();
    const id = body.id || body.data?.id;
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });

    const existingRes = await queryDb('SELECT * FROM themes WHERE id = $1', [Number(id)]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Theme not found' }, { status: 404 });
    }
    const current = existingRes.rows[0];

    const data = body.data || body;
    const newTitle = data.title !== undefined ? data.title.trim() : (data.name !== undefined ? data.name.trim() : current.title);
    let newSlug = current.slug;
    if (newTitle && (newTitle !== current.title && newTitle !== current.name)) {
      const baseSlug = slugify(newTitle) || 'theme';
      newSlug = baseSlug;
      const slugCheck = await queryDb('SELECT id FROM themes WHERE slug = $1 AND id != $2 LIMIT 1', [newSlug, current.id]);
      if (slugCheck.rows.length > 0) {
        newSlug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }
    data.slug = newSlug;
    if (data.title !== undefined) data.title = newTitle;
    if (data.name !== undefined) data.name = newTitle;

    const keys = Object.keys(data).filter((k) => k !== 'id' && k !== 'action');
    if (keys.length === 0) return NextResponse.json({ success: true, record: current });
    const values = keys.map((k) => (typeof data[k] === 'object' && data[k] !== null ? JSON.stringify(data[k]) : data[k]));
    const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`);
    values.push(id);
    const res = await queryDb(
      `UPDATE themes SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
      values
    );
    return NextResponse.json({ success: true, record: res.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// DELETE THEME
export async function DELETE(request) {
  try {
    const auth = await hasModulePermission(request, 'themes');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    await queryDb('DELETE FROM themes WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
