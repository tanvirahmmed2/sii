import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';

// ============================================================================
// GET: Public list of published careers
// ============================================================================
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department') || '';
    const jobType = searchParams.get('job_type') || '';
    const workplaceType = searchParams.get('workplace_type') || '';
    const search = searchParams.get('search') || '';

    const conditions = ['is_published = TRUE'];
    const params = [];

    if (department && department !== 'All') {
      params.push(department);
      conditions.push(`department = $${params.length}`);
    }

    if (jobType && jobType !== 'All') {
      params.push(jobType);
      conditions.push(`job_type = $${params.length}`);
    }

    if (workplaceType && workplaceType !== 'All') {
      params.push(workplaceType);
      conditions.push(`workplace_type = $${params.length}`);
    }

    if (search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const idx = params.length;
      conditions.push(`(
        LOWER(title) LIKE $${idx} OR 
        LOWER(department) LIKE $${idx} OR 
        LOWER(location) LIKE $${idx} OR 
        LOWER(description) LIKE $${idx}
      )`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
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
        is_featured,
        created_at
      FROM career
      ${whereClause}
      ORDER BY is_featured DESC, created_at DESC
    `;

    const res = await queryDb(query, params);

    // Get distinct active departments for filter pills
    const deptRes = await queryDb(
      `SELECT DISTINCT department FROM career WHERE is_published = TRUE ORDER BY department ASC`
    );
    const departments = deptRes.rows.map((r) => r.department);

    return NextResponse.json({
      success: true,
      careers: res.rows,
      departments,
      total: res.rows.length,
    });
  } catch (error) {
    console.error('Public careers GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch careers.' },
      { status: 500 }
    );
  }
}
