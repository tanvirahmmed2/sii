import { NextResponse } from 'next/server';
import { query, queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { SCHOOL_NAME, LOGO_URL, META_TITLE, META_DESCRIPTION } from 'src/lib/database/secret';

// GET Public Website Settings for Tenant
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    const websiteId = website?.id;

    let s = null;
    if (websiteId) {
      const res = await queryDb('SELECT * FROM website_settings WHERE website_id = $1 LIMIT 1', [websiteId]);
      if (res.rows.length > 0) {
        s = res.rows[0];
      }
    }

    const schoolName = website?.name || s?.school_name || SCHOOL_NAME;
    const logoUrl = website?.logo || s?.logo_url || LOGO_URL;
    const metaTitle = s?.meta_title || `${schoolName} - Academic Excellence & Growth`;
    const metaDescription = s?.meta_description || website?.institution_type ? `Official portal for ${schoolName}.` : META_DESCRIPTION;

    const payloadSettings = {
      ...(s || {}),
      school_name: schoolName,
      logo_url: logoUrl,
      meta_title: metaTitle,
      meta_description: metaDescription,
      contact_phone: s?.contact_phone || website?.contact_phone || '',
      contact_email: s?.contact_email || website?.contact_email || '',
      address: s?.address || website?.address || '',
      map_url: s?.map_url || '',
      motto: s?.motto || `Excellence in ${website?.institution_type || 'Education'}`,
      mission: s?.mission || '',
      vision: s?.vision || '',
      history: s?.history || '',
      facebook_url: s?.facebook_url || '',
      twitter_url: s?.twitter_url || '',
      instagram_url: s?.instagram_url || '',
      youtube_url: s?.youtube_url || '',
      primary_color: website?.primary_color || '#1e40af',
      secondary_color: website?.secondary_color || '#0ea5e9',
      theme: website?.theme || 'default',
    };

    return NextResponse.json({
      success: true,
      paylod: {
        settings: payloadSettings,
      },
      payload: {
        settings: payloadSettings,
      },
    });
  } catch (error) {
    console.error('Error fetching website settings:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT / POST update tenant website settings
export async function PUT(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
    }

    const body = await request.json();
    const websiteId = website.id;

    const res = await queryDb(
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
        websiteId,
        body.contact_phone || null,
        body.contact_email || null,
        body.address || null,
        body.map_url || null,
        body.motto || body.tagline || null,
        body.mission || null,
        body.vision || null,
        body.history || null,
        body.facebook_url || null,
        body.twitter_url || null,
        body.instagram_url || null,
        body.youtube_url || null,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Website settings updated successfully',
      settings: res.rows[0],
    });
  } catch (error) {
    console.error('Error updating website settings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
