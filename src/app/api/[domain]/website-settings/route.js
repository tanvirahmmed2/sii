import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { SCHOOL_NAME, LOGO_URL, META_TITLE, META_DESCRIPTION } from 'src/lib/database/secret';

// GET Public Website Settings for Tenant directly from websites table
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Educational institution portal not found.' }, { status: 404 });
    }

    const schoolName = website.name || SCHOOL_NAME;
    const logoUrl = website.logo || LOGO_URL;
    const faviconUrl = website.favicon || null;
    const metaTitle = `${schoolName} - Academic Excellence & Growth`;
    const metaDescription = `Official portal for ${schoolName}.`;

    const payloadSettings = {
      id: website.id,
      website_id: website.id,
      school_name: schoolName,
      name: schoolName,
      logo_url: logoUrl,
      logo: logoUrl,
      logo_id: website.logo_id || null,
      favicon: faviconUrl,
      favicon_id: website.favicon_id || null,
      meta_title: metaTitle,
      meta_description: metaDescription,
      contact_phone: website.contact_phone || '',
      contact_email: website.contact_email || '',
      address: website.address || '',
      map_url: '',
      motto: `Excellence in ${website.institution_type || 'Education'}`,
      mission: '',
      vision: '',
      history: '',
      facebook_url: website.facebook_url || '',
      twitter_url: website.twitter_url || '',
      instagram_url: website.instagram_url || '',
      youtube_url: website.youtube_url || '',
      linkedin_url: website.linkedin_url || '',
      primary_color: website.primary_color || '#1e40af',
      secondary_color: website.secondary_color || '#0ea5e9',
      theme: website.theme || 'default',
      institution_type: website.institution_type || 'School',
      eiin_number: website.eiin_number || '',
      is_maintenance_mode: Boolean(website.is_maintenance_mode),
      status: website.status || 'active',
      subdomain: website.subdomain || '',
      custom_domain: website.custom_domain || '',
      created_at: website.created_at,
      updated_at: website.updated_at,
    };

    return NextResponse.json({
      success: true,
      paylod: {
        settings: payloadSettings,
      },
      payload: {
        settings: payloadSettings,
      },
      settings: payloadSettings,
      website: website,
    });
  } catch (error) {
    console.error('Error fetching website settings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT / POST update tenant website settings directly on websites table
export async function PUT(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const websiteId = website.id;

    const res = await queryDb(
      `UPDATE websites
       SET name = COALESCE($1, name),
           contact_phone = COALESCE($2, contact_phone),
           contact_email = COALESCE($3, contact_email),
           address = COALESCE($4, address),
           theme = COALESCE($5, theme),
           primary_color = COALESCE($6, primary_color),
           secondary_color = COALESCE($7, secondary_color),
           institution_type = COALESCE($8, institution_type),
           eiin_number = COALESCE($9, eiin_number),
           logo = COALESCE($10, logo),
           logo_id = COALESCE($11, logo_id),
           favicon = COALESCE($12, favicon),
           favicon_id = COALESCE($13, favicon_id),
           facebook_url = COALESCE($14, facebook_url),
           twitter_url = COALESCE($15, twitter_url),
           instagram_url = COALESCE($16, instagram_url),
           youtube_url = COALESCE($17, youtube_url),
           linkedin_url = COALESCE($18, linkedin_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $19
       RETURNING *`,
      [
        body.school_name || body.name || null,
        body.contact_phone || null,
        body.contact_email || null,
        body.address || null,
        body.theme || null,
        body.primary_color || null,
        body.secondary_color || null,
        body.institution_type || null,
        body.eiin_number || null,
        body.logo || body.logo_url || null,
        body.logo_id || null,
        body.favicon || null,
        body.favicon_id || null,
        body.facebook_url !== undefined ? String(body.facebook_url).trim() : null,
        body.twitter_url !== undefined ? String(body.twitter_url).trim() : null,
        body.instagram_url !== undefined ? String(body.instagram_url).trim() : null,
        body.youtube_url !== undefined ? String(body.youtube_url).trim() : null,
        body.linkedin_url !== undefined ? String(body.linkedin_url).trim() : null,
        websiteId,
      ]
    );

    const updated = res.rows[0];
    const payloadSettings = {
      ...updated,
      school_name: updated.name,
      logo_url: updated.logo,
      meta_title: `${updated.name} - Academic Excellence & Growth`,
      meta_description: `Official portal for ${updated.name}.`,
    };

    return NextResponse.json({
      success: true,
      message: 'Website settings updated successfully',
      settings: payloadSettings,
      website: updated,
      payload: { settings: payloadSettings },
      paylod: { settings: payloadSettings },
    });
  } catch (error) {
    console.error('Error updating website settings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const POST = PUT;
