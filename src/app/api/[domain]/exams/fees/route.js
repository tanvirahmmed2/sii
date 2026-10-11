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
    const examId = searchParams.get('exam_id');
    const classId = searchParams.get('class_id');
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE f.website_id = $1';
    const params = [auth.website.id];

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (f.fee_title ILIKE $${params.length} OR e.name ILIKE $${params.length})`;
    }

    if (examId && examId !== 'all') {
      params.push(examId);
      whereClause += ` AND f.exam_id = $${params.length}`;
    }

    if (classId && classId !== 'all') {
      params.push(classId);
      whereClause += ` AND f.class_id = $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      whereClause += ` AND f.status = $${params.length}`;
    }

    const countRes = await queryDb(
      `SELECT COUNT(*)::int AS total 
       FROM website_exam_fees f
       LEFT JOIN website_exams e ON e.id = f.exam_id AND e.website_id = f.website_id
       ${whereClause}`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    const dataQuery = `
      SELECT f.*,
             e.name AS exam_name,
             e.term AS exam_term,
             c.name AS class_name,
             c.code AS class_code,
             COALESCE(p.paid_payments_count, 0)::int AS paid_payments_count,
             COALESCE(p.total_collected, 0)::numeric AS total_collected
      FROM website_exam_fees f
      LEFT JOIN website_exams e ON e.id = f.exam_id AND e.website_id = f.website_id
      LEFT JOIN website_classes c ON c.id = f.class_id AND c.website_id = f.website_id
      LEFT JOIN (
        SELECT fee_id, 
               COUNT(*) FILTER (WHERE payment_status = 'paid')::int AS paid_payments_count,
               SUM(paid_amount)::numeric AS total_collected
        FROM website_exam_fee_payments
        WHERE website_id = $1
        GROUP BY fee_id
      ) p ON p.fee_id = f.id
      ${whereClause}
      ORDER BY f.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataRes = await queryDb(dataQuery, [...params, limit, offset]);

    return NextResponse.json({
      success: true,
      fees: dataRes.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching exam fees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch exam fees.' },
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
      exam_id,
      class_id,
      fee_title,
      amount,
      late_fee = 0,
      due_date,
      description = '',
      status = 'active'
    } = body;

    if (!exam_id || !fee_title?.trim() || amount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Exam ID, fee title, and fee amount are required.' },
        { status: 400 }
      );
    }

    // Verify exam exists and belongs to this website
    const examCheck = await queryDb(
      `SELECT id, class_id FROM website_exams WHERE id = $1 AND website_id = $2`,
      [exam_id, auth.website.id]
    );
    if (examCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Examination not found.' }, { status: 404 });
    }

    const resolvedClassId = class_id || examCheck.rows[0].class_id;

    const insertRes = await queryDb(
      `INSERT INTO website_exam_fees (
        website_id, exam_id, class_id, fee_title, amount, late_fee, due_date, description, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        auth.website.id,
        exam_id,
        resolvedClassId,
        fee_title.trim(),
        parseFloat(amount),
        parseFloat(late_fee || 0),
        due_date || null,
        description?.trim() || null,
        status
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Exam fee created successfully.',
      fee: insertRes.rows[0]
    });
  } catch (error) {
    console.error('Error creating exam fee:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create exam fee.' },
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
    const { id, exam_id, class_id, fee_title, amount, late_fee, due_date, description, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Fee ID is required.' }, { status: 400 });
    }

    const updateRes = await queryDb(
      `UPDATE website_exam_fees
       SET exam_id = COALESCE($3, exam_id),
           class_id = COALESCE($4, class_id),
           fee_title = COALESCE($5, fee_title),
           amount = COALESCE($6, amount),
           late_fee = COALESCE($7, late_fee),
           due_date = $8,
           description = $9,
           status = COALESCE($10, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND website_id = $2
       RETURNING *`,
      [
        id,
        auth.website.id,
        exam_id || null,
        class_id || null,
        fee_title ? fee_title.trim() : null,
        amount !== undefined ? parseFloat(amount) : null,
        late_fee !== undefined ? parseFloat(late_fee) : null,
        due_date || null,
        description !== undefined ? description?.trim() : null,
        status || null
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Fee not found or forbidden.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Exam fee updated successfully.',
      fee: updateRes.rows[0]
    });
  } catch (error) {
    console.error('Error updating exam fee:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update exam fee.' },
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
      return NextResponse.json({ success: false, error: 'Fee ID is required.' }, { status: 400 });
    }

    const deleteRes = await queryDb(
      `DELETE FROM website_exam_fees WHERE id = $1 AND website_id = $2 RETURNING id`,
      [id, auth.website.id]
    );

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Fee not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Exam fee deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting exam fee:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete exam fee.' },
      { status: 500 }
    );
  }
}
