import { NextResponse } from 'next/server';
import { hasModulePermission } from '@/lib/middleware/developer';
import { queryDb } from '@/lib/db/pg';

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

    const taskRes = await queryDb(`
      SELECT 
        t.*,
        assignee.name AS assignee_name,
        assignee.email AS assignee_email,
        COALESCE(ar.slug, 'developer') AS assignee_role,
        creator.name AS creator_name
      FROM tasks t
      LEFT JOIN developers assignee ON t.assigned_to_developer_id = assignee.id
      LEFT JOIN roles ar ON assignee.role_id = ar.id
      LEFT JOIN developers creator ON t.created_by_developer_id = creator.id
      WHERE t.id = $1
    `, [id]);

    if (taskRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Task not found.' }, { status: 404 });
    }

    const commentsRes = await queryDb(`
      SELECT 
        tc.*,
        d.name AS author_name,
        d.email AS author_email,
        COALESCE(r.slug, 'developer') AS author_role
      FROM task_comments tc
      JOIN developers d ON tc.developer_id = d.id
      LEFT JOIN roles r ON d.role_id = r.id
      WHERE tc.task_id = $1
      ORDER BY tc.created_at ASC
    `, [id]);

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

    const { id } = await params;
    const body = await request.json();
    const perms = Array.isArray(auth.staff.permissions) ? auth.staff.permissions : [];
    const isElevated = perms.includes('tasks');

    // Verify task exists
    const currentRes = await queryDb('SELECT * FROM tasks WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Task not found.' }, { status: 404 });
    }
    const currentTask = currentRes.rows[0];

    // If not admin/manager, check if user is the assigned developer updating status
    if (!isElevated) {
      if (currentTask.assigned_to_developer_id !== auth.staff.id) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Only managers, admins, or the assigned developer can update this task.' },
          { status: 403 }
        );
      }
      // Assignee is only allowed to update status
      if (body.status) {
        await queryDb('UPDATE tasks SET status = $1 WHERE id = $2', [body.status, id]);
        return NextResponse.json({ success: true, message: 'Task status updated.' });
      }
      return NextResponse.json({ success: false, error: 'Assignees can only update task status.' }, { status: 403 });
    }

    // Elevated (Manager or Admin) full update
    const { title, description, status, priority, assigned_to_developer_id, due_date } = body;

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
    if (assigned_to_developer_id !== undefined) {
      fields.push(`assigned_to_developer_id = $${idx++}`);
      values.push(assigned_to_developer_id ? Number(assigned_to_developer_id) : null);
    }
    if (due_date !== undefined) {
      fields.push(`due_date = $${idx++}`);
      values.push(due_date ? new Date(due_date) : null);
    }

    if (fields.length > 0) {
      values.push(id);
      await queryDb(`UPDATE tasks SET ${fields.join(', ')} WHERE id = $${idx}`, values);
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
    await queryDb('DELETE FROM tasks WHERE id = $1', [id]);

    return NextResponse.json({ success: true, message: 'Task deleted successfully.' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
