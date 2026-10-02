import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';

/**
 * API Route: /api/creator/updates
 * Dedicated to the `updates` table.
 */

export async function GET() {
  try {
    const res = await queryDb(
      `SELECT * FROM updates ORDER BY created_at DESC LIMIT 10`
    ).catch(() => 
      queryDb(
        `SELECT id, title, slug, excerpt, content, published_at AS created_at 
         FROM blogs 
         WHERE is_published = TRUE 
         ORDER BY published_at DESC LIMIT 10`
      )
    ).catch(() => ({ rows: [] }));
    return NextResponse.json({ success: true, updates: res.rows });
  } catch (error) {
    console.error('Updates GET API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
