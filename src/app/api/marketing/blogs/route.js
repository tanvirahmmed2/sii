import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';

// ============================================================================
// GET: Public endpoint for published blogs
// Conforms strictly to Table 17 (blogs) in psql/schema.psql
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
        b.developer_id,
        b.title,
        b.slug,
        b.excerpt,
        b.excerpt AS summary,
        b.content,
        b.category,
        b.meta_title,
        b.meta_description,
        b.is_published,
        b.published_at,
        b.views_count,
        b.created_at,
        b.updated_at,
        d.name AS author_name,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', bi.id,
                'image_url', bi.image,
                'image', bi.image,
                'image_id', bi.image_id,
                'caption', bi.caption,
                'is_primary', bi.is_primary,
                'display_order', bi.display_order
              ) ORDER BY bi.is_primary DESC, bi.display_order ASC, bi.id ASC
            )
            FROM blog_images bi
            WHERE bi.blog_id = b.id
          ),
          '[]'::json
        ) AS images,
        (
          SELECT bi.image
          FROM blog_images bi
          WHERE bi.blog_id = b.id
          ORDER BY bi.is_primary DESC, bi.display_order ASC, bi.id ASC
          LIMIT 1
        ) AS image,
        (
          SELECT bi.image
          FROM blog_images bi
          WHERE bi.blog_id = b.id
          ORDER BY bi.is_primary DESC, bi.display_order ASC, bi.id ASC
          LIMIT 1
        ) AS cover_image,
        (
          SELECT bi.image_id
          FROM blog_images bi
          WHERE bi.blog_id = b.id
          ORDER BY bi.is_primary DESC, bi.display_order ASC, bi.id ASC
          LIMIT 1
        ) AS image_id
      FROM blogs b
      LEFT JOIN developers d ON b.developer_id = d.id
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
      query += ` AND (LOWER(b.title) LIKE $${idx} OR LOWER(COALESCE(b.excerpt, '')) LIKE $${idx})`;
      params.push(`%${search.trim().toLowerCase()}%`);
      idx++;
    }

    query += ` ORDER BY b.published_at DESC NULLS LAST, b.id DESC`;

    const res = await queryDb(query, params).catch((err) => {
      console.error('Public blogs queryDb error:', err.message);
      return { rows: [] };
    });

    if (slug || id) {
      const blog = res.rows[0] || null;
      if (!blog) {
        return NextResponse.json({ success: false, error: 'Article not found.' }, { status: 404 });
      }

      // Increment views count safely in background
      queryDb(`UPDATE blogs SET views_count = COALESCE(views_count, 0) + 1 WHERE id = $1`, [blog.id]).catch(() => {});

      return NextResponse.json({ success: true, blog, record: blog });
    }

    return NextResponse.json({ success: true, blogs: res.rows, records: res.rows });
  } catch (error) {
    console.error('Public blogs GET error:', error);
    return NextResponse.json({ success: false, error: error.message, blogs: [] }, { status: 500 });
  }
}
