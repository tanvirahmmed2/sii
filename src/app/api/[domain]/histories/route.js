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
      `SELECT id, title, date, year, description, infor, image, image_id, order_no, created_at, updated_at
       FROM website_histories
       WHERE website_id = $1 AND is_active = true
       ORDER BY order_no ASC, COALESCE(date, '1900-01-01'::date) DESC, id DESC`,
      [website.id]
    );

    return NextResponse.json({
      success: true,
      histories: result.rows,
      payload: {
        histories: result.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching public histories:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch histories.' },
      { status: 500 }
    );
  }
}
