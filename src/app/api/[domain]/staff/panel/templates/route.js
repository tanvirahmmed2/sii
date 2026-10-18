import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { getStaffSession } from 'src/lib/middleware/staff';
import { resolveTaskConfig, ALL_TASKS } from 'src/lib/templates/templateTables.js';

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

// GET: Fetch master templates and current website active template for a task category
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const categoryOrTask = searchParams.get('category') || searchParams.get('task') || 'student_id_card';
    const task = resolveTaskConfig(categoryOrTask) || ALL_TASKS[0];

    // 1. Fetch available system templates from task's dedicated table
    const sysRes = await queryDb(
      `SELECT id, name, slug, '${task.category}' AS category, description,
              dimension_width, dimension_height, dimension_unit,
              fabric_data, fabric_back_data, html_content, html_back_content, css_content, available_merge_tags, is_system_default
       FROM ${task.systemTable}
       WHERE is_active = TRUE
       ORDER BY is_system_default DESC, id ASC`
    );

    // 2. Fetch website's current active template from task's dedicated table
    const webRes = await queryDb(
      `SELECT wt.id, wt.website_id, wt.system_template_id, wt.name, '${task.category}' AS category,
              wt.is_default, wt.custom_fabric_data, wt.custom_fabric_back_data,
              wt.custom_html, wt.custom_html_back, wt.custom_css, wt.custom_variables,
              st.fabric_data AS system_fabric_data, st.fabric_back_data AS system_fabric_back_data,
              st.html_content AS system_html, st.html_back_content AS system_html_back, st.css_content AS system_css,
              st.dimension_width, st.dimension_height, st.dimension_unit,
              st.available_merge_tags
       FROM ${task.websiteTable} wt
       LEFT JOIN ${task.systemTable} st ON wt.system_template_id = st.id
       WHERE wt.website_id = $1 AND wt.is_default = TRUE
       LIMIT 1`,
      [website.id]
    );

    let activeTemplate = null;
    if (webRes.rows.length > 0) {
      const row = webRes.rows[0];
      activeTemplate = {
        id: row.id,
        system_template_id: row.system_template_id,
        name: row.name,
        category: row.category,
        fabric_data: row.custom_fabric_data || row.system_fabric_data,
        fabric_back_data: row.custom_fabric_back_data || row.system_fabric_back_data,
        html_content: row.custom_html || row.system_html,
        html_back_content: row.custom_html_back || row.system_html_back,
        css_content: row.custom_css || row.system_css,
        custom_variables: row.custom_variables || {},
        dimension_width: row.dimension_width || task.defaultWidth,
        dimension_height: row.dimension_height || task.defaultHeight,
        dimension_unit: row.dimension_unit || 'mm',
        available_merge_tags: row.available_merge_tags || [],
      };
    } else if (sysRes.rows.length > 0) {
      // Fallback to first system template in the dedicated table
      const defaultSys = sysRes.rows[0];
      activeTemplate = {
        system_template_id: defaultSys.id,
        name: defaultSys.name,
        category: defaultSys.category,
        fabric_data: defaultSys.fabric_data,
        fabric_back_data: defaultSys.fabric_back_data,
        html_content: defaultSys.html_content,
        html_back_content: defaultSys.html_back_content,
        css_content: defaultSys.css_content,
        custom_variables: {},
        dimension_width: defaultSys.dimension_width,
        dimension_height: defaultSys.dimension_height,
        dimension_unit: defaultSys.dimension_unit,
        available_merge_tags: defaultSys.available_merge_tags || [],
      };
    }

    let classAssignments = [];
    if (task.category === 'student_id_card') {
      try {
        const classRes = await queryDb(
          `SELECT c.id AS class_id, c.name AS class_name, c.numeric_value,
                  ct.system_template_id,
                  st.name AS system_template_name,
                  st.dimension_width, st.dimension_height, st.dimension_unit
           FROM website_classes c
           LEFT JOIN website_class_student_id_templates ct ON ct.class_id = c.id AND ct.website_id = c.website_id
           LEFT JOIN developer_student_id_templates st ON st.id = ct.system_template_id
           WHERE c.website_id = $1
           ORDER BY c.numeric_value ASC, c.name ASC`,
          [website.id]
        );
        classAssignments = classRes.rows;
      } catch (err) {
        console.warn('Error fetching class template assignments:', err);
      }
    }

    return NextResponse.json({
      success: true,
      category: task.category,
      task_key: task.key,
      system_templates: sysRes.rows,
      active_template: activeTemplate,
      class_assignments: classAssignments,
    });
  } catch (error) {
    console.error('Error in staff templates GET:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Activate a system template for this school or assign templates to specific classes
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website, staffSession } = auth;
    const body = await request.json();

    // 1. Bulk or single class-wise template assignments
    if (body.action === 'assign_classes' || Array.isArray(body.class_assignments)) {
      const assignments = body.class_assignments || body.assignments || [];
      for (const item of assignments) {
        const classId = item.class_id;
        const sysId = item.system_template_id;
        if (!classId) continue;

        if (sysId && String(sysId) !== 'default' && Number(sysId) > 0) {
          await queryDb(
            `INSERT INTO website_class_student_id_templates (website_id, class_id, system_template_id, updated_at)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
             ON CONFLICT (website_id, class_id)
             DO UPDATE SET system_template_id = EXCLUDED.system_template_id, updated_at = CURRENT_TIMESTAMP`,
            [website.id, classId, Number(sysId)]
          );
        } else {
          await queryDb(
            `DELETE FROM website_class_student_id_templates WHERE website_id = $1 AND class_id = $2`,
            [website.id, classId]
          );
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Class-specific student ID card templates updated successfully!',
      });
    }

    if (body.action === 'assign_class' && body.class_id) {
      const classId = body.class_id;
      const sysId = body.system_template_id;
      if (sysId && String(sysId) !== 'default' && Number(sysId) > 0) {
        await queryDb(
          `INSERT INTO website_class_student_id_templates (website_id, class_id, system_template_id, updated_at)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
           ON CONFLICT (website_id, class_id)
           DO UPDATE SET system_template_id = EXCLUDED.system_template_id, updated_at = CURRENT_TIMESTAMP`,
          [website.id, classId, Number(sysId)]
        );
      } else {
        await queryDb(
          `DELETE FROM website_class_student_id_templates WHERE website_id = $1 AND class_id = $2`,
          [website.id, classId]
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Class template assignment updated successfully!',
      });
    }

    const systemTemplateId = body.system_template_id;
    const categoryOrTask = body.category || body.task || 'student_id_card';
    const task = resolveTaskConfig(categoryOrTask) || ALL_TASKS[0];

    if (!systemTemplateId) {
      return NextResponse.json({ success: false, error: 'System template ID is required.' }, { status: 400 });
    }

    const sysRes = await queryDb(
      `SELECT * FROM ${task.systemTable} WHERE id = $1 LIMIT 1`,
      [Number(systemTemplateId)]
    );

    if (sysRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: `System template not found in ${task.systemTable}.` }, { status: 404 });
    }

    const sysTpl = sysRes.rows[0];
    const staffId = staffSession?.staff_id || staffSession?.id || null;

    // Reset current default in this dedicated table
    await queryDb(
      `UPDATE ${task.websiteTable} SET is_default = FALSE WHERE website_id = $1`,
      [website.id]
    );

    // Upsert template selection in this dedicated table
    const res = await queryDb(
      `INSERT INTO ${task.websiteTable} (website_id, system_template_id, name, is_active, is_default, created_by_staff_id)
       VALUES ($1, $2, $3, TRUE, TRUE, $4)
       ON CONFLICT (website_id, name) 
       DO UPDATE SET system_template_id = EXCLUDED.system_template_id, is_default = TRUE, updated_at = CURRENT_TIMESTAMP
       RETURNING id, website_id, system_template_id, name, is_default`,
      [website.id, sysTpl.id, sysTpl.name, staffId]
    );

    return NextResponse.json({
      success: true,
      message: `Template "${sysTpl.name}" activated as the school's default ${task.title}!`,
      active_template: res.rows[0],
    });
  } catch (error) {
    console.error('Error activating staff template:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Customize school variables or custom Fabric/HTML/CSS in its dedicated task table
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json();
    const templateId = body.id;
    const categoryOrTask = body.category || body.task;
    const task = resolveTaskConfig(categoryOrTask) || ALL_TASKS[0];
    const customHtml = body.custom_html;
    const customHtmlBack = body.custom_html_back;
    const customCss = body.custom_css;
    const customFabricData = body.custom_fabric_data;
    const customFabricBackData = body.custom_fabric_back_data;
    const customVariables = body.custom_variables || {};

    if (!templateId) {
      return NextResponse.json({ success: false, error: 'Template record ID is required.' }, { status: 400 });
    }

    const res = await queryDb(
      `UPDATE ${task.websiteTable}
       SET custom_html = COALESCE($1, custom_html),
           custom_html_back = COALESCE($2, custom_html_back),
           custom_css = COALESCE($3, custom_css),
           custom_fabric_data = COALESCE($4, custom_fabric_data),
           custom_fabric_back_data = COALESCE($5, custom_fabric_back_data),
           custom_variables = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND website_id = $8
       RETURNING id, name, is_default, custom_variables`,
      [
        customHtml,
        customHtmlBack,
        customCss,
        customFabricData ? JSON.stringify(customFabricData) : null,
        customFabricBackData ? JSON.stringify(customFabricBackData) : null,
        JSON.stringify(customVariables),
        Number(templateId),
        website.id
      ]
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
