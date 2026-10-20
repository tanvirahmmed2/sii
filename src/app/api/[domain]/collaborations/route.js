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

    let collaborations = [];
    try {
      const res = await queryDb(
        `SELECT id, institution_name, logo, description, partnership_type, order_no, created_at
         FROM website_collaborations
         WHERE website_id = $1 AND is_active = true
         ORDER BY order_no ASC, id ASC`,
        [website.id]
      );
      collaborations = res.rows || [];
    } catch {
      // Table may not exist yet; return empty array gracefully
      collaborations = [];
    }

    return NextResponse.json({
      success: true,
      collaborations,
      payload: {
        collaborations,
      },
    });
  } catch (error) {
    console.error('Error in home/collaborations API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch collaborations.' },
      { status: 500 }
    );
  }
}
