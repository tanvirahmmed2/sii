import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';

// ============================================================================
// GET: Public list of active policies (or single policy by slug)
// Conforms strictly to Table 20 (policies) in psql/schema.psql
// ============================================================================
export async function GET(request) {
  try {

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const search = searchParams.get('search');

    if (slug) {
      const res = await queryDb(
        `SELECT id, title, slug, description, is_active, created_at, updated_at 
         FROM policies 
         WHERE LOWER(slug) = $1 AND COALESCE(is_active, TRUE) = TRUE 
         LIMIT 1`,
        [slug.toLowerCase()]
      ).catch(() => ({ rows: [] }));

      if (res.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Policy not found.' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, policy: res.rows[0] });
    }

    const conditions = ['COALESCE(is_active, TRUE) = TRUE'];
    const params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const idx = params.length;
      conditions.push(`(LOWER(title) LIKE $${idx} OR LOWER(description) LIKE $${idx})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await queryDb(
      `SELECT id, title, slug, description, is_active, created_at, updated_at 
       FROM policies 
       ${whereClause} 
       ORDER BY id ASC`,
      params
    ).catch(() => ({ rows: [] }));

    return NextResponse.json({
      success: true,
      policies: res.rows || [],
    });
  } catch (error) {
    console.error('Public policies API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch policies.' },
      { status: 500 }
    );
  }
}
