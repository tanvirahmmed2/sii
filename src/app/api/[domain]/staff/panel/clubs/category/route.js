import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyClubStaffAccess } from 'src/lib/middleware/clubAuth.js';

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || `category-${Date.now()}`;
}

async function generateUniqueCategorySlug(websiteId, baseName, excludeId = null) {
  const baseSlug = slugify(baseName);
  let candidate = baseSlug;
  let counter = 1;
  while (true) {
    let checkQuery = `SELECT id FROM website_clubs_category WHERE website_id = $1 AND slug = $2`;
    const params = [websiteId, candidate];
    if (excludeId) {
      checkQuery += ` AND id != $3`;
      params.push(excludeId);
    }
    const res = await queryDb(checkQuery, params);
    if (res.rows.length === 0) return candidate;
    candidate = `${baseSlug}-${counter}`;
    counter++;
  }
}

// GET: List all club categories with club counts
export async function GET(request, context) {
  try {
    const auth = await verifyClubStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status');

    let queryStr = `
      SELECT cat.*,
             COALESCE((
               SELECT COUNT(*) 
               FROM website_clubs c 
               WHERE c.website_id = cat.website_id 
                 AND (c.category_id = cat.id OR LOWER(c.category) = LOWER(cat.name))
             ), 0)::int AS clubs_count
      FROM website_clubs_category cat
      WHERE cat.website_id = $1
    `;
    const params = [website.id];

    if (search) {
      params.push(`%${search}%`);
      queryStr += ` AND (cat.name ILIKE $${params.length} OR cat.description ILIKE $${params.length})`;
    }

    if (status === 'active') {
      params.push(true);
      queryStr += ` AND cat.is_active = $${params.length}`;
    } else if (status === 'inactive') {
      params.push(false);
      queryStr += ` AND cat.is_active = $${params.length}`;
    }

    queryStr += ` ORDER BY cat.name ASC, cat.id DESC`;

    const result = await queryDb(queryStr, params);

    return NextResponse.json({
      success: true,
      categories: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching club categories:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create a new club category (Slug auto-generated in API)
export async function POST(request, context) {
  try {
    const auth = await verifyClubStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json().catch(() => ({}));

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Category name is required.' }, { status: 400 });
    }

    // Auto-generate slug in API
    const slug = await generateUniqueCategorySlug(website.id, name);
    const description = body.description?.trim() || null;
    const isActive = body.is_active !== false && body.is_active !== 'false';

    // Check duplicate name for institution
    const existing = await queryDb(
      `SELECT id FROM website_clubs_category 
       WHERE website_id = $1 AND LOWER(name) = LOWER($2)
       LIMIT 1`,
      [website.id, name]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ success: false, error: `A category named "${name}" already exists.` }, { status: 409 });
    }

    const insertRes = await queryDb(
      `INSERT INTO website_clubs_category (website_id, name, slug, description, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [website.id, name, slug, description, isActive]
    );

    return NextResponse.json({
      success: true,
      message: 'Category created successfully.',
      category: insertRes.rows[0],
    });
  } catch (error) {
    console.error('Error creating club category:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update an existing club category (Slug auto-updated in API if name changes)
export async function PUT(request, context) {
  try {
    const auth = await verifyClubStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json().catch(() => ({}));

    const categoryId = parseInt(body.id, 10);
    if (!categoryId || isNaN(categoryId)) {
      return NextResponse.json({ success: false, error: 'Valid Category ID is required.' }, { status: 400 });
    }

    const checkRes = await queryDb(
      `SELECT * FROM website_clubs_category WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [categoryId, website.id]
    );
    if (checkRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Category not found.' }, { status: 404 });
    }
    const current = checkRes.rows[0];

    const name = body.name?.trim() || current.name;
    const description = body.description !== undefined ? body.description?.trim() : current.description;
    const isActive = body.is_active !== undefined ? (body.is_active === true || body.is_active === 'true' || body.is_active === 1) : current.is_active;

    // Check duplicate name
    if (name.toLowerCase() !== current.name.toLowerCase()) {
      const dupCheck = await queryDb(
        `SELECT id FROM website_clubs_category 
         WHERE website_id = $1 AND LOWER(name) = LOWER($2) AND id != $3
         LIMIT 1`,
        [website.id, name, categoryId]
      );
      if (dupCheck.rows.length > 0) {
        return NextResponse.json({ success: false, error: `A category named "${name}" already exists.` }, { status: 409 });
      }
    }

    // Auto-update slug in API
    const slug = await generateUniqueCategorySlug(website.id, name, categoryId);

    const updated = await queryDb(
      `UPDATE website_clubs_category
       SET name = $1, slug = $2, description = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND website_id = $6
       RETURNING *`,
      [name, slug, description, isActive, categoryId, website.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Category updated successfully.',
      category: updated.rows[0],
    });
  } catch (error) {
    console.error('Error updating club category:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a club category
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

    const categoryId = parseInt(id, 10);
    if (!categoryId || isNaN(categoryId)) {
      return NextResponse.json({ success: false, error: 'Valid Category ID is required.' }, { status: 400 });
    }

    const delRes = await queryDb(
      `DELETE FROM website_clubs_category WHERE id = $1 AND website_id = $2 RETURNING id, name`,
      [categoryId, website.id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Category not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Category "${delRes.rows[0].name}" deleted successfully.`,
      category: delRes.rows[0],
    });
  } catch (error) {
    console.error('Error deleting club category:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
