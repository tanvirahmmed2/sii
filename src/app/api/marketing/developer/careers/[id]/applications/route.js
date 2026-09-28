import { NextResponse } from 'next/server';
import { hasModulePermission } from '@/lib/middleware/developer';
import { queryDb } from '@/lib/db/pg';

// ============================================================================
// GET: Fetch candidate applications for a specific career post
// ============================================================================
export async function GET(request, context) {
  try {
    const auth = await hasModulePermission(request, 'careers');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Unauthorized.' },
        { status: auth.status || 401 }
      );
    }

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';

    // Verify career exists
    const careerRes = await queryDb(
      `SELECT id, title, department, job_type, location, is_published FROM career WHERE id = $1`,
      [id]
    );

    if (careerRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Job posting not found.' },
        { status: 404 }
      );
    }

    const conditions = ['ca.career_id = $1'];
    const params = [id];

    if (status && status !== 'ALL') {
      params.push(status);
      conditions.push(`ca.status = $${params.length}`);
    }

    if (search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const idx = params.length;
      conditions.push(`(
        LOWER(ca.applicant_name) LIKE $${idx} OR 
        LOWER(ca.applicant_email) LIKE $${idx} OR 
        LOWER(ca.applicant_phone) LIKE $${idx}
      )`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const query = `
      SELECT 
        ca.*,
        rd.name AS reviewer_name,
        rd.email AS reviewer_email
      FROM career_application ca
      LEFT JOIN developers rd ON ca.reviewed_by_developer_id = rd.id
      ${whereClause}
      ORDER BY ca.created_at DESC
    `;

    const res = await queryDb(query, params);

    // Also get breakdown of counts for this specific career
    const countsRes = await queryDb(
      `
      SELECT 
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'REVIEWING')::int AS reviewing,
        COUNT(*) FILTER (WHERE status = 'SHORTLISTED')::int AS shortlisted,
        COUNT(*) FILTER (WHERE status = 'INTERVIEW')::int AS interview,
        COUNT(*) FILTER (WHERE status = 'HIRED')::int AS hired,
        COUNT(*) FILTER (WHERE status = 'REJECTED')::int AS rejected
      FROM career_application
      WHERE career_id = $1
      `,
      [id]
    );

    return NextResponse.json({
      success: true,
      career: careerRes.rows[0],
      applications: res.rows,
      counts: countsRes.rows[0] || {},
    });
  } catch (error) {
    console.error('Developer job applications GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
