import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';

// ============================================================================
// GET: Public list of published video tutorials
// ============================================================================
export async function GET() {
  try {

    const res = await queryDb(`
      SELECT 
        t.id,
        t.title,
        t.description,
        t.video_url,
        COALESCE(t.youtube_link, t.video_url) AS youtube_link,
        COALESCE(t.sort_order, 0) AS sort_order,
        COALESCE(t.is_published, true) AS is_published,
        t.created_at,
        d.name AS author_name
      FROM tutorials t
      LEFT JOIN developers d ON t.created_by_developer_id = d.id
      WHERE COALESCE(t.is_published, true) = TRUE
      ORDER BY COALESCE(t.sort_order, 0) ASC, t.created_at DESC
    `).catch((err) => {
      console.warn('tutorials query error:', err.message);
      return { rows: [] };
    });

    return NextResponse.json({
      success: true,
      tutorials: res.rows || [],
    });
  } catch (error) {
    console.error('Public tutorials GET error:', error);
    return NextResponse.json({ success: false, error: error.message, tutorials: [] }, { status: 500 });
  }
}
