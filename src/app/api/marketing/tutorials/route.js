import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';

// ============================================================================
// GET: Public list of published video tutorials
// ============================================================================
export async function GET() {
  try {
    const res = await queryDb(`
      SELECT 
        id,
        title,
        description,
        youtube_link,
        COALESCE(is_published, true) AS is_published,
        created_at,
        updated_at
      FROM tutorials
      WHERE COALESCE(is_published, true) = TRUE
      ORDER BY created_at DESC
    `).catch((err) => {
      console.warn('Public tutorials query error:', err.message);
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
