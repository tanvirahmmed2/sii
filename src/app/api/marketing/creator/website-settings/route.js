import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { getCreatorSession } from 'src/lib/middleware/creator';

/**
 * API Route: /api/creator/website-settings
 * Dedicated to the `website_settings` table.
 */

export async function GET(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const { searchParams } = new URL(request.url);
    const websiteIdParam = searchParams.get('websiteId') || searchParams.get('id');

    if (!websiteIdParam) {
      return NextResponse.json({ success: false, error: 'websiteId query parameter is required' }, { status: 400 });
    }

    const websiteId = Number(websiteIdParam);

    // Verify creator ownership
    if (sessionCreator) {
      const ownerCheck = await queryDb('SELECT id FROM websites WHERE id = $1 AND creator_id = $2 LIMIT 1', [websiteId, sessionCreator.id]);
      if (ownerCheck.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Unauthorized: Website not owned by creator' }, { status: 403 });
      }
    }

    const res = await queryDb(
      `SELECT ws.*, 
              w.name AS website_name, 
              w.name AS site_title,
              COALESCE(ws.motto, 'Modern Educational Hub') AS tagline,
              w.subdomain, 
              w.custom_domain, 
              w.primary_color,
              w.secondary_color,
              w.theme,
              (CASE WHEN w.status = 'active' AND w.is_maintenance_mode = false THEN true ELSE false END) AS is_published
       FROM websites w
       LEFT JOIN website_settings ws ON ws.website_id = w.id
       WHERE w.id = $1
       LIMIT 1`,
      [websiteId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, settings: res.rows[0] });
  } catch (error) {
    console.error('Website Settings GET API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const sessionCreator = await getCreatorSession(request);
    const body = await request.json();
    const websiteId = Number(body.websiteId || body.website_id || body.id);

    if (!websiteId) {
      return NextResponse.json({ success: false, error: 'websiteId is required' }, { status: 400 });
    }

    // Verify ownership
    if (sessionCreator) {
      const ownerCheck = await queryDb('SELECT id FROM websites WHERE id = $1 AND creator_id = $2 LIMIT 1', [websiteId, sessionCreator.id]);
      if (ownerCheck.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Unauthorized: Website not owned by creator' }, { status: 403 });
      }
    }

    // 1. Update websites table attributes if provided
    const websiteUpdates = [];
    const websiteValues = [];
    let wIdx = 1;

    if (body.site_title || body.name || body.website_name) {
      websiteUpdates.push(`name = $${wIdx++}`);
      websiteValues.push((body.site_title || body.name || body.website_name).trim());
    }
    if (body.primary_color) {
      websiteUpdates.push(`primary_color = $${wIdx++}`);
      websiteValues.push(body.primary_color);
    }
    if (body.secondary_color) {
      websiteUpdates.push(`secondary_color = $${wIdx++}`);
      websiteValues.push(body.secondary_color);
    }
    if (body.theme) {
      websiteUpdates.push(`theme = $${wIdx++}`);
      websiteValues.push(body.theme);
    }
    if (body.is_published !== undefined) {
      websiteUpdates.push(`status = $${wIdx++}`);
      websiteValues.push(body.is_published ? 'active' : 'suspended');
    }

    if (websiteUpdates.length > 0) {
      websiteValues.push(websiteId);
      await queryDb(
        `UPDATE websites SET ${websiteUpdates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${wIdx}`,
        websiteValues
      ).catch((err) => console.warn('Websites update notice:', err.message));
    }

    // 2. Update website_settings table attributes
    const contactPhone = body.contact_phone !== undefined ? body.contact_phone : body.contactPhone;
    const contactEmail = body.contact_email !== undefined ? body.contact_email : body.contactEmail;
    const address = body.address;
    const motto = body.motto || body.tagline;
    const mission = body.mission;
    const vision = body.vision;
    const history = body.history;
    const mapUrl = body.map_url || body.mapUrl;
    const facebookUrl = body.facebook_url || body.facebookUrl;
    const twitterUrl = body.twitter_url || body.twitterUrl;
    const instagramUrl = body.instagram_url || body.instagramUrl;
    const youtubeUrl = body.youtube_url || body.youtubeUrl;

    const res = await queryDb(
      `INSERT INTO website_settings (
        website_id, contact_phone, contact_email, address, motto, mission, vision, history, map_url, facebook_url, twitter_url, instagram_url, youtube_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (website_id) DO UPDATE SET
        contact_phone = COALESCE(EXCLUDED.contact_phone, website_settings.contact_phone),
        contact_email = COALESCE(EXCLUDED.contact_email, website_settings.contact_email),
        address = COALESCE(EXCLUDED.address, website_settings.address),
        motto = COALESCE(EXCLUDED.motto, website_settings.motto),
        mission = COALESCE(EXCLUDED.mission, website_settings.mission),
        vision = COALESCE(EXCLUDED.vision, website_settings.vision),
        history = COALESCE(EXCLUDED.history, website_settings.history),
        map_url = COALESCE(EXCLUDED.map_url, website_settings.map_url),
        facebook_url = COALESCE(EXCLUDED.facebook_url, website_settings.facebook_url),
        twitter_url = COALESCE(EXCLUDED.twitter_url, website_settings.twitter_url),
        instagram_url = COALESCE(EXCLUDED.instagram_url, website_settings.instagram_url),
        youtube_url = COALESCE(EXCLUDED.youtube_url, website_settings.youtube_url),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        websiteId,
        contactPhone || null,
        contactEmail || null,
        address || null,
        motto || null,
        mission || null,
        vision || null,
        history || null,
        mapUrl || null,
        facebookUrl || null,
        twitterUrl || null,
        instagramUrl || null,
        youtubeUrl || null,
      ]
    );

    return NextResponse.json({
      success: true,
      settings: res.rows[0],
      message: 'Website settings updated successfully',
    });
  } catch (error) {
    console.error('Website Settings POST API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
