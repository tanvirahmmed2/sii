import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';

// ============================================================================
// GET: Public details of a career post by slug
// ============================================================================
export async function GET(request, context) {
  try {
    const { slug } = await context.params;

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Job slug is required.' },
        { status: 400 }
      );
    }

    const res = await queryDb(
      `
      SELECT 
        id,
        title,
        slug,
        department,
        job_type,
        workplace_type,
        location,
        experience_level,
        salary_range,
        description,
        requirements,
        responsibilities,
        benefits,
        deadline,
        is_published,
        is_featured,
        created_at
      FROM career
      WHERE slug = $1 AND is_published = TRUE
      LIMIT 1
      `,
      [slug]
    );

    if (res.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Job post not found or has been closed.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      career: res.rows[0],
    });
  } catch (error) {
    console.error('Public career details GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch job details.' },
      { status: 500 }
    );
  }
}
