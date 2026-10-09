import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { getStaffSession } from 'src/lib/middleware/staff';
import { isAdmin } from 'src/lib/middleware/developer';

async function verifyStaffAccess(request, context) {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }
  const devAdmin = await isAdmin();
  const staffSession = await getStaffSession(request);

  if (!staffSession && !devAdmin) {
    return { error: 'Unauthorized: Staff access required.', status: 401 };
  }

  if (!devAdmin && staffSession && String(staffSession.website_id) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
  }

  return { website, staffSession, devAdmin };
}

// GET: List all award images with award metadata
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const awardId = searchParams.get('award_id');

    let query = `
      SELECT 
        ai.id,
        ai.award_id,
        ai.image_url,
        ai.image_id,
        ai.caption,
        ai.created_at,
        ai.updated_at,
        a.title as award_title,
        a.slug as award_slug,
        a.year as award_year,
        a.issuer as award_issuer
      FROM website_award_images ai
      JOIN website_awards a ON a.id = ai.award_id AND a.website_id = ai.website_id
      WHERE ai.website_id = $1
    `;
    const params = [auth.website.id];

    if (awardId) {
      params.push(parseInt(awardId, 10));
      query += ` AND ai.award_id = $${params.length}`;
    }

    query += ` ORDER BY a.year DESC NULLS LAST, a.id DESC`;

    const result = await queryDb(query, params);

    return NextResponse.json({
      success: true,
      images: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching award images:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Upsert single image for an award
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { award_id, image_url, image_id, caption } = body;

    if (!award_id) {
      return NextResponse.json({ success: false, error: 'Award ID is required.' }, { status: 400 });
    }

    if (!image_url || !String(image_url).trim()) {
      return NextResponse.json({ success: false, error: 'Image URL is required.' }, { status: 400 });
    }

    // Verify award belongs to this website
    const awardCheck = await queryDb(
      `SELECT id, title FROM website_awards WHERE id = $1 AND website_id = $2`,
      [award_id, auth.website.id]
    );

    if (awardCheck.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Award not found or unauthorized.' }, { status: 404 });
    }

    // Enforce strictly single image via ON CONFLICT (award_id)
    const upsertResult = await queryDb(
      `INSERT INTO website_award_images 
        (website_id, award_id, image_url, image_id, caption)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (award_id) DO UPDATE SET
         image_url = EXCLUDED.image_url,
         image_id = EXCLUDED.image_id,
         caption = EXCLUDED.caption,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        auth.website.id,
        award_id,
        String(image_url).trim(),
        image_id || null,
        caption || null
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Image for award "${awardCheck.rows[0].title}" saved successfully.`,
      image: upsertResult.rows[0]
    });
  } catch (error) {
    console.error('Error saving award image:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove image for an award
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const awardId = searchParams.get('award_id');
    const imageId = searchParams.get('id');
    const body = await request.json().catch(() => ({}));

    const targetAwardId = awardId || body.award_id;
    const targetImageId = imageId || body.id;

    if (!targetAwardId && !targetImageId) {
      return NextResponse.json({ success: false, error: 'Award ID or Image ID required for deletion.' }, { status: 400 });
    }

    let deleteResult;
    if (targetAwardId) {
      deleteResult = await queryDb(
        `DELETE FROM website_award_images WHERE award_id = $1 AND website_id = $2 RETURNING id`,
        [targetAwardId, auth.website.id]
      );
    } else {
      deleteResult = await queryDb(
        `DELETE FROM website_award_images WHERE id = $1 AND website_id = $2 RETURNING id`,
        [targetImageId, auth.website.id]
      );
    }

    if (deleteResult.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Award image not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Award image removed successfully.'
    });
  } catch (error) {
    console.error('Error deleting award image:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
