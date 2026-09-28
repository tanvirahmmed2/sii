import { NextResponse } from 'next/server';
import { hasModulePermission } from '@/lib/middleware/developer';
import { queryDb } from '@/lib/db/pg';

// ============================================================================
// GET: List tasks (All developers) + developer options for assignment
// ============================================================================
export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'tasks');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const priorityFilter = searchParams.get('priority');
    const assignedFilter = searchParams.get('assigned_to');

    const conditions = [];
    const values = [];
    let idx = 1;

    if (statusFilter && statusFilter !== 'ALL') {
      conditions.push(`t.status = $${idx++}`);
      values.push(statusFilter);
    }
    if (priorityFilter && priorityFilter !== 'ALL') {
      conditions.push(`t.priority = $${idx++}`);
      values.push(priorityFilter);
    }
    if (assignedFilter === 'me') {
      conditions.push(`t.assigned_to_developer_id = $${idx++}`);
      values.push(auth.staff.id);
    } else if (assignedFilter && assignedFilter !== 'ALL') {
      conditions.push(`t.assigned_to_developer_id = $${idx++}`);
      values.push(Number(assignedFilter));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const tasksRes = await queryDb(`
      SELECT 
        t.*,
        assignee.name AS assignee_name,
        assignee.email AS assignee_email,
        COALESCE(ar.slug, 'developer') AS assignee_role,
        creator.name AS creator_name,
        COUNT(tc.id)::int AS comments_count
      FROM tasks t
      LEFT JOIN developers assignee ON t.assigned_to_developer_id = assignee.id
      LEFT JOIN roles ar ON assignee.role_id = ar.id
      LEFT JOIN developers creator ON t.created_by_developer_id = creator.id
      LEFT JOIN task_comments tc ON t.id = tc.task_id
      ${whereClause}
      GROUP BY t.id, assignee.name, assignee.email, ar.slug, creator.name
      ORDER BY 
        CASE t.priority 
          WHEN 'URGENT' THEN 1 
          WHEN 'HIGH' THEN 2 
          WHEN 'MEDIUM' THEN 3 
          WHEN 'LOW' THEN 4 
          ELSE 5 
        END,
        t.created_at DESC
    `, values);

    // List of active developers for assignee dropdown
    const devsRes = await queryDb(`
      SELECT d.id, d.name, d.email, COALESCE(r.slug, 'developer') AS role, COALESCE(r.name, 'Developer') AS role_name 
      FROM developers d 
      LEFT JOIN roles r ON d.role_id = r.id 
      WHERE d.is_active = TRUE 
      ORDER BY d.name ASC
    `);

    const perms = Array.isArray(auth.staff.permissions) ? auth.staff.permissions : [];
    const canManage = perms.includes('tasks');

    return NextResponse.json({
      success: true,
      tasks: tasksRes.rows,
      developers: devsRes.rows,
      canManage,
    });
  } catch (error) {
    console.error('Tasks GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// POST: Create a new task
// ============================================================================
export async function POST(request) {
  try {
    const auth = await hasModulePermission(request, 'tasks');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Forbidden: Permission tasks required to create tasks.' },
        { status: auth.status || 403 }
      );
    }

    const body = await request.json();
    const { title, description, status = 'TODO', priority = 'MEDIUM', assigned_to_developer_id, due_date } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: 'Task title is required.' }, { status: 400 });
    }

    const taskRes = await queryDb(
      `INSERT INTO tasks (title, description, status, priority, assigned_to_developer_id, created_by_developer_id, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        title.trim(),
        description || null,
        status,
        priority,
        assigned_to_developer_id || null,
        auth.staff.id,
        due_date || null,
      ]
    );

    return NextResponse.json({
      success: true,
      task: taskRes.rows[0],
      message: 'Task created successfully.',
    });
  } catch (error) {
    console.error('Task POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
