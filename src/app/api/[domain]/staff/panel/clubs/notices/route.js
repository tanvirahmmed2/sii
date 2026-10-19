import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyClubStaffAccess } from 'src/lib/middleware/clubAuth.js';

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || `notice-${Date.now()}`;
}

async function generateUniqueNoticeSlug(websiteId, clubId, baseTitle, excludeId = null) {
  const baseSlug = slugify(baseTitle);
  let candidate = baseSlug;
  let counter = 1;
  while (true) {
    let checkQuery = `SELECT id FROM website_club_notices WHERE website_id = $1 AND club_id = $2 AND slug = $3`;
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

// GET: List club notices
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
      FROM website_club_notices cn
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
      queryStr += ` AND (cn.title ILIKE $${params.length} OR cn.description ILIKE $${params.length} OR c.name ILIKE $${params.length})`;
    }

    if (status === 'active') {
      params.push(true);
      queryStr += ` AND cn.is_active = $${params.length}`;
    } else if (status === 'inactive') {
      params.push(false);
      queryStr += ` AND cn.is_active = $${params.length}`;
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
      notices: result.rows,
      clubs: clubsRes.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching club notices:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create a new club notice (Slug auto-generated in API)
export async function POST(request, context) {
  try {
    const auth = await verifyClubStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json().catch(() => ({}));

    const clubId = parseInt(body.club_id, 10);
    const title = body.title?.trim();
    if (!clubId || !title) {
      return NextResponse.json({ success: false, error: 'Club and Notice Title are required.' }, { status: 400 });
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
    const slug = await generateUniqueNoticeSlug(website.id, clubId, title);
    const description = body.description?.trim() || null;
    const attachmentUrl = body.attachment_url?.trim() || null;
    const publishedDate = body.published_date || new Date().toISOString().split('T')[0];
    const isActive = body.is_active !== false && body.is_active !== 'false';

    const insertRes = await queryDb(
      `INSERT INTO website_club_notices (
         website_id, club_id, title, slug, description, attachment_url, published_date, is_active
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [website.id, clubId, title, slug, description, attachmentUrl, publishedDate, isActive]
    );

    return NextResponse.json({
      success: true,
      message: 'Notice published successfully.',
      notice: insertRes.rows[0],
    });
  } catch (error) {
    console.error('Error creating club notice:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update an existing club notice (Slug auto-updated in API)
export async function PUT(request, context) {
  try {
    const auth = await verifyClubStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json().catch(() => ({}));

    const noticeId = parseInt(body.id, 10);
    if (!noticeId || isNaN(noticeId)) {
      return NextResponse.json({ success: false, error: 'Valid Notice ID is required.' }, { status: 400 });
    }

    const checkRes = await queryDb(
      `SELECT * FROM website_club_notices WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [noticeId, website.id]
    );
    if (checkRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Notice not found.' }, { status: 404 });
    }
    const current = checkRes.rows[0];

    const clubId = body.club_id ? parseInt(body.club_id, 10) : current.club_id;
    const title = body.title?.trim() || current.title;
    const slug = await generateUniqueNoticeSlug(website.id, clubId, title, noticeId);
    const description = body.description !== undefined ? body.description?.trim() : current.description;
    const attachmentUrl = body.attachment_url !== undefined ? body.attachment_url?.trim() : current.attachment_url;
    const publishedDate = body.published_date || current.published_date;
    const isActive = body.is_active !== undefined ? (body.is_active === true || body.is_active === 'true' || body.is_active === 1) : current.is_active;

    const updated = await queryDb(
      `UPDATE website_club_notices
       SET club_id = $1, title = $2, slug = $3, description = $4,
           attachment_url = $5, published_date = $6, is_active = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND website_id = $9
       RETURNING *`,
      [clubId, title, slug, description, attachmentUrl, publishedDate, isActive, noticeId, website.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Notice updated successfully.',
      notice: updated.rows[0],
    });
  } catch (error) {
    console.error('Error updating club notice:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a club notice
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

    const noticeId = parseInt(id, 10);
    if (!noticeId || isNaN(noticeId)) {
      return NextResponse.json({ success: false, error: 'Valid Notice ID is required.' }, { status: 400 });
    }

    const delRes = await queryDb(
      `DELETE FROM website_club_notices WHERE id = $1 AND website_id = $2 RETURNING id, title`,
      [noticeId, website.id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Notice not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Notice "${delRes.rows[0].title}" deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting club notice:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
