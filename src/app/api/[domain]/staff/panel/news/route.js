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
  return base || `news-${Date.now()}`;
}

// GET: List all news articles or fetch a single article by slug
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug')?.trim();
    const search = searchParams.get('search')?.trim();
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    // Single news article by slug
    if (slug) {
      const singleRes = await queryDb(
        `SELECT 
          n.id,
          n.website_id,
          n.title,
          n.slug,
          n.summary,
          n.content,
          n.category,
          n.published_date,
          n.is_published,
          n.created_at,
          n.updated_at,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', ni.id,
                  'image_url', ni.image_url,
                  'image_id', ni.image_id,
                  'caption', ni.caption,
                  'is_cover', ni.is_cover,
                  'display_order', ni.display_order
                ) ORDER BY ni.is_cover DESC, ni.display_order ASC, ni.id ASC
              )
              FROM website_news_images ni
              WHERE ni.news_id = n.id
            ),
            '[]'::json
          ) as images
        FROM website_news n
        WHERE n.website_id = $1 AND n.slug = $2
        LIMIT 1`,
        [auth.website.id, slug]
      );

      if (singleRes.rowCount === 0) {
        return NextResponse.json({ success: false, error: 'News article not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        news: singleRes.rows[0],
      });
    }

    let query = `
      SELECT 
        n.id,
        n.website_id,
        n.title,
        n.slug,
        n.summary,
        n.content,
        n.category,
        n.published_date,
        n.is_published,
        n.created_at,
        n.updated_at,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', ni.id,
                'image_url', ni.image_url,
                'image_id', ni.image_id,
                'caption', ni.caption,
                'is_cover', ni.is_cover,
                'display_order', ni.display_order
              ) ORDER BY ni.is_cover DESC, ni.display_order ASC, ni.id ASC
            )
            FROM website_news_images ni
            WHERE ni.news_id = n.id
          ),
          '[]'::json
        ) as images
      FROM website_news n
      WHERE n.website_id = $1
    `;
    const params = [auth.website.id];

    if (status === 'published') {
      params.push(true);
      query += ` AND n.is_published = $${params.length}`;
    } else if (status === 'draft') {
      params.push(false);
      query += ` AND n.is_published = $${params.length}`;
    }

    if (category && category !== 'all') {
      params.push(category);
      query += ` AND n.category = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (n.title ILIKE $${params.length} OR n.summary ILIKE $${params.length} OR n.content ILIKE $${params.length})`;
    }

    query += ` ORDER BY n.published_date DESC, n.id DESC`;

    const result = await queryDb(query, params);

    return NextResponse.json({
      success: true,
      news: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create news article (supports demo auto-creation and server slugify)
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const isDemo = Boolean(body.is_demo);
    const title = body.title ? String(body.title).trim() : (isDemo ? 'New Campus Bulletin & Notice' : '');

    if (!title) {
      return NextResponse.json({ success: false, error: 'News headline title is required.' }, { status: 400 });
    }

    // Auto-generate unique slug via slugify on server (hidden from frontend)
    let baseSlug = slugify(title);
    let finalSlug = baseSlug;

    const slugCheck = await queryDb(
      `SELECT id FROM website_news WHERE website_id = $1 AND slug = $2 LIMIT 1`,
      [auth.website.id, finalSlug]
    );

    if (slugCheck.rowCount > 0 || isDemo) {
      finalSlug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const summary = body.summary || (isDemo ? '<p>Summary lead paragraph for this news announcement.</p>' : '');
    const content = body.content || (isDemo ? '<p>Full comprehensive story article, event highlights and quotes.</p>' : '');
    const category = body.category ? String(body.category).trim() : 'General';
    const publishedDate = body.published_date || null;
    const isPublished = body.is_published !== undefined ? Boolean(body.is_published) : (isDemo ? false : true);

    const newsResult = await queryDb(
      `INSERT INTO website_news 
        (website_id, title, slug, summary, content, category, published_date, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::DATE, CURRENT_DATE), $8)
       RETURNING *`,
      [
        auth.website.id,
        title,
        finalSlug,
        summary,
        content,
        category,
        publishedDate,
        isPublished,
      ]
    );

    const createdNews = newsResult.rows[0];

    // Insert attached images if provided
    const savedImages = [];
    if (Array.isArray(body.images) && body.images.length > 0) {
      for (let i = 0; i < body.images.length; i++) {
        const img = body.images[i];
        if (img && (img.image_url || img.url)) {
          const imgUrl = img.image_url || img.url;
          const isCover = img.is_cover !== undefined ? Boolean(img.is_cover) : (i === 0);
          const imgRes = await queryDb(
            `INSERT INTO website_news_images 
              (website_id, news_id, image_url, image_id, caption, is_cover, display_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
              auth.website.id,
              createdNews.id,
              String(imgUrl).trim(),
              img.image_id || img.publicId || null,
              img.caption || null,
              isCover,
              img.display_order !== undefined ? parseInt(img.display_order, 10) : i,
            ]
          );
          savedImages.push(imgRes.rows[0]);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: isDemo ? 'Demo news article created.' : 'News article created successfully.',
      news: {
        ...createdNews,
        images: savedImages,
      },
    });
  } catch (error) {
    console.error('Error creating news:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update news article (by ID or current slug)
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { id, current_slug, title, summary, content, category, published_date, is_published, images } = body;

    let targetNews = null;
    if (id) {
      const existing = await queryDb(
        `SELECT * FROM website_news WHERE id = $1 AND website_id = $2`,
        [id, auth.website.id]
      );
      if (existing.rowCount > 0) targetNews = existing.rows[0];
    } else if (current_slug) {
      const existing = await queryDb(
        `SELECT * FROM website_news WHERE slug = $1 AND website_id = $2`,
        [current_slug, auth.website.id]
      );
      if (existing.rowCount > 0) targetNews = existing.rows[0];
    }

    if (!targetNews) {
      return NextResponse.json({ success: false, error: 'News article not found or unauthorized.' }, { status: 404 });
    }

    const newsId = targetNews.id;
    let finalSlug = targetNews.slug;

    // If title changed, auto-slugify
    if (title && String(title).trim() !== targetNews.title) {
      const candidateSlug = slugify(title);
      const collision = await queryDb(
        `SELECT id FROM website_news WHERE website_id = $1 AND slug = $2 AND id != $3`,
        [auth.website.id, candidateSlug, newsId]
      );
      finalSlug = collision.rowCount > 0 ? `${candidateSlug}-${Math.floor(1000 + Math.random() * 9000)}` : candidateSlug;
    }

    await queryDb(
      `UPDATE website_news
       SET title = COALESCE($1, title),
           slug = $2,
           summary = COALESCE($3, summary),
           content = COALESCE($4, content),
           category = COALESCE($5, category),
           published_date = COALESCE($6::DATE, published_date),
           is_published = COALESCE($7, is_published),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND website_id = $9`,
      [
        title ? String(title).trim() : null,
        finalSlug,
        summary !== undefined ? summary : null,
        content !== undefined ? content : null,
        category !== undefined ? (category ? String(category).trim() : 'General') : null,
        published_date || null,
        is_published !== undefined ? Boolean(is_published) : null,
        newsId,
        auth.website.id,
      ]
    );

    // If new images provided to append
    if (Array.isArray(images) && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (img && (img.image_url || img.url) && !img.id) {
          await queryDb(
            `INSERT INTO website_news_images 
              (website_id, news_id, image_url, image_id, caption, is_cover, display_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              auth.website.id,
              newsId,
              String(img.image_url || img.url).trim(),
              img.image_id || img.publicId || null,
              img.caption || null,
              Boolean(img.is_cover),
              img.display_order !== undefined ? parseInt(img.display_order, 10) : i,
            ]
          );
        }
      }
    }

    // Refreshed record with images
    const fullNews = await queryDb(
      `SELECT 
        n.id, n.website_id, n.title, n.slug, n.summary, n.content, n.category, n.published_date, n.is_published, n.created_at, n.updated_at,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', ni.id,
                'image_url', ni.image_url,
                'image_id', ni.image_id,
                'caption', ni.caption,
                'is_cover', ni.is_cover,
                'display_order', ni.display_order
              ) ORDER BY ni.is_cover DESC, ni.display_order ASC, ni.id ASC
            )
            FROM website_news_images ni
            WHERE ni.news_id = n.id
          ),
          '[]'::json
        ) as images
       FROM website_news n
       WHERE n.id = $1 AND n.website_id = $2`,
      [newsId, auth.website.id]
    );

    return NextResponse.json({
      success: true,
      message: 'News article updated successfully.',
      news: fullNews.rows[0],
    });
  } catch (error) {
    console.error('Error updating news:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete news article
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
      return NextResponse.json({ success: false, error: 'News article ID or slug required for deletion.' }, { status: 400 });
    }

    let deleteResult;
    if (id) {
      deleteResult = await queryDb(
        `DELETE FROM website_news WHERE id = $1 AND website_id = $2 RETURNING id, title`,
        [id, auth.website.id]
      );
    } else {
      deleteResult = await queryDb(
        `DELETE FROM website_news WHERE slug = $1 AND website_id = $2 RETURNING id, title`,
        [slug, auth.website.id]
      );
    }

    if (deleteResult.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'News article not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `News article "${deleteResult.rows[0].title}" deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting news:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
