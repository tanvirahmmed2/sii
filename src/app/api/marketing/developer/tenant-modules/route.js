import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';
import slugify from 'slugify';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const includeInactive = searchParams.get('include_inactive') === 'true';
    const type = (searchParams.get('type') || 'control').toLowerCase();

    if (type === 'home') {
      let sql = 'SELECT * FROM website_home_modules';
      const conds = [];
      const params = [];
      if (!includeInactive) conds.push('is_active = TRUE');
      if (search && search.trim()) {
        params.push(`%${search.trim().toLowerCase()}%`);
        conds.push(`(LOWER(name) LIKE $${params.length} OR LOWER(description) LIKE $${params.length} OR LOWER(slug) LIKE $${params.length} OR LOWER(path) LIKE $${params.length})`);
      }
      if (conds.length > 0) sql += ' WHERE ' + conds.join(' AND ');
      sql += ' ORDER BY display_order ASC, id ASC';
      const res = await queryDb(sql, params).catch(() => ({ rows: [] }));
      return NextResponse.json({
        success: true,
        type: 'home',
        records: res.rows,
        modules: res.rows,
        total: res.rows.length,
      });
    }

    if (type === 'all') {
      const [hRes, cRes] = await Promise.all([
        queryDb('SELECT * FROM website_home_modules ORDER BY display_order ASC, id ASC').catch(() => ({ rows: [] })),
        queryDb('SELECT * FROM website_control_modules ORDER BY category ASC, display_order ASC, id ASC').catch(() => ({ rows: [] })),
      ]);
      return NextResponse.json({
        success: true,
        type: 'all',
        home_modules: hRes.rows || [],
        control_modules: cRes.rows || [],
        total: (hRes.rows?.length || 0) + (cRes.rows?.length || 0),
      });
    }

    let sql = 'SELECT * FROM website_control_modules';
    const conds = [];
    const params = [];
    if (!includeInactive) conds.push('is_active = TRUE');
    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      conds.push(`(LOWER(name) LIKE $${params.length} OR LOWER(description) LIKE $${params.length} OR LOWER(slug) LIKE $${params.length} OR LOWER(path) LIKE $${params.length})`);
    }
    if (conds.length > 0) sql += ' WHERE ' + conds.join(' AND ');
    sql += ' ORDER BY category ASC, display_order ASC, id ASC';
    const res = await queryDb(sql, params).catch(() => ({ rows: [] }));

    return NextResponse.json({
      success: true,
      type: 'control',
      records: res.rows,
      modules: res.rows,
      total: res.rows.length,
    });
  } catch (error) {
    console.error('Error fetching tenant modules:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'packages');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const body = await request.json();
    const data = body.data || body;
    const name = (data.name || '').trim();
    const type = (data.type || 'control').toLowerCase();

    if (!name) {
      return NextResponse.json({ success: false, error: 'Module name is required' }, { status: 400 });
    }

    const targetTable = type === 'home' ? 'website_home_modules' : 'website_control_modules';
    const baseSlug = slugify(data.slug || name, { lower: true, strict: true, trim: true }) || 'module';
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const check = await queryDb(`SELECT id FROM ${targetTable} WHERE slug = $1 LIMIT 1`, [slug]);
      if (check.rows.length === 0) break;
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    const description = data.description || '';
    const icon = data.icon || (type === 'home' ? 'BiGlobe' : 'BiGridAlt');
    const category = data.category || (type === 'home' ? 'General' : 'General Management');
    const path = data.path || (type === 'home' ? `/${slug}` : `/staff-panel/${slug}`);
    const isActive = data.is_active !== undefined ? Boolean(data.is_active) : true;

    const res = await queryDb(
      `INSERT INTO ${targetTable} (name, slug, path, category, description, icon, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, slug, path, category, description, icon, isActive]
    );

    return NextResponse.json({
      success: true,
      message: `${type === 'home' ? 'Home' : 'Control'} module created successfully`,
      record: res.rows[0],
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating tenant module:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const auth = await hasModulePermission(request, 'packages');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const body = await request.json();
    const data = body.data || body;
    const type = (data.type || new URL(request.url).searchParams.get('type') || 'control').toLowerCase();
    const id = data.id || new URL(request.url).searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Module ID is required' }, { status: 400 });
    }

    const targetTable = type === 'home' ? 'website_home_modules' : 'website_control_modules';
    const existingRes = await queryDb(`SELECT * FROM ${targetTable} WHERE id = $1`, [id]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Module not found' }, { status: 404 });
    }
    const current = existingRes.rows[0];

    const name = data.name !== undefined ? data.name.trim() : current.name;
    const description = data.description !== undefined ? data.description : current.description;
    const icon = data.icon !== undefined ? data.icon : current.icon;
    const category = data.category !== undefined ? data.category : current.category;
    const path = data.path !== undefined ? data.path : current.path;
    const isActive = data.is_active !== undefined ? Boolean(data.is_active) : current.is_active;

    const res = await queryDb(
      `UPDATE ${targetTable}
       SET name = $1, description = $2, icon = $3, category = $4, path = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [name, description, icon, category, path, isActive, id]
    );

    return NextResponse.json({
      success: true,
      message: `${type === 'home' ? 'Home' : 'Control'} module updated successfully`,
      record: res.rows[0],
    });
  } catch (error) {
    console.error('Error updating module:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const auth = await hasModulePermission(request, 'packages');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = (searchParams.get('type') || 'control').toLowerCase();

    if (!id) {
      return NextResponse.json({ success: false, error: 'Module ID is required' }, { status: 400 });
    }

    const targetTable = type === 'home' ? 'website_home_modules' : 'website_control_modules';
    await queryDb(`DELETE FROM ${targetTable} WHERE id = $1`, [id]);

    return NextResponse.json({
      success: true,
      message: `${type === 'home' ? 'Home' : 'Control'} module deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting module:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
