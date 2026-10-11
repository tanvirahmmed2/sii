import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyExamAccess } from 'src/lib/middleware/exam_auth.js';

export async function GET(request, context) {
  try {
    const auth = await verifyExamAccess(request, context, 'view');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE website_id = $1';
    const params = [auth.website.id];

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (grade_name ILIKE $${params.length} OR comment ILIKE $${params.length})`;
    }

    if (status && status !== 'all') {
      params.push(status);
      whereClause += ` AND status = $${params.length}`;
    }

    const countRes = await queryDb(
      `SELECT COUNT(*)::int AS total FROM website_exam_grades ${whereClause}`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    const dataRes = await queryDb(
      `SELECT * FROM website_exam_grades 
       ${whereClause} 
       ORDER BY point_numeric DESC, mark_from DESC, id ASC 
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      success: true,
      grades: dataRes.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching exam grades:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch examination grades.' },
      { status: 500 }
    );
  }
}

export async function POST(request, context) {
  try {
    const auth = await verifyExamAccess(request, context, 'create');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const {
      grade_name,
      point_numeric,
      mark_from,
      mark_to,
      comment = '',
      status = 'active'
    } = body;

    if (!grade_name?.trim() || point_numeric === undefined || mark_from === undefined || mark_to === undefined) {
      return NextResponse.json(
        { success: false, error: 'Grade name, point numeric, mark from, and mark to are required.' },
        { status: 400 }
      );
    }

    const insertRes = await queryDb(
      `INSERT INTO website_exam_grades (
        website_id, grade_name, point_numeric, mark_from, mark_to, comment, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (website_id, grade_name) DO UPDATE 
        SET point_numeric = EXCLUDED.point_numeric,
            mark_from = EXCLUDED.mark_from,
            mark_to = EXCLUDED.mark_to,
            comment = EXCLUDED.comment,
            status = EXCLUDED.status,
            updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        auth.website.id,
        grade_name.trim().toUpperCase(),
        parseFloat(point_numeric),
        parseFloat(mark_from),
        parseFloat(mark_to),
        comment?.trim() || null,
        status
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Grade saved successfully.',
      grade: insertRes.rows[0]
    });
  } catch (error) {
    console.error('Error creating exam grade:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create exam grade.' },
      { status: 500 }
    );
  }
}

export async function PUT(request, context) {
  try {
    const auth = await verifyExamAccess(request, context, 'edit');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { id, grade_name, point_numeric, mark_from, mark_to, comment, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Grade ID is required.' }, { status: 400 });
    }

    const updateRes = await queryDb(
      `UPDATE website_exam_grades
       SET grade_name = COALESCE($3, grade_name),
           point_numeric = COALESCE($4, point_numeric),
           mark_from = COALESCE($5, mark_from),
           mark_to = COALESCE($6, mark_to),
           comment = COALESCE($7, comment),
           status = COALESCE($8, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND website_id = $2
       RETURNING *`,
      [
        id,
        auth.website.id,
        grade_name ? grade_name.trim().toUpperCase() : null,
        point_numeric !== undefined ? parseFloat(point_numeric) : null,
        mark_from !== undefined ? parseFloat(mark_from) : null,
        mark_to !== undefined ? parseFloat(mark_to) : null,
        comment !== undefined ? comment?.trim() : null,
        status || null
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Grade not found or forbidden.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Grade updated successfully.',
      grade: updateRes.rows[0]
    });
  } catch (error) {
    console.error('Error updating exam grade:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update exam grade.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const auth = await verifyExamAccess(request, context, 'delete');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Grade ID is required.' }, { status: 400 });
    }

    const deleteRes = await queryDb(
      `DELETE FROM website_exam_grades WHERE id = $1 AND website_id = $2 RETURNING id`,
      [id, auth.website.id]
    );

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Grade not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Grade deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting exam grade:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete exam grade.' },
      { status: 500 }
    );
  }
}
