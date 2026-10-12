import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { hasModulePermission } from 'src/lib/middleware/developer.js';
import { seedSystemTemplates } from 'src/lib/templates/seedTemplates.js';

function generateSlug(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// GET: List all system document templates with category & search filters
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search')?.trim();
    const id = searchParams.get('id');

    if (id) {
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
    }

    const conditions = [];
    const params = [];

    if (category && category !== 'all') {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const res = await queryDb(
      `SELECT id, name, slug, category, description,
              dimension_width, dimension_height, dimension_unit, orientation,
              thumbnail_url, available_merge_tags, is_active, is_system_default,
              created_at, updated_at
       FROM system_document_templates
       ${whereClause}
       ORDER BY category ASC, id ASC`,
      params
    );

    // Also get counts by category
    const countRes = await queryDb(
      `SELECT category, COUNT(*)::int AS count
       FROM system_document_templates
       GROUP BY category`
    );

    const counts = {};
    for (const row of countRes.rows) {
      counts[row.category] = row.count;
    }

    return NextResponse.json({
      success: true,
      records: res.rows,
      counts,
      total: res.rows.length,
    });
  } catch (error) {
    console.error('Error fetching system templates:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create a new system document template OR trigger seed
export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'templates');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message }, { status: 403 });
    }

    const body = await request.json();
    const action = body.action;

    // Handle seeding action
    if (action === 'seed') {
      const seeded = await seedSystemTemplates(auth.developer?.id || 1);
      return NextResponse.json({
        success: true,
        message: 'Default templates seeded successfully',
        seeded,
      });
    }

    // Handle regular create template
    const name = (body.name || '').trim();
    const category = (body.category || '').trim();

    if (!name) {
      return NextResponse.json({ success: false, error: 'Template name is required' }, { status: 400 });
    }

    const validCategories = [
      'student_id_card',
      'teacher_id_card',
      'tc',
      'testimonial',
      'certificate',
      'payment_receipt',
      'poster',
    ];

    if (!validCategories.includes(category)) {
      return NextResponse.json({ success: false, error: `Invalid category: ${category}` }, { status: 400 });
    }

    let slug = generateSlug(body.slug || name);
    if (!slug) slug = `tpl-${Date.now()}`;

    // Ensure uniqueness
    const slugCheck = await queryDb('SELECT id FROM system_document_templates WHERE slug = $1 LIMIT 1', [slug]);
    if (slugCheck.rows.length > 0) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const description = body.description || '';
    const dimensionWidth = Number(body.dimension_width || (category.includes('id_card') ? 86 : 210));
    const dimensionHeight = Number(body.dimension_height || (category.includes('id_card') ? 54 : 297));
    const dimensionUnit = body.dimension_unit || (category === 'poster' ? 'px' : 'mm');
    const orientation = body.orientation || 'landscape';
    const grapesData = body.grapes_data || {};
    const htmlContent = body.html_content || '<div style="padding: 20px;">Template Canvas</div>';
    const cssContent = body.css_content || '';
    const availableMergeTags = body.available_merge_tags || [];
    const devId = auth.developer?.id || null;

    const res = await queryDb(
      `INSERT INTO system_document_templates 
       (name, slug, category, description, dimension_width, dimension_height, dimension_unit, orientation, grapes_data, html_content, css_content, available_merge_tags, is_active, created_by_developer_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE, $13)
       RETURNING id, name, slug, category, dimension_width, dimension_height, dimension_unit, orientation, is_active`,
      [
        name,
        slug,
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
        devId,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Template created successfully',
      record: res.rows[0],
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
