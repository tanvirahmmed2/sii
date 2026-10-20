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

    const result = await queryDb(
      `SELECT id, year, title, description, image, image_id, order_no, created_at, updated_at
       FROM website_milestons
       WHERE website_id = $1 AND is_active = true
       ORDER BY order_no ASC, year ASC, id ASC`,
      [website.id]
    );

    return NextResponse.json({
      success: true,
      milestones: result.rows,
      payload: { milestones: result.rows },
    });
  } catch (error) {
    console.error('Error in home/milestones API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch milestones.' },
      { status: 500 }
    );
  }
}
