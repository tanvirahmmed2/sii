import { NextResponse } from 'next/server';
import { hasModulePermission } from 'src/lib/middleware/developer';
import { queryDb } from 'src/lib/database/db';

export async function GET(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'tasks');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const { id } = await params;

    const taskRes = await queryDb(`
      SELECT 
        dt.*,
        COALESCE(dt.assigned_to_developer_id, dt.developer_id) AS assigned_to_developer_id,
        d.name AS assignee_name,
        d.email AS assignee_email,
        'developer' AS assignee_role,
        creator.name AS creator_name
      FROM developer_tasks dt
      LEFT JOIN developers d ON COALESCE(dt.assigned_to_developer_id, dt.developer_id) = d.id
      LEFT JOIN developers creator ON dt.created_by_developer_id = creator.id
      WHERE dt.id = $1
    `, [id]).catch(() => ({ rows: [] }));

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
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'tasks');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const currentStaff = auth.developer || auth.user || auth.staff;
    const currentStaffId = currentStaff?.id;
    const { id } = await params;
    const body = await request.json();
    const perms = Array.isArray(currentStaff?.permissions) ? currentStaff.permissions : [];
    const isOwner = Number(currentStaff?.id) === 1 || String(currentStaff?.email).toLowerCase() === 'tanvir004006@gmail.com' || perms.includes('*');
    const isElevated = isOwner || perms.includes('tasks');

    const currentRes = await queryDb('SELECT * FROM developer_tasks WHERE id = $1', [id]).catch(() => ({ rows: [] }));
    if (currentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Task not found.' }, { status: 404 });
    }

    const currentTask = currentRes.rows[0];
    const taskAssigneeId = currentTask.developer_id || currentTask.assigned_to_developer_id;

    if (!isElevated) {
      if (Number(taskAssigneeId) !== Number(currentStaffId)) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Only managers or the assigned developer can update this task.' },
          { status: 403 }
        );
      }
      if (body.status) {
        const normStatus = body.status.toLowerCase();
        await queryDb('UPDATE developer_tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [normStatus, id]);
        return NextResponse.json({ success: true, message: 'Task status updated.' });
      }
      return NextResponse.json({ success: false, error: 'Assignees can only update task status.' }, { status: 403 });
    }

    const { title, description, status, priority, assigned_to_developer_id, developer_id, due_date } = body;
    const targetDevId = assigned_to_developer_id || developer_id;

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
      fields.push(`assigned_to_developer_id = $${idx++}`);
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

    return NextResponse.json({ success: true, message: 'Task updated successfully.' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const PATCH = PUT;

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
    await queryDb('DELETE FROM developer_tasks WHERE id = $1', [id]);

    return NextResponse.json({ success: true, message: 'Task deleted successfully.' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
