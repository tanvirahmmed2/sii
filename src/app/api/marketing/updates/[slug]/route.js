import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';

export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ success: false, error: 'Slug parameter is required.' }, { status: 400 });
    }

    const res = await queryDb(
      `SELECT id, version, title, description, release_notes, slug, created_at, updated_at 
       FROM updates 
       WHERE (slug = $1 OR id::text = $1) AND COALESCE(is_published, TRUE) = TRUE 
       LIMIT 1`,
      [slug.trim()]
    ).catch((err) => {
      console.warn('update slug query error:', err.message);
      return { rows: [] };
    });

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Update not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, update: res.rows[0] });
  } catch (error) {
    console.error('Public update by slug GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
