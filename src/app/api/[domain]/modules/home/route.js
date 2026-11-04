import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

/**
 * GET /api/[domain]/modules/home
 * Returns the catalog of public frontend home modules (website_home_modules)
 */
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const active = searchParams.get('active');

    let sql = 'SELECT * FROM website_home_modules';
    const conds = [];
    const params = [];

    if (active === 'true') {
      conds.push('is_active = TRUE');
    } else if (active === 'false') {
      conds.push('is_active = FALSE');
    }

    if (category && category.trim()) {
      params.push(category.trim());
      conds.push(`LOWER(category) = LOWER($${params.length})`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      conds.push(`(LOWER(name) LIKE $${params.length} OR LOWER(slug) LIKE $${params.length} OR LOWER(description) LIKE $${params.length} OR LOWER(path) LIKE $${params.length})`);
    }

    if (conds.length > 0) {
      sql += ' WHERE ' + conds.join(' AND ');
    }
    sql += ' ORDER BY display_order ASC, id ASC';

    const res = await queryDb(sql, params).catch(() => ({ rows: [] }));
    const modules = res.rows || [];
    const categories = Array.from(new Set(modules.map((m) => m.category).filter(Boolean)));

    return NextResponse.json({
      success: true,
      modules,
      total: modules.length,
      categories,
    });
  } catch (error) {
    console.error('Error fetching home modules:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/[domain]/modules/home
 * Toggle or update a home module
 */
export async function PATCH(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { id, slug, is_active, display_order, description, name, category, icon } = body;

    if (!id && !slug) {
      return NextResponse.json(
        { success: false, error: 'Module id or slug is required.' },
        { status: 400 }
      );
    }

    const updates = [];
    const params = [];

    if (typeof is_active === 'boolean') {
      params.push(is_active);
      updates.push(`is_active = $${params.length}`);
    }

    if (typeof display_order === 'number') {
      params.push(display_order);
      updates.push(`display_order = $${params.length}`);
    }

    if (typeof description === 'string') {
      params.push(description.trim());
      updates.push(`description = $${params.length}`);
    }

    if (typeof name === 'string' && name.trim()) {
      params.push(name.trim());
      updates.push(`name = $${params.length}`);
    }

    if (typeof category === 'string' && category.trim()) {
      params.push(category.trim());
      updates.push(`category = $${params.length}`);
    }

    if (typeof icon === 'string' && icon.trim()) {
      params.push(icon.trim());
      updates.push(`icon = $${params.length}`);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields provided to update.' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    const identifierCol = id ? 'id' : 'slug';
    params.push(id || slug);

    const updateSql = `
      UPDATE website_home_modules
      SET ${updates.join(', ')}
      WHERE ${identifierCol} = $${params.length}
      RETURNING *
    `;

    const res = await queryDb(updateSql, params);
    if (res.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Home module not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Home module updated successfully.',
      module: res.rows[0],
    });
  } catch (error) {
    console.error('Error updating home module:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

