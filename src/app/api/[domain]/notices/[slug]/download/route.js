import { NextResponse } from 'next/server.js';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getDriveDetails } from 'src/lib/utils/drive.js';

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
              pdf_url,
              file_name,
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
    const fileUrl = notice.pdf_url || notice.drive_url;

    if (!fileUrl) {
      return NextResponse.json(
        { success: false, error: 'Notice does not have an attached document file.' },
        { status: 404 }
      );
    }

    if (fileUrl.includes('cloudinary.com') && fileUrl.includes('/upload/')) {
      const downloadTarget = fileUrl.replace('/upload/', '/upload/fl_attachment/');
      return NextResponse.redirect(downloadTarget, 302);
    }

    const details = getDriveDetails(fileUrl);
    const targetDownloadUrl = details?.downloadUrl || fileUrl;

    return NextResponse.redirect(targetDownloadUrl, 302);
  } catch (error) {
    console.error('Error in notice download route:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
