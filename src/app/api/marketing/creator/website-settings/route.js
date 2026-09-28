import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { getCreatorSession } from '@/lib/middleware/creator';

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
      `SELECT ws.*, w.name AS website_name, w.subdomain, w.custom_domain, w.is_published
       FROM website_settings ws
       JOIN websites w ON ws.website_id = w.id
       WHERE ws.website_id = $1
       LIMIT 1`,
      [websiteId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Website settings not found' }, { status: 404 });
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

    const updates = [];
    const values = [];
    let idx = 1;

    const fields = [
      'site_title',
      'tagline',
      'contact_email',
      'contact_phone',
      'primary_color',
      'secondary_color',
      'font_family',
      'currency',
      'social_links',
      'seo_config',
    ];

    for (const field of fields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${idx++}`);
        if (typeof body[field] === 'object' && body[field] !== null) {
          values.push(JSON.stringify(body[field]));
        } else {
          values.push(body[field]);
        }
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: true, message: 'No changes provided' });
    }

    values.push(websiteId);
    const res = await queryDb(
      `UPDATE website_settings 
       SET ${updates.join(', ')} 
       WHERE website_id = $${idx} 
       RETURNING *`,
      values
    );

    if (res.rows.length === 0) {
      // Insert if not yet created
      const insertRes = await queryDb(
        `INSERT INTO website_settings (
          website_id, site_title, tagline, contact_email, contact_phone, 
          primary_color, secondary_color, font_family, currency
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          websiteId,
          body.site_title || 'My Portfolio & Store',
          body.tagline || 'Modern Showcase',
          body.contact_email || null,
          body.contact_phone || null,
          body.primary_color || '#6366f1',
          body.secondary_color || '#4f46e5',
          body.font_family || 'Inter',
          body.currency || 'USD',
        ]
      );
      return NextResponse.json({ success: true, settings: insertRes.rows[0], message: 'Settings created successfully' });
    }

    return NextResponse.json({ success: true, settings: res.rows[0], message: 'Website settings updated successfully' });
  } catch (error) {
    console.error('Website Settings POST API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
