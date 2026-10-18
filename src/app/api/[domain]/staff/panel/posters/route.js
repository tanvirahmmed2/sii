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

// GET /api/[domain]/staff/panel/posters
// Returns all posters created by staff for their school website
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;

    // Fetch existing posters for this website
    const res = await queryDb(
      `SELECT id, website_id, system_template_id, name, description,
              dimension_width, dimension_height, dimension_unit,
              custom_fabric_data, custom_html,
              is_default, is_active, created_at, updated_at
       FROM website_poster_templates
       WHERE website_id = $1
       ORDER BY updated_at DESC, id DESC`,
      [website.id]
    );

    // If no posters exist yet for this school, seed a default starter poster automatically
    if (res.rows.length === 0) {
      const starterJSON = generateStarterFabricJSON('poster');
      const defaultName = `${website.name || 'Campus'} Admissions & Event Poster`;
      
      const insertRes = await queryDb(
        `INSERT INTO website_poster_templates (
          website_id, name, description, dimension_width, dimension_height,
          dimension_unit, custom_fabric_data, is_default, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, TRUE)
        RETURNING id, website_id, name, description, dimension_width, dimension_height,
                  dimension_unit, custom_fabric_data, custom_html,
                  is_default, is_active, created_at, updated_at`,
        [
          website.id,
          defaultName,
          `Official promotional poster for ${website.name || 'our institution'}.`,
          1080.00,
          1080.00,
          'px',
          JSON.stringify(starterJSON),
        ]
      );
      return NextResponse.json({
        success: true,
        posters: insertRes.rows,
        website: { id: website.id, name: website.name },
      });
    }

    return NextResponse.json({
      success: true,
      posters: res.rows,
      website: { id: website.id, name: website.name },
    });
  } catch (error) {
    console.error('Error fetching staff posters:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/[domain]/staff/panel/posters
// Creates a new poster for the school website
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website, staffSession } = auth;
    const staffId = staffSession?.staff_id || staffSession?.id || null;
    const body = await request.json();

    const name = (body.name || '').trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Poster title is required.' }, { status: 400 });
    }

    const description = body.description || '';
    const dimWidth = parseFloat(body.dimension_width) || 1080;
    const dimHeight = parseFloat(body.dimension_height) || 1080;
    const dimUnit = body.dimension_unit || 'px';
    const fabricData = body.fabric_data || body.custom_fabric_data || generateStarterFabricJSON('poster');
    const htmlContent = body.html_content || body.custom_html || '';
    const isDefault = Boolean(body.is_default);

    if (isDefault) {
      await queryDb(
        `UPDATE website_poster_templates SET is_default = FALSE WHERE website_id = $1`,
        [website.id]
      );
    }

    const res = await queryDb(
      `INSERT INTO website_poster_templates (
        website_id, name, description, dimension_width, dimension_height,
        dimension_unit, custom_fabric_data, custom_html,
        is_default, is_active, created_by_staff_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10)
      RETURNING id, website_id, name, description, dimension_width, dimension_height,
                dimension_unit, custom_fabric_data, custom_html,
                is_default, is_active, created_at, updated_at`,
      [
        website.id,
        name,
        description,
        dimWidth,
        dimHeight,
        dimUnit,
        JSON.stringify(fabricData),
        htmlContent,
        isDefault,
        staffId,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Poster created successfully!',
      poster: res.rows[0],
    });
  } catch (error) {
    console.error('Error creating staff poster:', error);
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'A poster with this name already exists for your institution.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
