import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

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
    const slug = searchParams.get('slug');

    let query = `
      SELECT id, title, slug, description, is_active, created_at, updated_at
      FROM policies
      WHERE is_active = true
    `;
    const params = [];

    if (slug) {
      params.push(slug);
      query += ` AND slug = $${params.length}`;
    }

    query += ` ORDER BY id ASC`;

    const res = await queryDb(query, params);

    return NextResponse.json({
      success: true,
      policies: res.rows || [],
      payload: {
        policies: res.rows || [],
      },
    });
  } catch (error) {
    console.error('Error in home/policies API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch policies.' },
      { status: 500 }
    );
  }
}
