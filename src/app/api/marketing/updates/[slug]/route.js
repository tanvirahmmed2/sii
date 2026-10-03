import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';

export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ success: false, error: 'Slug parameter is required.' }, { status: 400 });
    }

    const cleanSlug = decodeURIComponent(slug || '').trim();

    const res = await queryDb(
      `SELECT id, version, title, description, changelog, release_date, slug, is_published, created_at, updated_at 
       FROM updates 
       WHERE (slug = $1 OR id::text = $1) AND COALESCE(is_published, TRUE) = TRUE 
       LIMIT 1`,
      [cleanSlug]
    ).catch((err) => {
      console.warn('update slug query error:', err.message);
      return { rows: [] };
    });

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Update not found.' }, { status: 404 });
    }

    const current = res.rows[0];
    const recentRes = await queryDb(
      `SELECT id, version, title, slug, release_date, created_at 
       FROM updates 
       WHERE id != $1 AND COALESCE(is_published, TRUE) = TRUE 
       ORDER BY COALESCE(release_date, created_at::date) DESC, created_at DESC 
       LIMIT 3`,
      [current.id]
    ).catch(() => ({ rows: [] }));

    return NextResponse.json({
      success: true,
      update: current,
      recentUpdates: recentRes.rows || [],
    });
  } catch (error) {
    console.error('Public update by slug GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
