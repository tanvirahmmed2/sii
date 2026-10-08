import { NextResponse } from 'next/server';
import { hasModulePermission, authenticateStaff } from 'src/lib/middleware/developer';
import { queryDb } from 'src/lib/database/db';

// ============================================================================
// GET: Single task detail with full comment stream
// ============================================================================
export async function GET(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'tasks');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const { id } = await params;

    let taskRes = await queryDb(`
      SELECT 
        dt.*,
        dt.developer_id AS assigned_to_developer_id,
        d.name AS assignee_name,
        d.email AS assignee_email,
        'developer' AS assignee_role,
        d.name AS creator_name
      FROM developer_tasks dt
      LEFT JOIN developers d ON dt.developer_id = d.id
      WHERE dt.id = $1
    `, [id]).catch(() => null);

    if (!taskRes || taskRes.rows.length === 0) {
      taskRes = await queryDb(`
        SELECT 
          t.*,
          COALESCE(t.assigned_to_developer_id, t.developer_id) AS assigned_to_developer_id,
          assignee.name AS assignee_name,
          assignee.email AS assignee_email,
          'developer' AS assignee_role,
          creator.name AS creator_name
        FROM tasks t
        LEFT JOIN developers assignee ON COALESCE(t.assigned_to_developer_id, t.developer_id) = assignee.id
        LEFT JOIN developers creator ON t.created_by_developer_id = creator.id
        WHERE t.id = $1
      `, [id]).catch(() => ({ rows: [] }));
    }

    if (taskRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Task not found.' }, { status: 404 });
    }

    const commentsRes = await queryDb(`
      SELECT 
        tc.*,
        d.name AS author_name,
        d.email AS author_email,
        'developer' AS author_role
      FROM task_comments tc
      JOIN developers d ON tc.developer_id = d.id
      WHERE tc.task_id = $1
      ORDER BY tc.created_at ASC
    `, [id]).catch(() => ({ rows: [] }));

    return NextResponse.json({
      success: true,
      task: taskRes.rows[0],
      comments: commentsRes.rows,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// PUT: Update task (Admin/Manager full edit; Assignee can update status)
// ============================================================================
export async function PUT(request, { params }) {
  try {
    const auth = await authenticateStaff(request);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const currentStaff = auth.user || auth.staff;
    const currentStaffId = currentStaff?.id;
    const { id } = await params;
    const body = await request.json();
    const perms = Array.isArray(currentStaff?.permissions) ? currentStaff.permissions : [];
    const isElevated = perms.includes('tasks') || currentStaff?.role === 'admin';

    // Verify task exists in developer_tasks or tasks
    let currentRes = await queryDb('SELECT * FROM developer_tasks WHERE id = $1', [id]).catch(() => null);
    const isDevTasksTable = Boolean(currentRes && currentRes.rows?.length > 0);

    if (!isDevTasksTable) {
      currentRes = await queryDb('SELECT * FROM tasks WHERE id = $1', [id]).catch(() => ({ rows: [] }));
    }

    if (!currentRes || currentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Task not found.' }, { status: 404 });
    }
    const currentTask = currentRes.rows[0];
    const taskAssigneeId = currentTask.developer_id || currentTask.assigned_to_developer_id;

    // If not elevated manager/admin, check if user is the assigned developer updating status
    if (!isElevated) {
      if (taskAssigneeId !== currentStaffId) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Only managers, admins, or the assigned developer can update this task.' },
          { status: 403 }
        );
      }
      if (body.status) {
        const normStatus = body.status.toLowerCase();
        if (isDevTasksTable) {
          await queryDb('UPDATE developer_tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [normStatus, id]);
        } else {
          await queryDb('UPDATE tasks SET status = $1 WHERE id = $2', [body.status, id]);
        }
        return NextResponse.json({ success: true, message: 'Task status updated.' });
      }
      return NextResponse.json({ success: false, error: 'Assignees can only update task status.' }, { status: 403 });
    }

    // Elevated full update
    const { title, description, status, priority, assigned_to_developer_id, developer_id, due_date } = body;
    const targetDevId = assigned_to_developer_id || developer_id;

    if (isDevTasksTable) {
      const fields = [];
      const values = [];
      let idx = 1;

      if (title !== undefined) {
        fields.push(`title = $${idx++}`);
        values.push(title.trim());
      }
      if (description !== undefined) {
        fields.push(`description = $${idx++}`);
        values.push(description);
      }
      if (status !== undefined) {
        fields.push(`status = $${idx++}`);
        values.push(status.toLowerCase());
      }
      if (priority !== undefined) {
        fields.push(`priority = $${idx++}`);
        values.push(priority.toLowerCase());
      }
      if (targetDevId !== undefined) {
        fields.push(`developer_id = $${idx++}`);
        values.push(targetDevId ? Number(targetDevId) : null);
      }
      if (due_date !== undefined) {
        fields.push(`due_date = $${idx++}`);
        values.push(due_date ? new Date(due_date) : null);
      }

      if (fields.length > 0) {
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        await queryDb(`UPDATE developer_tasks SET ${fields.join(', ')} WHERE id = $${idx}`, values);
      }
    } else {
      const fields = [];
      const values = [];
      let idx = 1;

      if (title !== undefined) {
        fields.push(`title = $${idx++}`);
        values.push(title.trim());
      }
      if (description !== undefined) {
        fields.push(`description = $${idx++}`);
        values.push(description);
      }
      if (status !== undefined) {
        fields.push(`status = $${idx++}`);
        values.push(status);
      }
      if (priority !== undefined) {
        fields.push(`priority = $${idx++}`);
        values.push(priority);
      }
      if (targetDevId !== undefined) {
        fields.push(`assigned_to_developer_id = $${idx++}`);
        values.push(targetDevId ? Number(targetDevId) : null);
      }
      if (due_date !== undefined) {
        fields.push(`due_date = $${idx++}`);
        values.push(due_date ? new Date(due_date) : null);
      }

      if (fields.length > 0) {
        values.push(id);
        await queryDb(`UPDATE tasks SET ${fields.join(', ')} WHERE id = $${idx}`, values);
      }
    }

    return NextResponse.json({ success: true, message: 'Task updated successfully.' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// DELETE: Delete task
// ============================================================================
export async function DELETE(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'tasks');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message || 'Forbidden: Permission tasks required to delete tasks.' },
        { status: auth.status || 403 }
      );
    }

    const { id } = await params;
    await queryDb('DELETE FROM developer_tasks WHERE id = $1', [id]).catch(async () => {
      await queryDb('DELETE FROM tasks WHERE id = $1', [id]).catch(() => {});
    });

    return NextResponse.json({ success: true, message: 'Task deleted successfully.' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
