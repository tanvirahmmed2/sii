import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';

// ============================================================================
// GET: Public endpoint for published blogs and blogs_image gallery
// ============================================================================
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const id = searchParams.get('id');
    const search = searchParams.get('search') || searchParams.get('q');

    let query = `
      SELECT 
        b.id,
        b.app_id,
        b.title,
        b.slug,
        b.summary,
        b.content,
        b.published_at,
        b.created_at,
        d.name AS author_name,
        a.title AS app_title,
        a.slug AS app_slug,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', bi.id,
                'image_url', bi.image_url,
                'image', COALESCE(bi.image, bi.image_url),
                'image_id', bi.image_id,
                'title', bi.title,
                'alt_text', bi.alt_text,
                'caption', bi.caption
              ) ORDER BY bi.id ASC
            )
            FROM blogs_image bi
            WHERE bi.blog_id = b.id
          ),
          '[]'::json
        ) AS images,
        (
          SELECT bi.image_url
          FROM blogs_image bi
          WHERE bi.blog_id = b.id
          ORDER BY bi.id ASC
          LIMIT 1
        ) AS cover_image
      FROM blogs b
      LEFT JOIN developers d ON b.author_id = d.id
      LEFT JOIN apps a ON b.app_id = a.id
      WHERE b.is_published = TRUE
    `;

    const params = [];
    let idx = 1;

    if (slug) {
      query += ` AND b.slug = $${idx++}`;
      params.push(slug.trim());
    } else if (id) {
      query += ` AND b.id = $${idx++}`;
      params.push(Number(id));
    }

    if (search && search.trim()) {
      query += ` AND (LOWER(b.title) LIKE $${idx} OR LOWER(COALESCE(b.summary, '')) LIKE $${idx})`;
      params.push(`%${search.trim().toLowerCase()}%`);
      idx++;
    }

    query += ` ORDER BY b.published_at DESC, b.id DESC`;

    const res = await queryDb(query, params);

    if (slug || id) {
      const blog = res.rows[0] || null;
      if (!blog) {
        return NextResponse.json({ success: false, error: 'Article not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, blog, record: blog });
    }

    return NextResponse.json({ success: true, blogs: res.rows, records: res.rows });
  } catch (error) {
    console.error('Public blogs GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
