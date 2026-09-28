import { NextResponse } from 'next/server';
import { authenticateStaff } from '@/lib/middleware/developer';
import { queryDb } from '@/lib/db/pg';

// ============================================================================
// GET: Fetch comments for a specific task
// ============================================================================
export async function GET(request, { params }) {
  try {
    const auth = await authenticateStaff(request);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
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

    return NextResponse.json({ success: true, comments: commentsRes.rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// POST: Add a new comment to a task (All developers)
// ============================================================================
export async function POST(request, { params }) {
  try {
    const auth = await authenticateStaff(request);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { comment } = body;

    if (!comment || !comment.trim()) {
      return NextResponse.json({ success: false, error: 'Comment text is required.' }, { status: 400 });
    }

    // Verify task exists
    const taskCheck = await queryDb('SELECT id FROM tasks WHERE id = $1', [id]);
    if (taskCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Task not found.' }, { status: 404 });
    }

    const commentRes = await queryDb(
      `INSERT INTO task_comments (task_id, developer_id, comment)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, auth.staff.id, comment.trim()]
    );

    return NextResponse.json({
      success: true,
      comment: {
        ...commentRes.rows[0],
        author_name: auth.staff.name,
        author_email: auth.staff.email,
        author_role: auth.staff.role,
      },
      message: 'Comment posted successfully.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// DELETE: Delete a comment (Author, Manager, or Admin)
// ============================================================================
export async function DELETE(request, { params }) {
  try {
    const auth = await authenticateStaff(request);
    if (!auth.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('comment_id');

    if (!commentId) {
      return NextResponse.json({ success: false, error: 'Comment ID is required.' }, { status: 400 });
    }

    const commRes = await queryDb('SELECT * FROM task_comments WHERE id = $1', [commentId]);
    if (commRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Comment not found.' }, { status: 404 });
    }

    const comm = commRes.rows[0];
    const perms = Array.isArray(auth.staff.permissions) ? auth.staff.permissions : [];
    const isElevated = perms.includes('tasks');

    if (comm.developer_id !== auth.staff.id && !isElevated) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only delete your own comments.' },
        { status: 403 }
      );
    }

    await queryDb('DELETE FROM task_comments WHERE id = $1', [commentId]);

    return NextResponse.json({ success: true, message: 'Comment deleted successfully.' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
