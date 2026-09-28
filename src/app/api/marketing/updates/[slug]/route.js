import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';

export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ success: false, error: 'Slug parameter is required.' }, { status: 400 });
    }

    const res = await queryDb('SELECT id, title, description, slug, created_at, updated_at FROM updates WHERE slug = $1 LIMIT 1', [slug]);

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Update not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, update: res.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
