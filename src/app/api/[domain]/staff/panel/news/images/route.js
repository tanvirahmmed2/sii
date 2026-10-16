import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { getStaffSession } from 'src/lib/middleware/staff';
import { uploadImage, deleteImage } from 'src/lib/database/cloudinary.js';

async function verifyStaffAccess(request, context) {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }
  const staffSession = await getStaffSession(request);

  if (!staffSession) {
    return { error: 'Unauthorized: Staff access required.', status: 401 };
  }

  const staffWebsiteId =
    staffSession?.website_id ||
    staffSession?.websiteId ||
    staffSession?.staff?.websiteId ||
    staffSession?.staff?.website_id;

  if (staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
  }

  return { website, staffSession };
}

async function parseNewsImageRequest(request) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const data = {};
    for (const [key, value] of formData.entries()) {
      if (key === 'file' || key === 'image') {
        data.file = value;
      } else {
        data[key] = value;
      }
    }
    return data;
  }
  return await request.json().catch(() => ({}));
}

// GET: List images for news articles
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const newsId = searchParams.get('news_id');

    let query = `
      SELECT 
        ni.id,
        ni.news_id,
        ni.image_url,
        ni.image_id,
        ni.caption,
        ni.is_cover,
        ni.display_order,
        ni.created_at,
        ni.updated_at,
        n.title as news_title,
        n.slug as news_slug,
        n.category as news_category
      FROM website_news_images ni
      JOIN website_news n ON n.id = ni.news_id AND n.website_id = ni.website_id
      WHERE ni.website_id = $1
    `;
    const params = [auth.website.id];

    if (newsId) {
      params.push(parseInt(newsId, 10));
      query += ` AND ni.news_id = $${params.length}`;
    }

    query += ` ORDER BY ni.news_id DESC, ni.is_cover DESC, ni.display_order ASC, ni.id ASC`;

    const result = await queryDb(query, params);

    return NextResponse.json({
      success: true,
      images: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching news images:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Add an image to a news article (table-first verification and Cloudinary upload)
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await parseNewsImageRequest(request);
    const { news_id, image_url, image_id, caption, is_cover, display_order, file } = body;

    if (!news_id) {
      return NextResponse.json({ success: false, error: 'News article ID is required.' }, { status: 400 });
    }

    // 1. Verify news article exists in tenant database FIRST before any upload
    const newsCheck = await queryDb(
      `SELECT id, title FROM website_news WHERE id = $1 AND website_id = $2`,
      [news_id, auth.website.id]
    );

    if (newsCheck.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'News article not found or unauthorized.' }, { status: 404 });
    }

    let finalImageUrl = image_url;
    let finalImageId = image_id || null;

    // 2. Upload to Cloudinary only if the parent news record exists
    if (file && typeof file === 'object' && file.name) {
      try {
        const uploadRes = await uploadImage(file, `school/${auth.website.id}/news`);
        finalImageUrl = uploadRes.url;
        finalImageId = uploadRes.publicId;
      } catch (uploadErr) {
        console.error('Cloudinary upload error:', uploadErr);
        return NextResponse.json({ success: false, error: 'Failed to upload photo to Cloudinary.' }, { status: 500 });
      }
    }

    if (!finalImageUrl || !String(finalImageUrl).trim()) {
      return NextResponse.json({ success: false, error: 'Image file or image URL is required.' }, { status: 400 });
    }

    const isCoverBool = is_cover === 'true' || is_cover === true;

    // If setting as cover, unset cover on any existing images for this news
    if (isCoverBool) {
      await queryDb(
        `UPDATE website_news_images SET is_cover = FALSE WHERE news_id = $1 AND website_id = $2`,
        [news_id, auth.website.id]
      );
    }

    const insertResult = await queryDb(
      `INSERT INTO website_news_images 
        (website_id, news_id, image_url, image_id, caption, is_cover, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        auth.website.id,
        news_id,
        String(finalImageUrl).trim(),
        finalImageId,
        caption || null,
        isCoverBool,
        parseInt(display_order, 10) || 0
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Image added to "${newsCheck.rows[0].title}".`,
      image: insertResult.rows[0]
    });
  } catch (error) {
    console.error('Error adding news image:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update news image metadata (cover status, caption, display order)
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await parseNewsImageRequest(request);
    const { id, caption, is_cover, display_order } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Image ID is required for update.' }, { status: 400 });
    }

    // Check image existence
    const imgCheck = await queryDb(
      `SELECT * FROM website_news_images WHERE id = $1 AND website_id = $2`,
      [id, auth.website.id]
    );

    if (imgCheck.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'News image not found.' }, { status: 404 });
    }

    const currentImg = imgCheck.rows[0];
    const isCoverBool = is_cover !== undefined ? (is_cover === 'true' || is_cover === true) : undefined;

    // If making this cover, unset others
    if (isCoverBool === true) {
      await queryDb(
        `UPDATE website_news_images SET is_cover = FALSE WHERE news_id = $1 AND website_id = $2`,
        [currentImg.news_id, auth.website.id]
      );
    }

    const updateResult = await queryDb(
      `UPDATE website_news_images
       SET caption = COALESCE($1, caption),
           is_cover = COALESCE($2, is_cover),
           display_order = COALESCE($3, display_order),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND website_id = $5
       RETURNING *`,
      [
        caption !== undefined ? caption : null,
        isCoverBool !== undefined ? isCoverBool : null,
        display_order !== undefined ? parseInt(display_order, 10) : null,
        id,
        auth.website.id
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'News image updated successfully.',
      image: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Error updating news image:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove news image and cleanup Cloudinary
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('id');
    const body = await request.json().catch(() => ({}));
    const id = queryId || body.id;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Image ID is required for deletion.' }, { status: 400 });
    }

    const deleteResult = await queryDb(
      `DELETE FROM website_news_images WHERE id = $1 AND website_id = $2 RETURNING id, news_id, image_id`,
      [id, auth.website.id]
    );

    if (deleteResult.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'News image not found or already deleted.' }, { status: 404 });
    }

    const deletedRecord = deleteResult.rows[0];
    if (deletedRecord.image_id) {
      await deleteImage(deletedRecord.image_id).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: 'News image deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting news image:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
