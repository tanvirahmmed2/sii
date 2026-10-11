import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { getStaffSession } from 'src/lib/middleware/staff';

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

function slugify(text) {
  const base = String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `notice-${Date.now()}`;
}

// GET: List all notices for this website
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status');

    let query = `
      SELECT * FROM website_notices 
      WHERE website_id = $1
    `;
    const params = [auth.website.id];

    if (status === 'active') {
      params.push(true);
      query += ` AND is_active = $${params.length}`;
    } else if (status === 'inactive') {
      params.push(false);
      query += ` AND is_active = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (title ILIKE $${params.length} OR slug ILIKE $${params.length} OR description ILIKE $${params.length})`;
    }

    query += ` ORDER BY published_date DESC, id DESC`;

    const result = await queryDb(query, params);

    return NextResponse.json({
      success: true,
      notices: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching notices:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create a new notice
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { title, slug, drive_url, description, published_date, is_active = true } = body;

    if (!title || !String(title).trim()) {
      return NextResponse.json({ success: false, error: 'Notice title is required.' }, { status: 400 });
    }

    if (!drive_url || !String(drive_url).trim()) {
      return NextResponse.json({ success: false, error: 'Google Drive URL or document link is required.' }, { status: 400 });
    }

    let finalSlug = slug ? slugify(slug) : slugify(title);

    // Verify unique slug for this website, append suffix if exists
    let slugExists = await queryDb(
      `SELECT id FROM website_notices WHERE website_id = $1 AND slug = $2 LIMIT 1`,
      [auth.website.id, finalSlug]
    );

    if (slugExists.rowCount > 0) {
      finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
    }

    const insertResult = await queryDb(
      `INSERT INTO website_notices 
        (website_id, title, slug, drive_url, description, published_date, is_active)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6::DATE, CURRENT_DATE), $7)
       RETURNING *`,
      [
        auth.website.id,
        String(title).trim(),
        finalSlug,
        String(drive_url).trim(),
        description || '',
        published_date || null,
        Boolean(is_active)
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Notice created successfully.',
      notice: insertResult.rows[0]
    });
  } catch (error) {
    console.error('Error creating notice:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update an existing notice
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { id, title, slug, drive_url, description, published_date, is_active } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Notice ID is required for update.' }, { status: 400 });
    }

    // Check existence
    const existing = await queryDb(
      `SELECT * FROM website_notices WHERE id = $1 AND website_id = $2`,
      [id, auth.website.id]
    );

    if (existing.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Notice not found or unauthorized.' }, { status: 404 });
    }

    let finalSlug = slug ? slugify(slug) : existing.rows[0].slug;

    // Check slug collision if slug changed
    if (finalSlug !== existing.rows[0].slug) {
      const slugCollision = await queryDb(
        `SELECT id FROM website_notices WHERE website_id = $1 AND slug = $2 AND id != $3`,
        [auth.website.id, finalSlug, id]
      );
      if (slugCollision.rowCount > 0) {
        finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
      }
    }

    const updateResult = await queryDb(
      `UPDATE website_notices
       SET title = COALESCE($1, title),
           slug = $2,
           drive_url = COALESCE($3, drive_url),
           description = COALESCE($4, description),
           published_date = COALESCE($5::DATE, published_date),
           is_active = COALESCE($6, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND website_id = $8
       RETURNING *`,
      [
        title ? String(title).trim() : null,
        finalSlug,
        drive_url ? String(drive_url).trim() : null,
        description !== undefined ? description : null,
        published_date || null,
        is_active !== undefined ? Boolean(is_active) : null,
        id,
        auth.website.id
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Notice updated successfully.',
      notice: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Error updating notice:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a notice
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('id');
    const body = await request.json().catch(() => ({}));
    const id = queryId || body.id;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Notice ID is required for deletion.' }, { status: 400 });
    }

    const deleteResult = await queryDb(
      `DELETE FROM website_notices WHERE id = $1 AND website_id = $2 RETURNING id, title`,
      [id, auth.website.id]
    );

    if (deleteResult.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Notice not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Notice "${deleteResult.rows[0].title}" deleted successfully.`
    });
  } catch (error) {
    console.error('Error deleting notice:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
