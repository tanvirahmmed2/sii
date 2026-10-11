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
  return base || `award-${Date.now()}`;
}

// GET: List all awards or fetch a single award by slug
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug')?.trim();
    const search = searchParams.get('search')?.trim();
    const year = searchParams.get('year');
    const status = searchParams.get('status');

    // Single award by slug
    if (slug) {
      const singleRes = await queryDb(
        `SELECT 
          a.id,
          a.website_id,
          a.title,
          a.slug,
          a.description,
          a.year,
          a.issuer,
          a.is_active,
          a.created_at,
          a.updated_at,
          ai.id as image_record_id,
          ai.image_url,
          ai.image_id,
          ai.caption as image_caption
        FROM website_awards a
        LEFT JOIN website_award_images ai ON ai.award_id = a.id
        WHERE a.website_id = $1 AND a.slug = $2
        LIMIT 1`,
        [auth.website.id, slug]
      );

      if (singleRes.rowCount === 0) {
        return NextResponse.json({ success: false, error: 'Award not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        award: singleRes.rows[0],
      });
    }

    let query = `
      SELECT 
        a.id,
        a.website_id,
        a.title,
        a.slug,
        a.description,
        a.year,
        a.issuer,
        a.is_active,
        a.created_at,
        a.updated_at,
        ai.id as image_record_id,
        ai.image_url,
        ai.image_id,
        ai.caption as image_caption
      FROM website_awards a
      LEFT JOIN website_award_images ai ON ai.award_id = a.id
      WHERE a.website_id = $1
    `;
    const params = [auth.website.id];

    if (status === 'active') {
      params.push(true);
      query += ` AND a.is_active = $${params.length}`;
    } else if (status === 'inactive') {
      params.push(false);
      query += ` AND a.is_active = $${params.length}`;
    }

    if (year) {
      params.push(parseInt(year, 10));
      query += ` AND a.year = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (a.title ILIKE $${params.length} OR a.issuer ILIKE $${params.length} OR a.description ILIKE $${params.length})`;
    }

    query += ` ORDER BY a.year DESC NULLS LAST, a.id DESC`;

    const result = await queryDb(query, params);

    return NextResponse.json({
      success: true,
      awards: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching awards:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create award (supports instant demo creation & auto-slugify)
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const isDemo = Boolean(body.is_demo);
    const title = body.title ? String(body.title).trim() : (isDemo ? 'New Institutional Recognition' : '');

    if (!title) {
      return NextResponse.json({ success: false, error: 'Award title is required.' }, { status: 400 });
    }

    // Auto-generate unique slug via slugify on server (hidden from frontend)
    let baseSlug = slugify(title);
    let finalSlug = baseSlug;

    const slugCheck = await queryDb(
      `SELECT id FROM website_awards WHERE website_id = $1 AND slug = $2 LIMIT 1`,
      [auth.website.id, finalSlug]
    );

    if (slugCheck.rowCount > 0 || isDemo) {
      finalSlug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const currentYear = new Date().getFullYear();
    const year = body.year !== undefined ? (body.year ? parseInt(body.year, 10) : null) : (isDemo ? currentYear : null);
    const issuer = body.issuer ? String(body.issuer).trim() : (isDemo ? 'Educational Board / Accrediting Council' : null);
    const description = body.description || (isDemo ? '<p>Details and recognition citations for this achievement.</p>' : '');
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : (isDemo ? false : true);

    const awardResult = await queryDb(
      `INSERT INTO website_awards 
        (website_id, title, slug, description, year, issuer, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [auth.website.id, title, finalSlug, description, year, issuer, isActive]
    );

    const createdAward = awardResult.rows[0];

    // Single image handling
    let savedImage = null;
    if (body.image && body.image.image_url) {
      const imgResult = await queryDb(
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
          createdAward.id,
          String(body.image.image_url).trim(),
          body.image.image_id || body.image.publicId || null,
          body.image.caption || null,
        ]
      );
      savedImage = imgResult.rows[0];
    }

    return NextResponse.json({
      success: true,
      message: isDemo ? 'Demo award created.' : 'Award created successfully.',
      award: {
        ...createdAward,
        image_record_id: savedImage?.id || null,
        image_url: savedImage?.image_url || null,
        image_id: savedImage?.image_id || null,
        image_caption: savedImage?.caption || null,
      },
    });
  } catch (error) {
    console.error('Error creating award:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update award (by ID or current slug)
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { id, current_slug, title, description, year, issuer, is_active, image, remove_image } = body;

    let targetAward = null;
    if (id) {
      const existing = await queryDb(
        `SELECT * FROM website_awards WHERE id = $1 AND website_id = $2`,
        [id, auth.website.id]
      );
      if (existing.rowCount > 0) targetAward = existing.rows[0];
    } else if (current_slug) {
      const existing = await queryDb(
        `SELECT * FROM website_awards WHERE slug = $1 AND website_id = $2`,
        [current_slug, auth.website.id]
      );
      if (existing.rowCount > 0) targetAward = existing.rows[0];
    }

    if (!targetAward) {
      return NextResponse.json({ success: false, error: 'Award not found or unauthorized.' }, { status: 404 });
    }

    const awardId = targetAward.id;
    let finalSlug = targetAward.slug;

    // If title changed and slug wasn't explicitly locked, re-slugify on server
    if (title && String(title).trim() !== targetAward.title) {
      const candidateSlug = slugify(title);
      const collision = await queryDb(
        `SELECT id FROM website_awards WHERE website_id = $1 AND slug = $2 AND id != $3`,
        [auth.website.id, candidateSlug, awardId]
      );
      finalSlug = collision.rowCount > 0 ? `${candidateSlug}-${Math.floor(1000 + Math.random() * 9000)}` : candidateSlug;
    }

    await queryDb(
      `UPDATE website_awards
       SET title = COALESCE($1, title),
           slug = $2,
           description = COALESCE($3, description),
           year = COALESCE($4, year),
           issuer = COALESCE($5, issuer),
           is_active = COALESCE($6, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND website_id = $8`,
      [
        title ? String(title).trim() : null,
        finalSlug,
        description !== undefined ? description : null,
        year !== undefined ? (year ? parseInt(year, 10) : null) : null,
        issuer !== undefined ? (issuer ? String(issuer).trim() : null) : null,
        is_active !== undefined ? Boolean(is_active) : null,
        awardId,
        auth.website.id,
      ]
    );

    // Single image handling: remove or upsert
    if (remove_image) {
      await queryDb(
        `DELETE FROM website_award_images WHERE award_id = $1 AND website_id = $2`,
        [awardId, auth.website.id]
      );
    } else if (image && image.image_url) {
      await queryDb(
        `INSERT INTO website_award_images 
          (website_id, award_id, image_url, image_id, caption)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (award_id) DO UPDATE SET
           image_url = EXCLUDED.image_url,
           image_id = EXCLUDED.image_id,
           caption = EXCLUDED.caption,
           updated_at = CURRENT_TIMESTAMP`,
        [
          auth.website.id,
          awardId,
          String(image.image_url).trim(),
          image.image_id || image.publicId || null,
          image.caption || null,
        ]
      );
    }

    // Refreshed record
    const fullAward = await queryDb(
      `SELECT 
        a.id, a.website_id, a.title, a.slug, a.description, a.year, a.issuer, a.is_active, a.created_at, a.updated_at,
        ai.id as image_record_id, ai.image_url, ai.image_id, ai.caption as image_caption
       FROM website_awards a
       LEFT JOIN website_award_images ai ON ai.award_id = a.id
       WHERE a.id = $1 AND a.website_id = $2`,
      [awardId, auth.website.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Award updated successfully.',
      award: fullAward.rows[0],
    });
  } catch (error) {
    console.error('Error updating award:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete award
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('id');
    const querySlug = searchParams.get('slug');
    const body = await request.json().catch(() => ({}));
    const id = queryId || body.id;
    const slug = querySlug || body.slug;

    if (!id && !slug) {
      return NextResponse.json({ success: false, error: 'Award ID or slug is required for deletion.' }, { status: 400 });
    }

    let deleteResult;
    if (id) {
      deleteResult = await queryDb(
        `DELETE FROM website_awards WHERE id = $1 AND website_id = $2 RETURNING id, title`,
        [id, auth.website.id]
      );
    } else {
      deleteResult = await queryDb(
        `DELETE FROM website_awards WHERE slug = $1 AND website_id = $2 RETURNING id, title`,
        [slug, auth.website.id]
      );
    }

    if (deleteResult.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Award not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Award "${deleteResult.rows[0].title}" deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting award:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
