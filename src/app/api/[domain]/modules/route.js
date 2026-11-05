import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

/**
 * GET /api/[domain]/modules
 * Query tenant website modules across Home Modules, Control Modules, and System Package Modules.
 * Query Parameters:
 *   - type: 'all' (default) | 'home' | 'control' | 'system'
 *   - category: string (optional category filter)
 *   - search: string (optional search term)
 *   - active: boolean ('true' | 'false' | 'all')
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
    const type = (searchParams.get('type') || 'all').toLowerCase();
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const active = searchParams.get('active');

    let homeModules = [];
    let controlModules = [];
    let systemModules = [];

    // Query Home Modules
    if (type === 'all' || type === 'home') {
      let homeSql = 'SELECT * FROM website_home_modules';
      const homeConds = [];
      const homeParams = [];

      if (active === 'true') {
        homeConds.push('is_active = TRUE');
      } else if (active === 'false') {
        homeConds.push('is_active = FALSE');
      }

      if (category && category.trim()) {
        homeParams.push(category.trim());
        homeConds.push(`LOWER(category) = LOWER($${homeParams.length})`);
      }

      if (search && search.trim()) {
        homeParams.push(`%${search.trim().toLowerCase()}%`);
        homeConds.push(`(LOWER(name) LIKE $${homeParams.length} OR LOWER(slug) LIKE $${homeParams.length} OR LOWER(description) LIKE $${homeParams.length} OR LOWER(path) LIKE $${homeParams.length})`);
      }

      if (homeConds.length > 0) {
        homeSql += ' WHERE ' + homeConds.join(' AND ');
      }
      homeSql += ' ORDER BY display_order ASC, id ASC';

      const homeRes = await queryDb(homeSql, homeParams).catch(() => ({ rows: [] }));
      homeModules = homeRes.rows || [];
    }

    // Query Control Modules
    if (type === 'all' || type === 'control') {
      let ctrlSql = 'SELECT * FROM website_control_modules';
      const ctrlConds = [];
      const ctrlParams = [];

      if (active === 'true') {
        ctrlConds.push('is_active = TRUE');
      } else if (active === 'false') {
        ctrlConds.push('is_active = FALSE');
      }

      if (category && category.trim()) {
        ctrlParams.push(category.trim());
        ctrlConds.push(`LOWER(category) = LOWER($${ctrlParams.length})`);
      }

      if (search && search.trim()) {
        ctrlParams.push(`%${search.trim().toLowerCase()}%`);
        ctrlConds.push(`(LOWER(name) LIKE $${ctrlParams.length} OR LOWER(slug) LIKE $${ctrlParams.length} OR LOWER(description) LIKE $${ctrlParams.length} OR LOWER(path) LIKE $${ctrlParams.length})`);
      }

      if (ctrlConds.length > 0) {
        ctrlSql += ' WHERE ' + ctrlConds.join(' AND ');
      }
      ctrlSql += ' ORDER BY category ASC, display_order ASC, id ASC';

      const ctrlRes = await queryDb(ctrlSql, ctrlParams).catch(() => ({ rows: [] }));
      controlModules = ctrlRes.rows || [];
    }

    // Calculate categories and counts
    const homeCategories = Array.from(new Set(homeModules.map((m) => m.category).filter(Boolean)));
    const controlCategories = Array.from(new Set(controlModules.map((m) => m.category).filter(Boolean)));

    return NextResponse.json({
      success: true,
      website_id: website.id,
      institution_name: website.name,
      type,
      home_modules: homeModules,
      control_modules: controlModules,
      summary: {
        total_home: homeModules.length,
        total_control: controlModules.length,
        total_all: homeModules.length + controlModules.length,
        home_categories: homeCategories,
        control_categories: controlCategories,
      },
    });
  } catch (error) {
    console.error('Error fetching tenant modules:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/[domain]/modules
 * Update status or metadata for a home or control module
 * Body:
 *   - type: 'home' | 'control' (required)
 *   - id: number (or slug)
 *   - is_active: boolean
 *   - display_order: number
 *   - description: string
 *   - name: string
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
    const { type, id, slug, is_active, display_order, description, name } = body;

    if (!type || (!id && !slug)) {
      return NextResponse.json(
        { success: false, error: 'Module type ("home" or "control") and id or slug are required.' },
        { status: 400 }
      );
    }

    const tableName = type.toLowerCase() === 'home' ? 'website_home_modules' : 'website_control_modules';
    const identifierCol = id ? 'id' : 'slug';
    const identifierVal = id || slug;

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

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields provided to update.' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(identifierVal);

    const updateSql = `
      UPDATE ${tableName}
      SET ${updates.join(', ')}
      WHERE ${identifierCol} = $${params.length}
      RETURNING *
    `;

    const res = await queryDb(updateSql, params);
    if (res.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: `Module not found in ${tableName}.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${type === 'home' ? 'Home' : 'Control'} module updated successfully.`,
      module: res.rows[0],
    });
  } catch (error) {
    console.error('Error updating tenant module:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

