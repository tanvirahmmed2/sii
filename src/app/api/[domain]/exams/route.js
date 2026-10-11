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
    const classId = searchParams.get('class_id');
    const sessionId = searchParams.get('session_id');
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE e.website_id = $1';
    const params = [auth.website.id];

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (e.name ILIKE $${params.length} OR e.term ILIKE $${params.length})`;
    }

    if (classId && classId !== 'all') {
      params.push(classId);
      whereClause += ` AND e.class_id = $${params.length}`;
    }

    if (sessionId && sessionId !== 'all') {
      params.push(sessionId);
      whereClause += ` AND e.session_id = $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      whereClause += ` AND e.status = $${params.length}`;
    }

    // Total count query
    const countRes = await queryDb(
      `SELECT COUNT(*)::int AS total FROM website_exams e ${whereClause}`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    // Data query
    const dataQuery = `
      SELECT e.*,
             c.name AS class_name,
             c.code AS class_code,
             s.name AS session_name,
             COALESCE(cand.candidate_count, 0)::int AS candidate_count,
             COALESCE(fees.fee_count, 0)::int AS fee_count,
             COALESCE(fees.total_fees_amount, 0)::numeric AS total_fees_amount
      FROM website_exams e
      LEFT JOIN website_classes c ON c.id = e.class_id AND c.website_id = e.website_id
      LEFT JOIN website_sessions s ON s.id = e.session_id AND s.website_id = e.website_id
      LEFT JOIN (
        SELECT exam_id, COUNT(*)::int AS candidate_count
        FROM website_exam_candidates
        WHERE website_id = $1
        GROUP BY exam_id
      ) cand ON cand.exam_id = e.id
      LEFT JOIN (
        SELECT exam_id, COUNT(*)::int AS fee_count, SUM(amount)::numeric AS total_fees_amount
        FROM website_exam_fees
        WHERE website_id = $1
        GROUP BY exam_id
      ) fees ON fees.exam_id = e.id
      ${whereClause}
      ORDER BY e.start_date DESC, e.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataParams = [...params, limit, offset];
    const dataRes = await queryDb(dataQuery, dataParams);

    return NextResponse.json({
      success: true,
      exams: dataRes.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching exams:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch examinations list.' },
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
      class_id,
      session_id,
      name,
      term,
      start_date,
      end_date,
      application_start_date,
      application_end_date,
      status = 'upcoming',
      is_published = true,
      description = ''
    } = body;

    if (!class_id || !session_id || !name?.trim() || !term?.trim() || !start_date || !end_date) {
      return NextResponse.json(
        { success: false, error: 'Class, session, exam name, term, and dates are required.' },
        { status: 400 }
      );
    }

    const insertRes = await queryDb(
      `INSERT INTO website_exams (
        website_id, class_id, session_id, name, term,
        start_date, end_date, application_start_date, application_end_date,
        status, is_published, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        auth.website.id,
        class_id,
        session_id,
        name.trim(),
        term.trim(),
        start_date,
        end_date,
        application_start_date || null,
        application_end_date || null,
        status,
        Boolean(is_published),
        description?.trim() || null
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Examination created successfully.',
      exam: insertRes.rows[0]
    });
  } catch (error) {
    console.error('Error creating exam:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create examination.' },
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
    const {
      id,
      class_id,
      session_id,
      name,
      term,
      start_date,
      end_date,
      application_start_date,
      application_end_date,
      status,
      is_published,
      description
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Exam ID is required.' }, { status: 400 });
    }

    const updateRes = await queryDb(
      `UPDATE website_exams
       SET class_id = COALESCE($3, class_id),
           session_id = COALESCE($4, session_id),
           name = COALESCE($5, name),
           term = COALESCE($6, term),
           start_date = COALESCE($7, start_date),
           end_date = COALESCE($8, end_date),
           application_start_date = $9,
           application_end_date = $10,
           status = COALESCE($11, status),
           is_published = COALESCE($12, is_published),
           description = $13,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND website_id = $2
       RETURNING *`,
      [
        id,
        auth.website.id,
        class_id,
        session_id,
        name?.trim(),
        term?.trim(),
        start_date,
        end_date,
        application_start_date || null,
        application_end_date || null,
        status,
        is_published !== undefined ? Boolean(is_published) : undefined,
        description !== undefined ? description?.trim() : null
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Exam not found or forbidden.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Examination updated successfully.',
      exam: updateRes.rows[0]
    });
  } catch (error) {
    console.error('Error updating exam:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update examination.' },
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
      return NextResponse.json({ success: false, error: 'Exam ID is required.' }, { status: 400 });
    }

    const deleteRes = await queryDb(
      `DELETE FROM website_exams WHERE id = $1 AND website_id = $2 RETURNING id`,
      [id, auth.website.id]
    );

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Exam not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Examination deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting exam:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete examination.' },
      { status: 500 }
    );
  }
}
