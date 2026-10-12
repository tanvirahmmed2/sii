import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { hasModulePermission } from 'src/lib/middleware/developer.js';

// GET: Single template with full GrapesJS and HTML/CSS content
export async function GET(request, context) {
  try {
    const params = await context.params;
    const id = params?.id;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Template ID is required' }, { status: 400 });
    }

    const res = await queryDb(
      `SELECT id, name, slug, category, description,
              dimension_width, dimension_height, dimension_unit, orientation,
              grapes_data, html_content, css_content, thumbnail_url,
              available_merge_tags, is_active, is_system_default,
              created_at, updated_at
       FROM system_document_templates
       WHERE id = $1
       LIMIT 1`,
      [Number(id)]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, record: res.rows[0] });
  } catch (error) {
    console.error('Error fetching template detail:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update template content, styles, GrapesJS project data, or metadata
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

    const checkRes = await queryDb('SELECT * FROM system_document_templates WHERE id = $1 LIMIT 1', [Number(id)]);
    if (checkRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }
    const current = checkRes.rows[0];

    const body = await request.json();

    const name = body.name !== undefined ? (body.name || '').trim() : current.name;
    const category = body.category !== undefined ? body.category : current.category;
    const description = body.description !== undefined ? body.description : current.description;
    const dimensionWidth = body.dimension_width !== undefined ? Number(body.dimension_width) : current.dimension_width;
    const dimensionHeight = body.dimension_height !== undefined ? Number(body.dimension_height) : current.dimension_height;
    const dimensionUnit = body.dimension_unit !== undefined ? body.dimension_unit : current.dimension_unit;
    const orientation = body.orientation !== undefined ? body.orientation : current.orientation;
    const grapesData = body.grapes_data !== undefined ? body.grapes_data : current.grapes_data;
    const htmlContent = body.html_content !== undefined ? body.html_content : current.html_content;
    const cssContent = body.css_content !== undefined ? body.css_content : current.css_content;
    const availableMergeTags = body.available_merge_tags !== undefined ? body.available_merge_tags : current.available_merge_tags;
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : current.is_active;

    const res = await queryDb(
      `UPDATE system_document_templates
       SET name = $1, category = $2, description = $3,
           dimension_width = $4, dimension_height = $5, dimension_unit = $6, orientation = $7,
           grapes_data = $8, html_content = $9, css_content = $10,
           available_merge_tags = $11, is_active = $12, updated_at = CURRENT_TIMESTAMP
       WHERE id = $13
       RETURNING id, name, slug, category, dimension_width, dimension_height, dimension_unit, orientation, is_active, updated_at`,
      [
        name,
        category,
        description,
        dimensionWidth,
        dimensionHeight,
        dimensionUnit,
        orientation,
        JSON.stringify(grapesData),
        htmlContent,
        cssContent,
        JSON.stringify(availableMergeTags),
        isActive,
        Number(id),
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Template updated successfully',
      record: res.rows[0],
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete template
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

    const res = await queryDb(
      `DELETE FROM system_document_templates WHERE id = $1 RETURNING id, name, slug, category`,
      [Number(id)]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Template not found or already deleted' }, { status: 404 });
    }

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

// POST: Clone / Duplicate template
export async function POST(request, context) {
  try {
    const auth = await hasModulePermission(request, 'templates');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: 403 });
    }

    const params = await context.params;
    const id = params?.id;

    const sourceRes = await queryDb('SELECT * FROM system_document_templates WHERE id = $1 LIMIT 1', [Number(id)]);
    if (sourceRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Source template not found' }, { status: 404 });
    }
    const src = sourceRes.rows[0];

    const copyName = `${src.name} (Copy)`;
    const copySlug = `${src.slug}-copy-${Date.now().toString().slice(-4)}`;

    const res = await queryDb(
      `INSERT INTO system_document_templates 
       (name, slug, category, description, dimension_width, dimension_height, dimension_unit, orientation, grapes_data, html_content, css_content, available_merge_tags, is_active, is_system_default, created_by_developer_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE, FALSE, $13)
       RETURNING id, name, slug, category, dimension_width, dimension_height, dimension_unit, orientation, is_active`,
      [
        copyName,
        copySlug,
        src.category,
        src.description,
        src.dimension_width,
        src.dimension_height,
        src.dimension_unit,
        src.orientation,
        JSON.stringify(src.grapes_data || {}),
        src.html_content,
        src.css_content,
        JSON.stringify(src.available_merge_tags || []),
        auth.developer?.id || null,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Template duplicated successfully',
      record: res.rows[0],
    }, { status: 201 });
  } catch (error) {
    console.error('Error duplicating template:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
