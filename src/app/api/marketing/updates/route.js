import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';

export async function GET(request) {
  try {

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (slug) {
      const res = await queryDb(
        `SELECT id, version, title, description, release_notes, slug, created_at, updated_at 
         FROM updates 
         WHERE (slug = $1 OR id::text = $1) AND COALESCE(is_published, TRUE) = TRUE 
         LIMIT 1`,
        [slug.trim()]
      ).catch((err) => {
        console.warn('update detail query error:', err.message);
        return { rows: [] };
      });

      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Update not found' }, { status: 404 });
      }

      const current = res.rows[0];
      const recentRes = await queryDb(
        `SELECT id, version, title, slug, created_at 
         FROM updates 
         WHERE id != $1 AND COALESCE(is_published, TRUE) = TRUE 
         ORDER BY created_at DESC 
         LIMIT 3`,
        [current.id]
      ).catch(() => ({ rows: [] }));

      return NextResponse.json({
        success: true,
        update: current,
        recentUpdates: recentRes.rows || [],
      });
    }

    const res = await queryDb(
      `SELECT id, version, title, description, release_notes, slug, created_at, updated_at 
       FROM updates 
       WHERE COALESCE(is_published, TRUE) = TRUE 
       ORDER BY created_at DESC`
    ).catch((err) => {
      console.warn('updates query error:', err.message);
      return { rows: [] };
    });

    return NextResponse.json({ success: true, updates: res.rows || [] });
  } catch (error) {
    console.error('Public updates GET error:', error);
    return NextResponse.json({ success: false, error: error.message, updates: [] }, { status: 500 });
  }
}
