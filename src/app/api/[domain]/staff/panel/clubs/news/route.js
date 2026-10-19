import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyClubStaffAccess } from 'src/lib/middleware/clubAuth.js';
import { uploadImage, deleteImage } from 'src/lib/database/cloudinary.js';

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || `news-${Date.now()}`;
}

async function generateUniqueNewsSlug(websiteId, clubId, baseTitle, excludeId = null) {
  const baseSlug = slugify(baseTitle);
  let candidate = baseSlug;
  let counter = 1;
  while (true) {
    let checkQuery = `SELECT id FROM website_club_news WHERE website_id = $1 AND club_id = $2 AND slug = $3`;
    const params = [websiteId, clubId, candidate];
    if (excludeId) {
      checkQuery += ` AND id != $4`;
      params.push(excludeId);
    }
    const res = await queryDb(checkQuery, params);
    if (res.rows.length === 0) return candidate;
    candidate = `${baseSlug}-${counter}`;
    counter++;
  }
}

async function parseNewsRequest(request) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const data = {};
    for (const [key, value] of formData.entries()) {
      if (key === 'image' || key === 'file' || key === 'photo') {
        data.imageFile = value;
      } else {
        data[key] = value;
      }
    }
    return data;
  }
  return await request.json().catch(() => ({}));
}

// GET: List club news
export async function GET(request, context) {
  try {
    const auth = await verifyClubStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('club_id');
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status');

    let queryStr = `
      SELECT cn.*,
             c.name AS club_name,
             c.category AS club_category
      FROM website_club_news cn
      JOIN website_clubs c ON c.id = cn.club_id
      WHERE cn.website_id = $1
    `;
    const params = [website.id];

    if (clubId && clubId !== 'all') {
      params.push(parseInt(clubId, 10));
      queryStr += ` AND cn.club_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      queryStr += ` AND (cn.title ILIKE $${params.length} OR cn.summary ILIKE $${params.length} OR c.name ILIKE $${params.length})`;
    }

    if (status === 'published') {
      params.push(true);
      queryStr += ` AND cn.is_published = $${params.length}`;
    } else if (status === 'draft') {
      params.push(false);
      queryStr += ` AND cn.is_published = $${params.length}`;
    }

    queryStr += ` ORDER BY cn.published_date DESC, cn.id DESC`;

    const result = await queryDb(queryStr, params);

    // Clubs list for dropdown
    const clubsRes = await queryDb(
      `SELECT id, name, category FROM website_clubs WHERE website_id = $1 AND is_active = true ORDER BY name ASC`,
      [website.id]
    );

    return NextResponse.json({
      success: true,
      news: result.rows,
      clubs: clubsRes.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching club news:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create a new club news item (Slug auto-generated in API)
export async function POST(request, context) {
  try {
    const auth = await verifyClubStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await parseNewsRequest(request);

    const clubId = parseInt(body.club_id, 10);
    const title = body.title?.trim();
    if (!clubId || !title) {
      return NextResponse.json({ success: false, error: 'Club and News Title are required.' }, { status: 400 });
    }

    // Verify club
    const clubCheck = await queryDb(
      `SELECT id, name FROM website_clubs WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [clubId, website.id]
    );
    if (clubCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Selected club not found.' }, { status: 404 });
    }

    // Auto-generate slug in API
    const slug = await generateUniqueNewsSlug(website.id, clubId, title);

    let imageUrl = body.image_url || null;
    if (body.imageFile && typeof body.imageFile === 'object') {
      try {
        const uploadRes = await uploadImage(body.imageFile, 'club_news');
        imageUrl = uploadRes.secure_url || uploadRes.url;
      } catch (uploadErr) {
        console.error('News image upload error:', uploadErr);
      }
    }

    const summary = body.summary?.trim() || null;
    const content = body.content || null;
    const publishedDate = body.published_date || new Date().toISOString().split('T')[0];
    const isPublished = body.is_published !== false && body.is_published !== 'false';

    const insertRes = await queryDb(
      `INSERT INTO website_club_news (
         website_id, club_id, title, slug, summary, content, image_url, published_date, is_published
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [website.id, clubId, title, slug, summary, content, imageUrl, publishedDate, isPublished]
    );

    return NextResponse.json({
      success: true,
      message: 'News published successfully.',
      news: insertRes.rows[0],
    });
  } catch (error) {
    console.error('Error creating club news:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update an existing club news item (Slug auto-updated in API)
export async function PUT(request, context) {
  try {
    const auth = await verifyClubStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await parseNewsRequest(request);

    const newsId = parseInt(body.id, 10);
    if (!newsId || isNaN(newsId)) {
      return NextResponse.json({ success: false, error: 'Valid News ID is required.' }, { status: 400 });
    }

    const checkRes = await queryDb(
      `SELECT * FROM website_club_news WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [newsId, website.id]
    );
    if (checkRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'News item not found.' }, { status: 404 });
    }
    const current = checkRes.rows[0];

    const clubId = body.club_id ? parseInt(body.club_id, 10) : current.club_id;
    const title = body.title?.trim() || current.title;
    const slug = await generateUniqueNewsSlug(website.id, clubId, title, newsId);
    const summary = body.summary !== undefined ? body.summary?.trim() : current.summary;
    const content = body.content !== undefined ? body.content : current.content;
    const publishedDate = body.published_date || current.published_date;
    const isPublished = body.is_published !== undefined ? (body.is_published === true || body.is_published === 'true' || body.is_published === 1) : current.is_published;

    let imageUrl = current.image_url;
    if (body.imageFile && typeof body.imageFile === 'object') {
      try {
        const uploadRes = await uploadImage(body.imageFile, 'club_news');
        imageUrl = uploadRes.secure_url || uploadRes.url;
      } catch (uploadErr) {
        console.error('News image upload error:', uploadErr);
      }
    } else if (body.image_url !== undefined) {
      imageUrl = body.image_url;
    }

    const updated = await queryDb(
      `UPDATE website_club_news
       SET club_id = $1, title = $2, slug = $3, summary = $4,
           content = $5, image_url = $6, published_date = $7, is_published = $8,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND website_id = $10
       RETURNING *`,
      [clubId, title, slug, summary, content, imageUrl, publishedDate, isPublished, newsId, website.id]
    );

    return NextResponse.json({
      success: true,
      message: 'News updated successfully.',
      news: updated.rows[0],
    });
  } catch (error) {
    console.error('Error updating club news:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a club news item
export async function DELETE(request, context) {
  try {
    const auth = await verifyClubStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    const newsId = parseInt(id, 10);
    if (!newsId || isNaN(newsId)) {
      return NextResponse.json({ success: false, error: 'Valid News ID is required.' }, { status: 400 });
    }

    const delRes = await queryDb(
      `DELETE FROM website_club_news WHERE id = $1 AND website_id = $2 RETURNING id, title`,
      [newsId, website.id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'News item not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `News "${delRes.rows[0].title}" deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting club news:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
