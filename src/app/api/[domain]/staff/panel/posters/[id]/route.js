import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { getStaffSession } from 'src/lib/middleware/staff';
import { generateStarterFabricJSON } from 'src/lib/templates/fabricTemplates.js';

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

// GET /api/[domain]/staff/panel/posters/[id]
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { id } = await context.params;

    if (id === 'new') {
      const starterJSON = generateStarterFabricJSON('poster');
      return NextResponse.json({
        success: true,
        poster: {
          id: 'new',
          name: `${website.name || 'Campus'} Event Poster`,
          description: `Custom visual poster for ${website.name || 'our institution'}.`,
          dimension_width: 1080.00,
          dimension_height: 1080.00,
          dimension_unit: 'px',
          custom_fabric_data: starterJSON,
          fabric_data: starterJSON,
          website_id: website.id,
        },
        website: { id: website.id, name: website.name },
      });
    }

    const res = await queryDb(
      `SELECT id, website_id, system_template_id, name, description,
              dimension_width, dimension_height, dimension_unit,
              custom_fabric_data, custom_fabric_data AS fabric_data,
              custom_html, custom_html AS html_content,
              is_default, is_active, created_at, updated_at
       FROM website_poster_templates
       WHERE id = $1 AND website_id = $2
       LIMIT 1`,
      [Number(id), website.id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Poster not found for this institution.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      poster: res.rows[0],
      website: { id: website.id, name: website.name },
    });
  } catch (error) {
    console.error('Error fetching poster by ID:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT /api/[domain]/staff/panel/posters/[id]
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { id } = await context.params;
    const body = await request.json();

    const name = (body.name || '').trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Poster title is required.' }, { status: 400 });
    }

    const description = body.description || '';
    const dimWidth = parseFloat(body.dimension_width) || 1080;
    const dimHeight = parseFloat(body.dimension_height) || 1080;
    const dimUnit = body.dimension_unit || 'px';
    const fabricData = body.fabric_data || body.custom_fabric_data;
    const htmlContent = body.html_content || body.custom_html || '';
    const isDefault = Boolean(body.is_default);

    if (isDefault) {
      await queryDb(
        `UPDATE website_poster_templates SET is_default = FALSE WHERE website_id = $1 AND id != $2`,
        [website.id, Number(id)]
      );
    }

    const res = await queryDb(
      `UPDATE website_poster_templates
       SET name = $1,
           description = $2,
           dimension_width = $3,
           dimension_height = $4,
           dimension_unit = $5,
           custom_fabric_data = COALESCE($6, custom_fabric_data),
           custom_html = COALESCE($7, custom_html),
           is_default = $8,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND website_id = $10
       RETURNING id, website_id, name, description, dimension_width, dimension_height,
                 dimension_unit, custom_fabric_data, custom_html,
                 is_default, is_active, created_at, updated_at`,
      [
        name,
        description,
        dimWidth,
        dimHeight,
        dimUnit,
        fabricData ? JSON.stringify(fabricData) : null,
        htmlContent,
        isDefault,
        Number(id),
        website.id,
      ]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Poster not found or unauthorized.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Poster updated successfully!',
      poster: res.rows[0],
    });
  } catch (error) {
    console.error('Error updating staff poster:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/[domain]/staff/panel/posters/[id]
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { id } = await context.params;

    const res = await queryDb(
      `DELETE FROM website_poster_templates WHERE id = $1 AND website_id = $2 RETURNING id, name`,
      [Number(id), website.id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Poster not found or unauthorized.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Poster "${res.rows[0].name}" deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting staff poster:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
