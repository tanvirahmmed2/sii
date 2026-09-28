import { NextResponse } from 'next/server';
import { hasModulePermission } from '@/lib/middleware/developer';
import { queryDb } from '@/lib/db/pg';

function generateSlug(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============================================================================
// GET: List all careers with application metrics for developer panel
// ============================================================================
export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'careers');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Unauthorized: Careers permission required.' },
        { status: auth.status || 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || ''; // 'active', 'draft', or ''

    const conditions = [];
    const params = [];

    if (status === 'active') {
      conditions.push('c.is_published = TRUE');
    } else if (status === 'draft') {
      conditions.push('c.is_published = FALSE');
    }

    if (search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const idx = params.length;
      conditions.push(`(
        LOWER(c.title) LIKE $${idx} OR 
        LOWER(c.department) LIKE $${idx} OR 
        LOWER(c.location) LIKE $${idx}
      )`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        c.*,
        d.name AS creator_name,
        d.email AS creator_email,
        COUNT(ca.id)::int AS total_applications,
        COUNT(ca.id) FILTER (WHERE ca.status = 'PENDING')::int AS pending_applications,
        COUNT(ca.id) FILTER (WHERE ca.status = 'REVIEWING')::int AS reviewing_applications,
        COUNT(ca.id) FILTER (WHERE ca.status = 'SHORTLISTED')::int AS shortlisted_applications,
        COUNT(ca.id) FILTER (WHERE ca.status = 'INTERVIEW')::int AS interview_applications,
        COUNT(ca.id) FILTER (WHERE ca.status = 'HIRED')::int AS hired_applications,
        COUNT(ca.id) FILTER (WHERE ca.status = 'REJECTED')::int AS rejected_applications
      FROM career c
      LEFT JOIN developers d ON c.created_by_developer_id = d.id
      LEFT JOIN career_application ca ON c.id = ca.career_id
      ${whereClause}
      GROUP BY c.id, d.name, d.email
      ORDER BY c.created_at DESC
    `;

    const res = await queryDb(query, params);

    // Global stats
    const statsRes = await queryDb(`
      SELECT 
        (SELECT COUNT(*)::int FROM career) AS total_jobs,
        (SELECT COUNT(*)::int FROM career WHERE is_published = TRUE) AS active_jobs,
        (SELECT COUNT(*)::int FROM career_application) AS total_applications,
        (SELECT COUNT(*)::int FROM career_application WHERE status = 'PENDING') AS pending_applications
    `);

    return NextResponse.json({
      success: true,
      careers: res.rows,
      stats: statsRes.rows[0] || {
        total_jobs: 0,
        active_jobs: 0,
        total_applications: 0,
        pending_applications: 0,
      },
      canManage: true,
    });
  } catch (error) {
    console.error('Developer careers GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// POST: Create a new career job post
// ============================================================================
export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'careers');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Forbidden: Careers permission required.' },
        { status: auth.status || 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      department,
      job_type = 'FULL_TIME',
      workplace_type = 'REMOTE',
      location = 'Remote',
      experience_level = 'MID_LEVEL',
      salary_range = '',
      description,
      requirements = '',
      responsibilities = '',
      benefits = '',
      deadline = null,
      is_published = true,
      is_featured = false,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: 'Job title is required.' },
        { status: 400 }
      );
    }

    if (!department || !department.trim()) {
      return NextResponse.json(
        { success: false, error: 'Department is required.' },
        { status: 400 }
      );
    }

    if (!description || !description.trim()) {
      return NextResponse.json(
        { success: false, error: 'Job description is required.' },
        { status: 400 }
      );
    }

    // Generate unique slug
    let baseSlug = body.slug ? generateSlug(body.slug) : generateSlug(title);
    if (!baseSlug) baseSlug = 'job-opening';

    let finalSlug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await queryDb(`SELECT id FROM career WHERE slug = $1 LIMIT 1`, [finalSlug]);
      if (existing.rows.length === 0) break;
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const developerId = auth.staff?.id || null;

    const insertRes = await queryDb(
      `
      INSERT INTO career (
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
        created_by_developer_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
      `,
      [
        title.trim(),
        finalSlug,
        department.trim(),
        job_type,
        workplace_type,
        location.trim() || 'Remote',
        experience_level,
        salary_range?.trim() || null,
        description.trim(),
        requirements?.trim() || null,
        responsibilities?.trim() || null,
        benefits?.trim() || null,
        deadline ? new Date(deadline) : null,
        Boolean(is_published),
        Boolean(is_featured),
        developerId,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Job posting created successfully!',
        career: insertRes.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Developer career POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
