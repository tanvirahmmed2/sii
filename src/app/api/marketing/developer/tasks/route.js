import { NextResponse } from 'next/server';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { queryDb } from 'src/lib/database/db';

// ============================================================================
// GET: List tasks (All developers) + developer options for assignment
// ============================================================================
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
      conditions.push(`LOWER(t.status) = LOWER($${idx++})`);
      values.push(statusFilter);
    }
    if (priorityFilter && priorityFilter !== 'ALL') {
      conditions.push(`LOWER(t.priority) = LOWER($${idx++})`);
      values.push(priorityFilter);
    }
    if (assignedFilter === 'me') {
      conditions.push(`(t.developer_id = $${idx} OR t.assigned_to_developer_id = $${idx})`);
      idx++;
      values.push(currentStaffId);
    } else if (assignedFilter && assignedFilter !== 'ALL') {
      conditions.push(`(t.developer_id = $${idx} OR t.assigned_to_developer_id = $${idx})`);
      idx++;
      values.push(Number(assignedFilter));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Try developer_tasks from schema.psql first, fallback to tasks
    let tasksRes = await queryDb(`
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
        dt.developer_id AS assigned_to_developer_id,
        dt.developer_id,
        d.name AS assignee_name,
        d.email AS assignee_email,
        'developer' AS assignee_role,
        d.name AS creator_name,
        0 AS comments_count
      FROM developer_tasks dt
      LEFT JOIN developers d ON dt.developer_id = d.id
      ${whereClause ? whereClause.replace(/\bt\./g, 'dt.') : ''}
      ORDER BY 
        CASE LOWER(dt.priority)
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
          ELSE 5 
        END,
        dt.created_at DESC
    `, values).catch(() => null);

    if (!tasksRes || !tasksRes.rows) {
      tasksRes = await queryDb(`
        SELECT 
          t.*,
          COALESCE(t.assigned_to_developer_id, t.developer_id) AS assigned_to_developer_id,
          assignee.name AS assignee_name,
          assignee.email AS assignee_email,
          'developer' AS assignee_role,
          creator.name AS creator_name,
          0 AS comments_count
        FROM tasks t
        LEFT JOIN developers assignee ON COALESCE(t.assigned_to_developer_id, t.developer_id) = assignee.id
        LEFT JOIN developers creator ON t.created_by_developer_id = creator.id
        ${whereClause}
        ORDER BY t.created_at DESC
      `, values).catch(() => ({ rows: [] }));
    }

    // List of active developers for assignee dropdown
    const devsRes = await queryDb(`
      SELECT d.id, d.name, d.email, 'developer' AS role, COALESCE(d.designation, 'Developer') AS role_name 
      FROM developers d 
      WHERE d.is_active = TRUE 
      ORDER BY d.name ASC
    `).catch(() => ({ rows: [] }));

    const currentStaff = auth.user || auth.staff;
    const perms = Array.isArray(currentStaff?.permissions) ? currentStaff.permissions : [];
    const canManage = perms.includes('tasks') || currentStaff?.role === 'admin';

    return NextResponse.json({
      success: true,
      tasks: tasksRes.rows || [],
      developers: devsRes.rows || [],
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
    const { title, description, status = 'todo', priority = 'medium', assigned_to_developer_id, developer_id, due_date } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: 'Task title is required.' }, { status: 400 });
    }

    const currentStaffId = auth.user?.id || auth.staff?.id;
    const targetDevId = assigned_to_developer_id || developer_id || currentStaffId;

    const normPriority = (priority || 'medium').toLowerCase();
    const normStatus = (status || 'todo').toLowerCase();

    // Try inserting into developer_tasks first
    let taskRes = await queryDb(
      `INSERT INTO developer_tasks (title, description, status, priority, developer_id, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *, developer_id AS assigned_to_developer_id`,
      [
        title.trim(),
        description || null,
        normStatus,
        normPriority,
        targetDevId,
        due_date ? new Date(due_date) : null,
      ]
    ).catch(async () => {
      // Fallback to tasks table if developer_tasks not present
      return await queryDb(
        `INSERT INTO tasks (title, description, status, priority, assigned_to_developer_id, created_by_developer_id, due_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          title.trim(),
          description || null,
          status,
          priority,
          targetDevId,
          currentStaffId,
          due_date || null,
        ]
      ).catch(() => ({ rows: [] }));
    });

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
