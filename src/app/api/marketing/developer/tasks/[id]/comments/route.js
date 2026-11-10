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

    return NextResponse.json({ success: true, comments: commentsRes.rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'tasks');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const currentStaff = auth.developer || auth.user || auth.staff;
    const currentStaffId = currentStaff?.id;
    const { id } = await params;
    const body = await request.json();
    const { comment } = body;

    if (!comment || !comment.trim()) {
      return NextResponse.json({ success: false, error: 'Comment text is required.' }, { status: 400 });
    }

    const taskCheck = await queryDb('SELECT id FROM developer_tasks WHERE id = $1', [id]).catch(() => ({ rows: [] }));
    if (taskCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Task not found.' }, { status: 404 });
    }

    const commentRes = await queryDb(
      `INSERT INTO task_comments (task_id, developer_id, comment)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, currentStaffId, comment.trim()]
    );

    return NextResponse.json({
      success: true,
      comment: {
        ...commentRes.rows[0],
        author_name: currentStaff?.name,
        author_email: currentStaff?.email,
        author_role: currentStaff?.role,
      },
      message: 'Comment posted successfully.',
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'tasks');
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.message || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const currentStaff = auth.developer || auth.user || auth.staff;
    const currentStaffId = currentStaff?.id;
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('comment_id');

    if (!commentId) {
      return NextResponse.json({ success: false, error: 'Comment ID is required.' }, { status: 400 });
    }

    const commRes = await queryDb('SELECT * FROM task_comments WHERE id = $1', [commentId]).catch(() => ({ rows: [] }));
    if (commRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Comment not found.' }, { status: 404 });
    }

    const comm = commRes.rows[0];
    const perms = Array.isArray(currentStaff?.permissions) ? currentStaff.permissions : [];
    const isOwner = Number(currentStaff?.id) === 1 || String(currentStaff?.email).toLowerCase() === 'tanvir004006@gmail.com' || perms.includes('*');
    const isElevated = isOwner || perms.includes('tasks');

    if (!isElevated && Number(comm.developer_id) !== Number(currentStaffId)) {
      return NextResponse.json({ success: false, error: 'Forbidden: You can only delete your own comments.' }, { status: 403 });
    }

    await queryDb('DELETE FROM task_comments WHERE id = $1', [commentId]);

    return NextResponse.json({ success: true, message: 'Comment deleted successfully.' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
