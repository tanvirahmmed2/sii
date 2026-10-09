import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { getStaffSession } from 'src/lib/middleware/staff';
import { isAdmin } from 'src/lib/middleware/developer';

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
    const devAdmin = await isAdmin();

    if (!staffSession && !devAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Staff authentication required to view website settings.' },
        { status: 401 }
      );
    }

    // Load website settings row if table exists
    let s = {};
    try {
      const setRes = await queryDb(
        `SELECT * FROM website_settings WHERE website_id = $1 LIMIT 1`,
        [website.id]
      );
      if (setRes.rows.length > 0) {
        s = setRes.rows[0];
      }
    } catch {
      // website_settings table may be created later as needed
      s = {};
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
      // Settings table fields
      contact_phone: s.contact_phone || website.contact_phone || '',
      contact_email: s.contact_email || website.contact_email || '',
      address: s.address || website.address || '',
      map_url: s.map_url || '',
      motto: s.motto || '',
      mission: s.mission || '',
      vision: s.vision || '',
      history: s.history || '',
      facebook_url: s.facebook_url || '',
      twitter_url: s.twitter_url || '',
      instagram_url: s.instagram_url || '',
      youtube_url: s.youtube_url || '',
      updated_at: s.updated_at || website.updated_at,
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
    const devAdmin = await isAdmin();

    if (!staffSession && !devAdmin) {
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

    // 2. Upsert into website_settings table if it exists
    let updatedSettings = {};
    try {
      const setRes = await queryDb(
        `INSERT INTO website_settings (
           website_id, contact_phone, contact_email, address, map_url, motto,
           mission, vision, history, facebook_url, twitter_url, instagram_url, youtube_url
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (website_id) DO UPDATE SET
           contact_phone = COALESCE(EXCLUDED.contact_phone, website_settings.contact_phone),
           contact_email = COALESCE(EXCLUDED.contact_email, website_settings.contact_email),
           address = COALESCE(EXCLUDED.address, website_settings.address),
           map_url = COALESCE(EXCLUDED.map_url, website_settings.map_url),
           motto = COALESCE(EXCLUDED.motto, website_settings.motto),
           mission = COALESCE(EXCLUDED.mission, website_settings.mission),
           vision = COALESCE(EXCLUDED.vision, website_settings.vision),
           history = COALESCE(EXCLUDED.history, website_settings.history),
           facebook_url = COALESCE(EXCLUDED.facebook_url, website_settings.facebook_url),
           twitter_url = COALESCE(EXCLUDED.twitter_url, website_settings.twitter_url),
           instagram_url = COALESCE(EXCLUDED.instagram_url, website_settings.instagram_url),
           youtube_url = COALESCE(EXCLUDED.youtube_url, website_settings.youtube_url),
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [
          website.id,
          data.contact_phone !== undefined ? String(data.contact_phone).trim() : null,
          data.contact_email !== undefined ? String(data.contact_email).trim() : null,
          data.address !== undefined ? String(data.address).trim() : null,
          data.map_url !== undefined ? String(data.map_url).trim() : null,
          data.motto !== undefined || data.tagline !== undefined 
            ? String(data.motto ?? data.tagline ?? '').trim() 
            : null,
          data.mission !== undefined ? String(data.mission).trim() : null,
          data.vision !== undefined ? String(data.vision).trim() : null,
          data.history !== undefined ? String(data.history).trim() : null,
          data.facebook_url !== undefined ? String(data.facebook_url).trim() : null,
          data.twitter_url !== undefined ? String(data.twitter_url).trim() : null,
          data.instagram_url !== undefined ? String(data.instagram_url).trim() : null,
          data.youtube_url !== undefined ? String(data.youtube_url).trim() : null,
        ]
      );
      if (setRes.rows && setRes.rows.length > 0) {
        updatedSettings = setRes.rows[0];
      }
    } catch {
      // website_settings table will be created later as needed
      updatedSettings = {};
    }

    const merged = {
      ...updatedSettings,
      name: updatedWebsite.name,
      institution_type: updatedWebsite.institution_type,
      eiin_number: updatedWebsite.eiin_number,
      logo: updatedWebsite.logo,
      favicon: updatedWebsite.favicon,
      theme: updatedWebsite.theme,
      primary_color: updatedWebsite.primary_color,
      secondary_color: updatedWebsite.secondary_color,
      is_maintenance_mode: Boolean(updatedWebsite.is_maintenance_mode),
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
