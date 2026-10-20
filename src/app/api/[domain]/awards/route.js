import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

// GET: Public awards list for tenant
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const year = searchParams.get('year')?.trim();

    let query = `
      SELECT a.id,
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
      WHERE a.website_id = $1 AND a.is_active = true
    `;
    const params = [website.id];

    if (year && year !== 'all') {
      const yearInt = parseInt(year, 10);
      if (!isNaN(yearInt)) {
        params.push(yearInt);
        query += ` AND a.year = $${params.length}`;
      }
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (a.title ILIKE $${params.length} OR a.issuer ILIKE $${params.length} OR a.description ILIKE $${params.length})`;
    }

    query += ` ORDER BY a.year DESC NULLS LAST, a.id DESC`;

    const result = await queryDb(query, params);

    return NextResponse.json({
      success: true,
      awards: result.rows,
      recognitions: result.rows,
      payload: { awards: result.rows, recognitions: result.rows },
      paylod: { awards: result.rows, recognitions: result.rows },
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching public awards:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
