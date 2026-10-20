import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

// GET: Public single award detail by slug or id
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const params = await context.params;
    const rawSlug = params?.slug ? decodeURIComponent(params.slug).trim() : null;

    if (!rawSlug) {
      return NextResponse.json(
        { success: false, error: 'Award identifier not provided.' },
        { status: 400 }
      );
    }

    // Match by slug or id
    const singleRes = await queryDb(
      `SELECT a.id,
              a.website_id,
              a.title,
              a.slug,
              a.description,
              a.year,
              a.issuer,
              a.is_active,
              a.created_at,
              a.updated_at,
              COALESCE(ai.image_url, null) AS image,
              COALESCE(ai.image_url, null) AS image_url,
              ai.caption
       FROM website_awards a
       LEFT JOIN website_award_images ai ON ai.award_id = a.id AND ai.website_id = a.website_id
       WHERE a.website_id = $1 AND a.is_active = true AND (a.slug = $2 OR a.id::text = $2)
       LIMIT 1`,
      [website.id, rawSlug]
    );

    if (singleRes.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Award not found or inactive.' },
        { status: 404 }
      );
    }

    const award = singleRes.rows[0];

    // Fetch up to 4 other related awards from this institution
    const relatedRes = await queryDb(
      `SELECT a.id,
              a.title,
              a.slug,
              a.description,
              a.year,
              a.issuer,
              a.created_at,
              COALESCE(ai.image_url, null) AS image,
              COALESCE(ai.image_url, null) AS image_url,
              ai.caption
       FROM website_awards a
       LEFT JOIN website_award_images ai ON ai.award_id = a.id AND ai.website_id = a.website_id
       WHERE a.website_id = $1 AND a.is_active = true AND a.id != $2
       ORDER BY a.year DESC NULLS LAST, a.id DESC
       LIMIT 4`,
      [website.id, award.id]
    );

    return NextResponse.json({
      success: true,
      award,
      relatedAwards: relatedRes.rows,
      payload: {
        award,
        relatedAwards: relatedRes.rows,
      },
      paylod: {
        award,
        relatedAwards: relatedRes.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching public award detail:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
