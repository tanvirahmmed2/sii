import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { hasModulePermission } from 'src/lib/middleware/developer.js';
import { ALL_TASKS, resolveTaskConfig } from 'src/lib/templates/templateTables.js';

// Helper: locate which task table holds this ID
async function findTemplateRecord(id, optionalCategoryOrTask) {
  const numericId = Number(id);
  if (isNaN(numericId)) return null;

  if (optionalCategoryOrTask) {
    const specificTask = resolveTaskConfig(optionalCategoryOrTask);
    if (specificTask) {
      const res = await queryDb(
        `SELECT id, name, slug, '${specificTask.category}' AS category, '${specificTask.key}' AS task_key,
                description, dimension_width, dimension_height, dimension_unit,
                fabric_data, fabric_back_data, html_content, html_back_content, css_content,
                available_merge_tags, is_active, is_system_default, created_at, updated_at
         FROM ${specificTask.systemTable}
         WHERE id = $1 LIMIT 1`,
        [numericId]
      );
      if (res.rows.length > 0) {
        return { task: specificTask, record: res.rows[0] };
      }
    }
  }

  // Fallback: search all task tables
  for (const t of ALL_TASKS) {
    const res = await queryDb(
      `SELECT id, name, slug, '${t.category}' AS category, '${t.key}' AS task_key,
              description, dimension_width, dimension_height, dimension_unit,
              fabric_data, fabric_back_data, html_content, html_back_content, css_content,
              available_merge_tags, is_active, is_system_default, created_at, updated_at
       FROM ${t.systemTable}
       WHERE id = $1 LIMIT 1`,
      [numericId]
    );
    if (res.rows.length > 0) {
      return { task: t, record: res.rows[0] };
    }
  }

  return null;
}

// GET: Single template with Fabric.js data
export async function GET(request, context) {
  try {
    const params = await context.params;
    const id = params?.id;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Template ID is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const categoryOrTask = searchParams.get('category') || searchParams.get('task');

    const found = await findTemplateRecord(id, categoryOrTask);
    if (!found) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, record: found.record, task: found.task });
  } catch (error) {
    console.error('Error fetching template detail:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update template content, Fabric data, or metadata in its dedicated task table
export async function PUT(request, context) {
  try {
    const auth = await hasModulePermission(request, 'templates');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: 403 });
    }

    const params = await context.params;
    const id = params?.id;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Template ID is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const categoryOrTask = searchParams.get('category') || searchParams.get('task');

    const found = await findTemplateRecord(id, categoryOrTask);
    if (!found) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    const { task, record: current } = found;
    const body = await request.json();

    const name = body.name !== undefined ? (body.name || '').trim() : current.name;
    const description = body.description !== undefined ? body.description : current.description;
    const dimensionWidth = body.dimension_width !== undefined ? Number(body.dimension_width) : current.dimension_width;
    const dimensionHeight = body.dimension_height !== undefined ? Number(body.dimension_height) : current.dimension_height;
    const dimensionUnit = body.dimension_unit !== undefined ? body.dimension_unit : current.dimension_unit;
    const fabricData = body.fabric_data !== undefined ? body.fabric_data : current.fabric_data;
    const fabricBackData = body.fabric_back_data !== undefined ? body.fabric_back_data : current.fabric_back_data;
    const htmlContent = body.html_content !== undefined ? body.html_content : current.html_content;
    const htmlBackContent = body.html_back_content !== undefined ? body.html_back_content : current.html_back_content;
    const cssContent = body.css_content !== undefined ? body.css_content : current.css_content;
    const availableMergeTags = body.available_merge_tags !== undefined ? body.available_merge_tags : current.available_merge_tags;
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : current.is_active;

    const res = await queryDb(
      `UPDATE ${task.systemTable}
       SET name = $1, description = $2,
           dimension_width = $3, dimension_height = $4, dimension_unit = $5,
           fabric_data = $6, fabric_back_data = $7, html_content = $8, html_back_content = $9,
           css_content = $10, available_merge_tags = $11, is_active = $12, updated_at = CURRENT_TIMESTAMP
       WHERE id = $13
       RETURNING id, name, slug, '${task.category}' AS category, '${task.key}' AS task_key,
                 dimension_width, dimension_height, dimension_unit, is_active, updated_at`,
      [
        name,
        description,
        dimensionWidth,
        dimensionHeight,
        dimensionUnit,
        JSON.stringify(fabricData),
        JSON.stringify(fabricBackData),
        htmlContent,
        htmlBackContent,
        cssContent,
        JSON.stringify(availableMergeTags),
        isActive,
        Number(id),
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Template updated successfully with Fabric.js models',
      record: res.rows[0],
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete template from its dedicated task table
export async function DELETE(request, context) {
  try {
    const auth = await hasModulePermission(request, 'templates');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: 403 });
    }

    const params = await context.params;
    const id = params?.id;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Template ID is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const categoryOrTask = searchParams.get('category') || searchParams.get('task');

    const found = await findTemplateRecord(id, categoryOrTask);
    if (!found) {
      return NextResponse.json({ success: false, error: 'Template not found or already deleted' }, { status: 404 });
    }

    const { task } = found;
    const res = await queryDb(
      `DELETE FROM ${task.systemTable} WHERE id = $1 RETURNING id, name, slug`,
      [Number(id)]
    );

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
      deleted: res.rows[0],
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Clone / duplicate template within its dedicated task table
export async function POST(request, context) {
  try {
    const auth = await hasModulePermission(request, 'templates');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: 403 });
    }

    const params = await context.params;
    const id = params?.id;

    const { searchParams } = new URL(request.url);
    const categoryOrTask = searchParams.get('category') || searchParams.get('task');

    const found = await findTemplateRecord(id, categoryOrTask);
    if (!found) {
      return NextResponse.json({ success: false, error: 'Source template not found' }, { status: 404 });
    }

    const { task, record: src } = found;
    const cloneSlug = `${src.slug}-copy-${Math.floor(1000 + Math.random() * 9000)}`;
    const cloneName = `${src.name} (Copy)`;

    const res = await queryDb(
      `INSERT INTO ${task.systemTable}
       (name, slug, description, dimension_width, dimension_height, dimension_unit,
        fabric_data, fabric_back_data, html_content, css_content, available_merge_tags, is_active, is_system_default, created_by_developer_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, FALSE, $12)
       RETURNING id, name, slug, '${task.category}' AS category, '${task.key}' AS task_key,
                 dimension_width, dimension_height, dimension_unit, is_active`,
      [
        cloneName,
        cloneSlug,
        src.description,
        src.dimension_width,
        src.dimension_height,
        src.dimension_unit,
        JSON.stringify(src.fabric_data || {}),
        JSON.stringify(src.fabric_back_data || {}),
        src.html_content || '',
        src.css_content || '',
        JSON.stringify(src.available_merge_tags || []),
        auth.developer?.id || null,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Template duplicated successfully in dedicated table',
      record: res.rows[0],
    }, { status: 201 });
  } catch (error) {
    console.error('Error duplicating template:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
