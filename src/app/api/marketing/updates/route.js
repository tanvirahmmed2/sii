import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (slug) {
      const res = await queryDb(
        'SELECT id, title, description, slug, created_at, updated_at FROM updates WHERE slug = $1 LIMIT 1',
        [slug]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Update not found' }, { status: 404 });
      }

      const current = res.rows[0];
      const recentRes = await queryDb(
        'SELECT id, title, slug, created_at FROM updates WHERE id != $1 ORDER BY created_at DESC LIMIT 3',
        [current.id]
      ).catch(() => ({ rows: [] }));

      return NextResponse.json({
        success: true,
        update: current,
        recentUpdates: recentRes.rows || [],
      });
    }

    const res = await queryDb(
      'SELECT id, title, description, slug, created_at FROM updates ORDER BY created_at DESC'
    );
    return NextResponse.json({ success: true, updates: res.rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
