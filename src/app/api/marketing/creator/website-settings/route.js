import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { getCreatorSession } from 'src/lib/middleware/creator';

/**
 * API Route: /api/marketing/creator/website-settings
 * Directly queries and updates the `websites` table from schema.psql.
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
      `SELECT w.*, 
              w.id AS website_id,
              w.name AS website_name, 
              w.name AS site_title,
              ('Excellence in ' || COALESCE(w.institution_type, 'Education')) AS tagline,
              ('Excellence in ' || COALESCE(w.institution_type, 'Education')) AS motto,
              '' AS mission,
              '' AS vision,
              '' AS history,
              '' AS map_url,
              '' AS facebook_url,
              '' AS twitter_url,
              '' AS instagram_url,
              '' AS youtube_url,
              (CASE WHEN w.status = 'active' AND w.is_maintenance_mode = false THEN true ELSE false END) AS is_published
       FROM websites w
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

    // Update websites table attributes
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
    const contactPhone = body.contact_phone !== undefined ? body.contact_phone : body.contactPhone;
    if (contactPhone !== undefined) {
      websiteUpdates.push(`contact_phone = $${wIdx++}`);
      websiteValues.push(contactPhone || null);
    }
    const contactEmail = body.contact_email !== undefined ? body.contact_email : body.contactEmail;
    if (contactEmail !== undefined) {
      websiteUpdates.push(`contact_email = $${wIdx++}`);
      websiteValues.push(contactEmail || null);
    }
    if (body.address !== undefined) {
      websiteUpdates.push(`address = $${wIdx++}`);
      websiteValues.push(body.address || null);
    }
    if (body.institution_type !== undefined || body.institutionType !== undefined) {
      websiteUpdates.push(`institution_type = $${wIdx++}`);
      websiteValues.push(body.institution_type || body.institutionType || null);
    }
    if (body.eiin_number !== undefined || body.eiinNumber !== undefined) {
      websiteUpdates.push(`eiin_number = $${wIdx++}`);
      websiteValues.push(body.eiin_number || body.eiinNumber || null);
    }

    if (websiteUpdates.length > 0) {
      websiteValues.push(websiteId);
      await queryDb(
        `UPDATE websites SET ${websiteUpdates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${wIdx}`,
        websiteValues
      ).catch((err) => console.warn('Websites update notice:', err.message));
    }

    const refreshed = await queryDb(
      `SELECT w.*, 
              w.id AS website_id,
              w.name AS website_name, 
              w.name AS site_title,
              ('Excellence in ' || COALESCE(w.institution_type, 'Education')) AS tagline,
              ('Excellence in ' || COALESCE(w.institution_type, 'Education')) AS motto,
              '' AS mission,
              '' AS vision,
              '' AS history,
              '' AS map_url,
              '' AS facebook_url,
              '' AS twitter_url,
              '' AS instagram_url,
              '' AS youtube_url,
              (CASE WHEN w.status = 'active' AND w.is_maintenance_mode = false THEN true ELSE false END) AS is_published
       FROM websites w
       WHERE w.id = $1
       LIMIT 1`,
      [websiteId]
    );

    return NextResponse.json({
      success: true,
      settings: refreshed.rows[0] || {},
      message: 'Website settings updated successfully',
    });
  } catch (error) {
    console.error('Website Settings POST API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
