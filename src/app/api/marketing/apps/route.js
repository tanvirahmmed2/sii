import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const id = searchParams.get('id');

    let query = `
      SELECT 
        a.id,
        a.title,
        a.slug,
        a.description,
        a.short_description,
        a.is_published,
        a.created_at,
        a.updated_at,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', ai.id,
                'app_id', ai.app_id,
                'image', ai.image,
                'image_id', ai.image_id,
                'title', ai.title,
                'created_at', ai.created_at
              ) ORDER BY ai.id ASC
            )
            FROM apps_images ai
            WHERE ai.app_id = a.id
          ),
          '[]'::json
        ) AS images,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', wm.id,
                'name', wm.name,
                'slug', wm.slug,
                'description', wm.description
              ) ORDER BY wm.id ASC
            )
            FROM app_modules am
            JOIN website_modules wm ON am.website_module_id = wm.id
            WHERE am.app_id = a.id AND am.is_active = TRUE
          ),
          '[]'::json
        ) AS modules,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', t.id,
                'name', COALESCE(t.name, t.title),
                'title', COALESCE(t.title, t.name),
                'slug', t.slug,
                'preview_image', t.preview_image,
                'category', t.category,
                'is_premium', t.is_premium
              ) ORDER BY t.id ASC
            )
            FROM themes t
            WHERE t.app_id = a.id AND t.is_active = TRUE
          ),
          '[]'::json
        ) AS themes,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', p.id,
                'name', p.name,
                'slug', p.slug,
                'price_in_cents', p.price_in_cents,
                'billing_interval', p.billing_interval,
                'description', p.description
              ) ORDER BY p.price_in_cents ASC
            )
            FROM packages p
            WHERE p.app_id = a.id AND p.is_active = TRUE
          ),
          '[]'::json
        ) AS packages
      FROM apps a
      WHERE a.is_published = TRUE
    `;

    const params = [];

    if (slug) {
      query += ` AND (LOWER(a.slug) = LOWER($1) OR a.id::text = $1) LIMIT 1`;
      params.push(slug.trim());
    } else if (id) {
      query += ` AND a.id = $1 LIMIT 1`;
      params.push(Number(id));
    } else {
      query += ` ORDER BY a.id DESC`;
    }

    const res = await queryDb(query, params).catch(() => ({ rows: [] }));

    if (slug || id) {
      const record = res.rows[0] || null;
      if (!record) {
        return NextResponse.json({ success: false, error: 'Application not found or not published.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, app: record });
    }

    return NextResponse.json({ success: true, apps: res.rows || [] });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch published applications.' },
      { status: 500 }
    );
  }
}
