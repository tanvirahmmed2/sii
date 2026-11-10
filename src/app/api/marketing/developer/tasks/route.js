import { NextResponse } from 'next/server';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { queryDb } from 'src/lib/database/db';

export async function GET(request) {
  try {
    const auth = await hasModulePermission(request, 'tasks');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const currentStaffId = auth.user?.id || auth.staff?.id;
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const priorityFilter = searchParams.get('priority');
    const assignedFilter = searchParams.get('assigned_to');

    const conditions = [];
    const values = [];
    let idx = 1;

    if (statusFilter && statusFilter !== 'ALL') {
      conditions.push(`LOWER(dt.status) = LOWER($${idx++})`);
      values.push(statusFilter);
    }
    if (priorityFilter && priorityFilter !== 'ALL') {
      conditions.push(`LOWER(dt.priority) = LOWER($${idx++})`);
      values.push(priorityFilter);
    }
    if (assignedFilter === 'me') {
      conditions.push(`(dt.developer_id = $${idx} OR dt.assigned_to_developer_id = $${idx})`);
      idx++;
      values.push(currentStaffId);
    } else if (assignedFilter && assignedFilter !== 'ALL') {
      conditions.push(`(dt.developer_id = $${idx} OR dt.assigned_to_developer_id = $${idx})`);
      idx++;
      values.push(Number(assignedFilter));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const tasksRes = await queryDb(`
      SELECT 
        dt.id,
        dt.title,
        dt.description,
        dt.priority,
        dt.status,
        dt.due_date,
        dt.completed_at,
        dt.created_at,
        dt.updated_at,
        COALESCE(dt.assigned_to_developer_id, dt.developer_id) AS assigned_to_developer_id,
        dt.developer_id,
        d.name AS assignee_name,
        d.email AS assignee_email,
        'developer' AS assignee_role,
        creator.name AS creator_name,
        (SELECT COUNT(*)::int FROM task_comments tc WHERE tc.task_id = dt.id) AS comments_count
      FROM developer_tasks dt
      LEFT JOIN developers d ON COALESCE(dt.assigned_to_developer_id, dt.developer_id) = d.id
      LEFT JOIN developers creator ON dt.created_by_developer_id = creator.id
      ${whereClause}
      ORDER BY 
        CASE LOWER(dt.priority)
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
          ELSE 5 
        END,
        dt.created_at DESC
    `, values).catch(() => ({ rows: [] }));

    const devsRes = await queryDb(`
      SELECT d.id, d.name, d.email, d.role_id, COALESCE(r.name, 'Developer') AS role_name 
      FROM developers d 
      LEFT JOIN developer_roles r ON d.role_id = r.id
      WHERE d.is_active = TRUE 
      ORDER BY d.name ASC
    `).catch(() => ({ rows: [] }));

    const currentStaff = auth.user || auth.staff;
    const perms = Array.isArray(currentStaff?.permissions) ? currentStaff.permissions : [];
    const isOwner = Number(currentStaff?.id) === 1 || String(currentStaff?.email).toLowerCase() === 'tanvir004006@gmail.com' || perms.includes('*');
    const canManage = isOwner || perms.includes('tasks');

    return NextResponse.json({
      success: true,
      tasks: tasksRes.rows || [],
      developers: devsRes.rows.map((d) => ({ ...d, role: d.role_name })),
      canManage,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

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
    const { title, description, status = 'todo', priority = 'medium', assigned_to_developer_id, developer_id, due_date } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: 'Task title is required.' }, { status: 400 });
    }

    const currentStaffId = auth.user?.id || auth.staff?.id;
    const targetDevId = assigned_to_developer_id || developer_id || currentStaffId;

    const normPriority = (priority || 'medium').toLowerCase();
    const normStatus = (status || 'todo').toLowerCase();

    const taskRes = await queryDb(
      `INSERT INTO developer_tasks (title, description, status, priority, developer_id, assigned_to_developer_id, created_by_developer_id, due_date)
       VALUES ($1, $2, $3, $4, $5, $5, $6, $7)
       RETURNING *, developer_id AS assigned_to_developer_id`,
      [
        title.trim(),
        description || null,
        normStatus,
        normPriority,
        targetDevId,
        currentStaffId,
        due_date ? new Date(due_date) : null,
      ]
    );

    return NextResponse.json({
      success: true,
      task: taskRes.rows[0],
      message: 'Task created successfully.',
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const PATCH = PUT;
export async function PUT(request) {
  return NextResponse.json({ success: false, error: 'Use /api/marketing/developer/tasks/[id]' }, { status: 405 });
}
