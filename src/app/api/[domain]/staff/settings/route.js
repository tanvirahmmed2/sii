import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { getStaffSession } from 'src/lib/middleware/staff';

// GET: Fetch all website configuration and metadata for staff workstation
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const staffSession = await getStaffSession(request);

    if (!staffSession) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Staff authentication required to view website settings.' },
        { status: 401 }
      );
    }

    const mergedSettings = {
      id: website.id,
      name: website.name || '',
      institution_type: website.institution_type || 'School',
      eiin_number: website.eiin_number || '',
      logo: website.logo || '',
      favicon: website.favicon || '',
      theme: website.theme || 'default',
      primary_color: website.primary_color || '#1e40af',
      secondary_color: website.secondary_color || '#0ea5e9',
      is_maintenance_mode: Boolean(website.is_maintenance_mode),
      status: website.status || 'active',
      subdomain: website.subdomain || '',
      custom_domain: website.custom_domain || '',
      contact_phone: website.contact_phone || '',
      contact_email: website.contact_email || '',
      address: website.address || '',
      map_url: '',
      motto: `Excellence in ${website.institution_type || 'Education'}`,
      mission: '',
      vision: '',
      history: '',
      facebook_url: '',
      twitter_url: '',
      instagram_url: '',
      youtube_url: '',
      updated_at: website.updated_at,
    };

    return NextResponse.json({
      success: true,
      settings: mergedSettings,
      payload: { settings: mergedSettings },
      paylod: { settings: mergedSettings },
    });
  } catch (error) {
    console.error('Error fetching website settings in staff API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error fetching website settings.' },
      { status: 500 }
    );
  }
}

// PUT: Update all website information and institutional settings
export async function PUT(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const staffSession = await getStaffSession(request);

    if (!staffSession) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Staff authentication required to update website settings.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const data = body.data || body;

    // 1. Update websites table
    const webRes = await queryDb(
      `UPDATE websites
       SET name = COALESCE($1, name),
           institution_type = COALESCE($2, institution_type),
           eiin_number = COALESCE($3, eiin_number),
           logo = COALESCE($4, logo),
           favicon = COALESCE($5, favicon),
           theme = COALESCE($6, theme),
           primary_color = COALESCE($7, primary_color),
           secondary_color = COALESCE($8, secondary_color),
           contact_email = COALESCE($9, contact_email),
           contact_phone = COALESCE($10, contact_phone),
           address = COALESCE($11, address),
           is_maintenance_mode = COALESCE($12, is_maintenance_mode),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $13
       RETURNING *`,
      [
        data.name !== undefined ? String(data.name).trim() : null,
        data.institution_type !== undefined ? String(data.institution_type).trim() : null,
        data.eiin_number !== undefined ? String(data.eiin_number).trim() : null,
        data.logo !== undefined ? String(data.logo).trim() : null,
        data.favicon !== undefined ? String(data.favicon).trim() : null,
        data.theme !== undefined ? String(data.theme).trim() : null,
        data.primary_color !== undefined ? String(data.primary_color).trim() : null,
        data.secondary_color !== undefined ? String(data.secondary_color).trim() : null,
        data.contact_email !== undefined ? String(data.contact_email).trim() : null,
        data.contact_phone !== undefined ? String(data.contact_phone).trim() : null,
        data.address !== undefined ? String(data.address).trim() : null,
        data.is_maintenance_mode !== undefined ? Boolean(data.is_maintenance_mode) : null,
        website.id,
      ]
    );

    const updatedWebsite = webRes.rows[0];

    const merged = {
      ...updatedWebsite,
      school_name: updatedWebsite.name,
      logo_url: updatedWebsite.logo,
      meta_title: `${updatedWebsite.name} - Academic Excellence & Growth`,
      meta_description: `Official portal for ${updatedWebsite.name}.`,
    };

    return NextResponse.json({
      success: true,
      message: 'Website all information updated successfully.',
      settings: merged,
      payload: { settings: merged },
      paylod: { settings: merged },
    });
  } catch (error) {
    console.error('Error updating website settings via staff route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error updating website settings.' },
      { status: 500 }
    );
  }
}
