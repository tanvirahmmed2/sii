import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

// GET: Latest active popup announcement for homepage
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    // Check latest active notice as an announcement
    const noticeRes = await queryDb(
      `SELECT id,
              title AS name,
              description AS content,
              slug,
              drive_url,
              published_date,
              created_at
       FROM website_notices
       WHERE website_id = $1 AND is_active = true
       ORDER BY published_date DESC, id DESC
       LIMIT 1`,
      [website.id]
    );

    const announcement = noticeRes.rows[0] || null;

    return NextResponse.json({
      success: true,
      announcement,
      payload: { announcement },
      paylod: { announcement },
    });
  } catch (error) {
    console.error('Error fetching announcement:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
