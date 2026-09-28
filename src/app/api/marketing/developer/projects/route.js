import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';
import { hasModulePermission } from '@/lib/middleware/developer';

/**
 * GET /api/developer/projects
 * List all creator custom projects with filters, search, and metrics.
 */
export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'projects');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || searchParams.get('q') || '').trim().toLowerCase();
    const workingStatus = (searchParams.get('working_status') || searchParams.get('status') || '').trim().toUpperCase();
    const paymentStatus = (searchParams.get('payment_status') || '').trim().toUpperCase();
    const category = (searchParams.get('category') || '').trim();

    let querySql = `
      SELECT 
        p.*,
        c.name AS creator_name,
        c.email AS creator_email,
        c.phone AS creator_phone,
        d.name AS assigned_developer_name,
        d.email AS assigned_developer_email,
        COALESCE(dr.name, 'Developer') AS assigned_developer_role,
        (SELECT COUNT(*)::int FROM project_messages WHERE project_id = p.id) AS message_count,
        (
          SELECT message FROM project_messages 
          WHERE project_id = p.id 
          ORDER BY created_at DESC LIMIT 1
        ) AS latest_message,
        (
          SELECT created_at FROM project_messages 
          WHERE project_id = p.id 
          ORDER BY created_at DESC LIMIT 1
        ) AS latest_message_at
      FROM project p
      LEFT JOIN creators c ON p.creator_id = c.id
      LEFT JOIN developers d ON p.assigned_developer_id = d.id
      LEFT JOIN roles dr ON d.role_id = dr.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      querySql += ` AND (
        LOWER(p.title) LIKE $${params.length} 
        OR LOWER(p.project_number) LIKE $${params.length} 
        OR LOWER(p.description) LIKE $${params.length}
        OR LOWER(COALESCE(c.name, '')) LIKE $${params.length}
        OR LOWER(COALESCE(c.email, '')) LIKE $${params.length}
      )`;
    }

    if (workingStatus && workingStatus !== 'ALL') {
      params.push(workingStatus);
      querySql += ` AND p.working_status = $${params.length}`;
    }

    if (paymentStatus && paymentStatus !== 'ALL') {
      params.push(paymentStatus);
      querySql += ` AND p.payment_status = $${params.length}`;
    }

    if (category && category !== 'ALL') {
      params.push(category);
      querySql += ` AND p.category = $${params.length}`;
    }

    querySql += ` ORDER BY p.updated_at DESC, p.id DESC`;

    const res = await queryDb(querySql, params);

    // Calculate metrics
    const statsRes = await queryDb(`
      SELECT 
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE working_status = 'PENDING_REVIEW')::int AS pending_review,
        COUNT(*) FILTER (WHERE working_status IN ('ACCEPTED', 'IN_PROGRESS', 'UNDER_REVIEW'))::int AS in_progress,
        COUNT(*) FILTER (WHERE working_status = 'COMPLETED')::int AS completed,
        COUNT(*) FILTER (WHERE payment_status = 'PENDING_QUOTE')::int AS pending_quote,
        COUNT(*) FILTER (WHERE payment_status IN ('UNPAID', 'PARTIAL'))::int AS unpaid,
        COUNT(*) FILTER (WHERE payment_status = 'PAID')::int AS paid,
        COALESCE(SUM(budget_in_cents), 0)::bigint AS total_budget_cents,
        COALESCE(SUM(paid_amount_in_cents), 0)::bigint AS total_paid_cents
      FROM project;
    `);

    return NextResponse.json({
      success: true,
      records: res.rows,
      projects: res.rows,
      stats: statsRes.rows[0] || {
        total: 0,
        pending_review: 0,
        in_progress: 0,
        completed: 0,
        pending_quote: 0,
        unpaid: 0,
        paid: 0,
      },
    });
  } catch (error) {
    console.error('Error fetching developer projects:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/developer/projects
 * Action router for batch updates or admin-initiated projects.
 */
export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'projects');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const { action } = body;

    // Fast status batch update or creation if needed
    if (action === 'batch_status') {
      const { projectIds = [], workingStatus } = body;
      if (!Array.isArray(projectIds) || projectIds.length === 0 || !workingStatus) {
        return NextResponse.json({ success: false, error: 'projectIds array and workingStatus are required.' }, { status: 400 });
      }
      await queryDb(
        `UPDATE project SET working_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($2::int[])`,
        [workingStatus, projectIds]
      );
      return NextResponse.json({ success: true, message: 'Status updated for selected projects.' });
    }

    return NextResponse.json({ success: false, error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('Error in developer projects POST API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
