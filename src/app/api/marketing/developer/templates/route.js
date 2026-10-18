import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { hasModulePermission } from 'src/lib/middleware/developer.js';
import { ALL_TASKS, resolveTaskConfig } from 'src/lib/templates/templateTables.js';
import { generateStarterFabricJSON, TASK_CONFIGS } from 'src/lib/templates/fabricTemplates.js';

function generateSlug(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// GET: List templates from separate task tables with category & search filters
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || searchParams.get('task');
    const search = searchParams.get('search')?.trim();
    const id = searchParams.get('id');

    // If specific task/category requested
    const targetTask = resolveTaskConfig(category);

    if (id && targetTask) {
      const res = await queryDb(
        `SELECT id, name, slug, '${targetTask.category}' AS category, description,
                dimension_width, dimension_height, dimension_unit,
                fabric_data, fabric_back_data, html_content, css_content,
                available_merge_tags, is_active, is_system_default,
                created_at, updated_at
         FROM ${targetTask.systemTable}
         WHERE id = $1
         LIMIT 1`,
        [Number(id)]
      );

      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, record: res.rows[0] });
    }

    // Single template lookup without task specified - check all task tables
    if (id && !targetTask) {
      for (const t of ALL_TASKS) {
        const r = await queryDb(
          `SELECT id, name, slug, '${t.category}' AS category, '${t.key}' AS task_key, description,
                  dimension_width, dimension_height, dimension_unit,
                  fabric_data, fabric_back_data, html_content, css_content,
                  available_merge_tags, is_active, is_system_default,
                  created_at, updated_at
           FROM ${t.systemTable}
           WHERE id = $1
           LIMIT 1`,
          [Number(id)]
        );
        if (r.rows.length > 0) {
          return NextResponse.json({ success: true, record: r.rows[0] });
        }
      }
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    // Filter by specific task table
    if (targetTask) {
      const conditions = [];
      const params = [];

      if (search) {
        params.push(`%${search}%`);
        conditions.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length})`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const res = await queryDb(
        `SELECT id, name, slug, '${targetTask.category}' AS category, '${targetTask.key}' AS task_key, description,
                dimension_width, dimension_height, dimension_unit,
                available_merge_tags, is_active, is_system_default,
                created_at, updated_at
         FROM ${targetTask.systemTable}
         ${whereClause}
         ORDER BY id ASC`,
        params
      );

      return NextResponse.json({
        success: true,
        records: res.rows,
        counts: { [targetTask.category]: res.rows.length },
        total: res.rows.length,
      });
    }

    // Multi-task catalog overview (all separate tables queried)
    const allRecords = [];
    const counts = {};

    for (const t of ALL_TASKS) {
      const conditions = [];
      const params = [];

      if (search) {
        params.push(`%${search}%`);
        conditions.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length})`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const res = await queryDb(
        `SELECT id, name, slug, '${t.category}' AS category, '${t.key}' AS task_key, description,
                dimension_width, dimension_height, dimension_unit,
                available_merge_tags, is_active, is_system_default,
                created_at, updated_at
         FROM ${t.systemTable}
         ${whereClause}
         ORDER BY id ASC`,
        params
      );

      counts[t.category] = res.rows.length;
      allRecords.push(...res.rows);
    }

    return NextResponse.json({
      success: true,
      records: allRecords,
      counts,
      total: allRecords.length,
    });
  } catch (error) {
    console.error('Error fetching system templates:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create a new template in its dedicated task table
export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'templates');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: 403 });
    }

    const body = await request.json();
    const name = (body.name || '').trim();
    const categoryOrTask = (body.category || body.task || '').trim();

    if (!name) {
      return NextResponse.json({ success: false, error: 'Template name is required' }, { status: 400 });
    }

    const targetTask = resolveTaskConfig(categoryOrTask);
    if (!targetTask) {
      return NextResponse.json({ success: false, error: `Invalid category/task: ${categoryOrTask}` }, { status: 400 });
    }

    let slug = generateSlug(body.slug || name);
    if (!slug) slug = `tpl-${Date.now()}`;

    // Ensure slug uniqueness in this task table
    const slugCheck = await queryDb(
      `SELECT id FROM ${targetTask.systemTable} WHERE slug = $1 LIMIT 1`,
      [slug]
    );
    if (slugCheck.rows.length > 0) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const description = body.description || '';
    const dimensionWidth = Number(body.dimension_width || targetTask.defaultWidth);
    const dimensionHeight = Number(body.dimension_height || targetTask.defaultHeight);
    const dimensionUnit = body.dimension_unit || (targetTask.category === 'poster' ? 'px' : 'mm');

    // Use provided Fabric data or fallback to task starter JSON
    const starterJSON = generateStarterFabricJSON(targetTask.key);
    const fabricData = body.fabric_data || starterJSON;
    const fabricBackData = body.fabric_back_data || (targetTask.category.includes('id_card') ? { version: '5.3.0', background: '#ffffff', objects: [] } : {});
    const htmlContent = body.html_content || '';
    const cssContent = body.css_content || '';

    const taskMeta = TASK_CONFIGS[targetTask.key];
    const availableMergeTags = body.available_merge_tags || taskMeta?.mergeTags || [];
    const devId = auth.developer?.id || null;

    const res = await queryDb(
      `INSERT INTO ${targetTask.systemTable}
       (name, slug, description, dimension_width, dimension_height, dimension_unit,
        fabric_data, fabric_back_data, html_content, css_content, available_merge_tags, is_active, created_by_developer_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, $12)
       RETURNING id, name, slug, '${targetTask.category}' AS category, '${targetTask.key}' AS task_key,
                 dimension_width, dimension_height, dimension_unit, is_active`,
      [
        name,
        slug,
        description,
        dimensionWidth,
        dimensionHeight,
        dimensionUnit,
        JSON.stringify(fabricData),
        JSON.stringify(fabricBackData),
        htmlContent,
        cssContent,
        JSON.stringify(availableMergeTags),
        devId,
      ]
    );

    return NextResponse.json({
      success: true,
      message: `${targetTask.title} created successfully in ${targetTask.systemTable}`,
      record: res.rows[0],
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
