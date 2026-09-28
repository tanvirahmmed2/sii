import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';

// ============================================================================
// GET: Public list of video tutorials for platform users / home page
// ============================================================================
export async function GET() {
  try {
    const res = await queryDb(`
      SELECT 
        t.id,
        t.title,
        t.description,
        t.youtube_link,
        t.created_at,
        d.name AS author_name
      FROM tutorials t
      LEFT JOIN developers d ON t.created_by_developer_id = d.id
      ORDER BY t.created_at DESC
    `);

    return NextResponse.json({
      success: true,
      tutorials: res.rows,
    });
  } catch (error) {
    console.error('Public tutorials GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
