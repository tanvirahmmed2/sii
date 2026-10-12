import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { getStaffSession } from 'src/lib/middleware/staff';

async function verifyStaffAccess(request, context) {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }
  const staffSession = await getStaffSession(request);

  if (!staffSession) {
    return { error: 'Unauthorized: Staff access required.', status: 401 };
  }

  const staffWebsiteId =
    staffSession?.website_id ||
    staffSession?.websiteId ||
    staffSession?.staff?.websiteId ||
    staffSession?.staff?.website_id;

  if (staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
  }

  return { website, staffSession };
}

// GET: Fetch master templates and current website active template for a category
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'student_id_card';

    // 1. Fetch available system templates in this category
    const sysRes = await queryDb(
      `SELECT id, name, slug, category, description,
              dimension_width, dimension_height, dimension_unit, orientation,
              html_content, css_content, available_merge_tags, is_system_default
       FROM system_document_templates
       WHERE category = $1 AND is_active = TRUE
       ORDER BY is_system_default DESC, id ASC`,
      [category]
    );

    // 2. Fetch the website's current active template for this category
    const webRes = await queryDb(
      `SELECT wt.id, wt.website_id, wt.system_template_id, wt.name, wt.category,
              wt.is_default, wt.custom_html, wt.custom_css, wt.custom_variables,
              st.html_content AS system_html, st.css_content AS system_css,
              st.dimension_width, st.dimension_height, st.dimension_unit, st.orientation,
              st.available_merge_tags
       FROM website_document_templates wt
       LEFT JOIN system_document_templates st ON wt.system_template_id = st.id
       WHERE wt.website_id = $1 AND wt.category = $2 AND wt.is_default = TRUE
       LIMIT 1`,
      [website.id, category]
    );

    let activeTemplate = null;
    if (webRes.rows.length > 0) {
      const row = webRes.rows[0];
      activeTemplate = {
        id: row.id,
        system_template_id: row.system_template_id,
        name: row.name,
        category: row.category,
        html_content: row.custom_html || row.system_html,
        css_content: row.custom_css || row.system_css,
        custom_variables: row.custom_variables || {},
        dimension_width: row.dimension_width || 86,
        dimension_height: row.dimension_height || 54,
        dimension_unit: row.dimension_unit || 'mm',
        orientation: row.orientation || 'landscape',
        available_merge_tags: row.available_merge_tags || [],
      };
    } else if (sysRes.rows.length > 0) {
      // Fallback to first system template as active default
      const defaultSys = sysRes.rows[0];
      activeTemplate = {
        system_template_id: defaultSys.id,
        name: defaultSys.name,
        category: defaultSys.category,
        html_content: defaultSys.html_content,
        css_content: defaultSys.css_content,
        custom_variables: {},
        dimension_width: defaultSys.dimension_width,
        dimension_height: defaultSys.dimension_height,
        dimension_unit: defaultSys.dimension_unit,
        orientation: defaultSys.orientation,
        available_merge_tags: defaultSys.available_merge_tags || [],
      };
    }

    return NextResponse.json({
      success: true,
      category,
      system_templates: sysRes.rows,
      active_template: activeTemplate,
    });
  } catch (error) {
    console.error('Error in staff templates GET:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Activate a system template for this school
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website, staffSession } = auth;
    const body = await request.json();
    const systemTemplateId = body.system_template_id;
    const category = body.category;

    if (!systemTemplateId) {
      return NextResponse.json({ success: false, error: 'System template ID is required.' }, { status: 400 });
    }

    const sysRes = await queryDb(
      `SELECT * FROM system_document_templates WHERE id = $1 LIMIT 1`,
      [Number(systemTemplateId)]
    );

    if (sysRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'System template not found.' }, { status: 404 });
    }

    const sysTpl = sysRes.rows[0];
    const cat = category || sysTpl.category;
    const staffId = staffSession?.staff_id || staffSession?.id || null;

    // Reset current default for this category
    await queryDb(
      `UPDATE website_document_templates SET is_default = FALSE WHERE website_id = $1 AND category = $2`,
      [website.id, cat]
    );

    // Upsert template selection
    const res = await queryDb(
      `INSERT INTO website_document_templates (website_id, system_template_id, name, category, is_active, is_default, created_by_staff_id)
       VALUES ($1, $2, $3, $4, TRUE, TRUE, $5)
       ON CONFLICT (website_id, category, name) 
       DO UPDATE SET system_template_id = EXCLUDED.system_template_id, is_default = TRUE, updated_at = CURRENT_TIMESTAMP
       RETURNING id, website_id, system_template_id, name, category, is_default`,
      [website.id, sysTpl.id, sysTpl.name, cat, staffId]
    );

    return NextResponse.json({
      success: true,
      message: `Template "${sysTpl.name}" activated as the school's default!`,
      active_template: res.rows[0],
    });
  } catch (error) {
    console.error('Error activating staff template:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Customize school variables or custom HTML/CSS
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json();
    const templateId = body.id;
    const customHtml = body.custom_html;
    const customCss = body.custom_css;
    const customVariables = body.custom_variables || {};

    if (!templateId) {
      return NextResponse.json({ success: false, error: 'Template record ID is required.' }, { status: 400 });
    }

    const res = await queryDb(
      `UPDATE website_document_templates
       SET custom_html = COALESCE($1, custom_html),
           custom_css = COALESCE($2, custom_css),
           custom_variables = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND website_id = $5
       RETURNING id, name, category, is_default, custom_variables`,
      [customHtml, customCss, JSON.stringify(customVariables), Number(templateId), website.id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Template not found for this institution.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Template customizations saved successfully.',
      record: res.rows[0],
    });
  } catch (error) {
    console.error('Error updating staff template:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
