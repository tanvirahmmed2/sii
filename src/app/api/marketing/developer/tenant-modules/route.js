import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { hasModulePermission } from 'src/lib/middleware/developer';
import slugify from 'slugify';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const includeInactive = searchParams.get('include_inactive') === 'true';
    const type = (searchParams.get('type') || 'system').toLowerCase();

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

    if (type === 'control') {
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
    }

    if (type === 'all') {
      const [hRes, cRes, sRes] = await Promise.all([
        queryDb('SELECT * FROM website_home_modules ORDER BY display_order ASC, id ASC').catch(() => ({ rows: [] })),
        queryDb('SELECT * FROM website_control_modules ORDER BY category ASC, display_order ASC, id ASC').catch(() => ({ rows: [] })),
        queryDb('SELECT * FROM website_modules ORDER BY id ASC').catch(() => ({ rows: [] })),
      ]);
      return NextResponse.json({
        success: true,
        type: 'all',
        home_modules: hRes.rows || [],
        control_modules: cRes.rows || [],
        system_modules: sRes.rows || [],
        total: (hRes.rows?.length || 0) + (cRes.rows?.length || 0) + (sRes.rows?.length || 0),
      });
    }

    let sql = 'SELECT * FROM website_modules';
    const conditions = [];
    const params = [];

    if (!includeInactive) {
      conditions.push('is_active = TRUE');
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      conditions.push(`(LOWER(name) LIKE $${params.length} OR LOWER(description) LIKE $${params.length} OR LOWER(slug) LIKE $${params.length})`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY id ASC';

    const res = await queryDb(sql, params).catch(() => ({ rows: [] }));

    return NextResponse.json({
      success: true,
      records: res.rows,
      modules: res.rows,
      total: res.rows.length,
    });
  } catch (error) {
    console.error('Error fetching website modules:', error);
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

    if (!name) {
      return NextResponse.json({ success: false, error: 'Module name is required' }, { status: 400 });
    }

    const baseSlug = slugify(data.slug || name, { lower: true, strict: true, trim: true }) || 'module';
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const check = await queryDb('SELECT id FROM website_modules WHERE slug = $1 LIMIT 1', [slug]);
      if (check.rows.length === 0) break;
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    const description = data.description || '';
    const icon = data.icon || 'BiLayer';
    const isActive = data.is_active !== undefined ? Boolean(data.is_active) : true;

    const res = await queryDb(
      `INSERT INTO website_modules (name, slug, description, icon, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, slug, description, icon, isActive]
    );

    return NextResponse.json({
      success: true,
      message: 'Website module created successfully',
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
    const type = (data.type || new URL(request.url).searchParams.get('type') || 'system').toLowerCase();
    const id = data.id || new URL(request.url).searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Module ID is required' }, { status: 400 });
    }

    if (type === 'home') {
      const existingRes = await queryDb('SELECT * FROM website_home_modules WHERE id = $1', [id]);
      if (existingRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Home module not found' }, { status: 404 });
      }
      const current = existingRes.rows[0];
      const name = data.name !== undefined ? data.name.trim() : current.name;
      const description = data.description !== undefined ? data.description : current.description;
      const icon = data.icon !== undefined ? data.icon : current.icon;
      const category = data.category !== undefined ? data.category : current.category;
      const isActive = data.is_active !== undefined ? Boolean(data.is_active) : current.is_active;

      const res = await queryDb(
        `UPDATE website_home_modules
         SET name = $1, description = $2, icon = $3, category = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING *`,
        [name, description, icon, category, isActive, id]
      );
      return NextResponse.json({
        success: true,
        message: 'Home module updated successfully',
        record: res.rows[0],
      });
    }

    if (type === 'control') {
      const existingRes = await queryDb('SELECT * FROM website_control_modules WHERE id = $1', [id]);
      if (existingRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Control module not found' }, { status: 404 });
      }
      const current = existingRes.rows[0];
      const name = data.name !== undefined ? data.name.trim() : current.name;
      const description = data.description !== undefined ? data.description : current.description;
      const icon = data.icon !== undefined ? data.icon : current.icon;
      const category = data.category !== undefined ? data.category : current.category;
      const isActive = data.is_active !== undefined ? Boolean(data.is_active) : current.is_active;

      const res = await queryDb(
        `UPDATE website_control_modules
         SET name = $1, description = $2, icon = $3, category = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING *`,
        [name, description, icon, category, isActive, id]
      );
      return NextResponse.json({
        success: true,
        message: 'Control module updated successfully',
        record: res.rows[0],
      });
    }

    const existingRes = await queryDb('SELECT * FROM website_modules WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Module not found' }, { status: 404 });
    }
    const current = existingRes.rows[0];

    const name = data.name !== undefined ? data.name.trim() : current.name;
    const description = data.description !== undefined ? data.description : current.description;
    const icon = data.icon !== undefined ? data.icon : current.icon;
    const isActive = data.is_active !== undefined ? Boolean(data.is_active) : current.is_active;

    const res = await queryDb(
      `UPDATE website_modules
       SET name = $1, description = $2, icon = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [name, description, icon, isActive, id]
    );

    return NextResponse.json({
      success: true,
      message: 'Website module updated successfully',
      record: res.rows[0],
    });
  } catch (error) {
    console.error('Error updating website module:', error);
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

    if (!id) {
      return NextResponse.json({ success: false, error: 'Module ID is required' }, { status: 400 });
    }

    await queryDb('DELETE FROM website_modules WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: 'Website module deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting website module:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
