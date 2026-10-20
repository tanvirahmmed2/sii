import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getDriveDetails } from 'src/lib/utils/drive.js';

// GET: Direct download handler for a notice's attached drive file
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const { slug } = await context.params;
    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Notice identifier required' },
        { status: 400 }
      );
    }

    const result = await queryDb(
      `SELECT id,
              title,
              slug,
              drive_url,
              is_active
       FROM website_notices
       WHERE website_id = $1 AND (slug = $2 OR id::text = $2)
       LIMIT 1`,
      [website.id, slug]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Notice not found' },
        { status: 404 }
      );
    }

    const notice = result.rows[0];
    if (!notice.drive_url) {
      return NextResponse.json(
        { success: false, error: 'Notice does not have an attached document file.' },
        { status: 404 }
      );
    }

    const details = getDriveDetails(notice.drive_url);
    const targetDownloadUrl = details?.downloadUrl || notice.drive_url;

    return NextResponse.redirect(targetDownloadUrl, 302);
  } catch (error) {
    console.error('Error in notice download route:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
