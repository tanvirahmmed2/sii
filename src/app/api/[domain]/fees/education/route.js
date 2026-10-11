import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyEducationFeeAccess } from 'src/lib/middleware/education_fee_auth.js';

// GET: List configured education fee structures
export async function GET(request, context) {
  try {
    const auth = await verifyEducationFeeAccess(request, context, 'view');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id');
    const sessionId = searchParams.get('session_id');
    const status = searchParams.get('status');

    let queryText = `
      SELECT f.*,
             c.name AS class_name,
             s.name AS session_name,
             (SELECT COUNT(*) FROM website_education_fee_payments p WHERE p.education_fee_id = f.id) AS generated_dues_count
      FROM website_education_fees f
      JOIN website_classes c ON c.id = f.class_id AND c.website_id = f.website_id
      LEFT JOIN website_sessions s ON s.id = f.session_id AND s.website_id = f.website_id
      WHERE f.website_id = $1
    `;
    const params = [website.id];
    let paramIdx = 2;

    if (classId) {
      queryText += ` AND f.class_id = $${paramIdx++}`;
      params.push(classId);
    }

    if (sessionId) {
      queryText += ` AND f.session_id = $${paramIdx++}`;
      params.push(sessionId);
    }

    if (status && status !== 'all') {
      queryText += ` AND f.status = $${paramIdx++}`;
      params.push(status);
    }

    queryText += ` ORDER BY c.numeric_name ASC NULLS LAST, c.name ASC, f.id DESC`;

    const res = await queryDb(queryText, params);

    return NextResponse.json({
      success: true,
      data: res.rows,
    });
  } catch (error) {
    console.error('Error fetching education fee configurations:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list education fees.' },
      { status: 500 }
    );
  }
}

// POST: Create a new fee structure for a class
export async function POST(request, context) {
  try {
    const auth = await verifyEducationFeeAccess(request, context, 'create');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json().catch(() => ({}));

    const {
      class_id,
      session_id,
      fee_title,
      fee_type = 'tuition',
      frequency = 'monthly',
      amount,
      late_fee = 0,
      due_day_of_month = 10,
      description = '',
      status = 'active',
    } = body;

    if (!class_id) {
      return NextResponse.json({ success: false, error: 'Target academic class is required.' }, { status: 400 });
    }

    if (!fee_title || !String(fee_title).trim()) {
      return NextResponse.json({ success: false, error: 'Fee title or description name is required.' }, { status: 400 });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return NextResponse.json({ success: false, error: 'Fee amount must be a valid positive number.' }, { status: 400 });
    }

    // Verify class belongs to website
    const classCheck = await queryDb(
      `SELECT id, name AS class_name FROM website_classes WHERE id = $1 AND website_id = $2`,
      [class_id, website.id]
    );
    if (classCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Selected class does not exist.' }, { status: 404 });
    }

    const insertRes = await queryDb(
      `INSERT INTO website_education_fees
        (website_id, class_id, session_id, fee_title, fee_type, frequency, amount, late_fee, due_day_of_month, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        website.id,
        class_id,
        session_id || null,
        String(fee_title).trim(),
        fee_type,
        frequency,
        numAmount,
        parseFloat(late_fee || 0),
        parseInt(due_day_of_month, 10) || 10,
        description ? String(description).trim() : null,
        status === 'inactive' ? 'inactive' : 'active',
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Education fee structure created successfully.',
      data: insertRes.rows[0],
    });
  } catch (error) {
    console.error('Error creating education fee:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create fee configuration.' },
      { status: 500 }
    );
  }
}

// PUT: Update an existing education fee structure
export async function PUT(request, context) {
  try {
    const auth = await verifyEducationFeeAccess(request, context, 'edit');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json().catch(() => ({}));

    const {
      id,
      class_id,
      session_id,
      fee_title,
      fee_type,
      frequency,
      amount,
      late_fee,
      due_day_of_month,
      description,
      status,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Fee configuration ID is required.' }, { status: 400 });
    }

    // Verify existing record
    const existing = await queryDb(
      `SELECT * FROM website_education_fees WHERE id = $1 AND website_id = $2`,
      [id, website.id]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Fee structure not found.' }, { status: 404 });
    }

    const current = existing.rows[0];

    const numAmount = amount !== undefined ? parseFloat(amount) : current.amount;
    if (isNaN(numAmount) || numAmount < 0) {
      return NextResponse.json({ success: false, error: 'Fee amount must be a valid positive number.' }, { status: 400 });
    }

    const updateRes = await queryDb(
      `UPDATE website_education_fees
       SET class_id = COALESCE($1, class_id),
           session_id = $2,
           fee_title = COALESCE($3, fee_title),
           fee_type = COALESCE($4, fee_type),
           frequency = COALESCE($5, frequency),
           amount = $6,
           late_fee = $7,
           due_day_of_month = $8,
           description = $9,
           status = COALESCE($10, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 AND website_id = $12
       RETURNING *`,
      [
        class_id || current.class_id,
        session_id !== undefined ? (session_id || null) : current.session_id,
        fee_title ? String(fee_title).trim() : current.fee_title,
        fee_type || current.fee_type,
        frequency || current.frequency,
        numAmount,
        late_fee !== undefined ? parseFloat(late_fee || 0) : current.late_fee,
        due_day_of_month !== undefined ? (parseInt(due_day_of_month, 10) || 10) : current.due_day_of_month,
        description !== undefined ? (description ? String(description).trim() : null) : current.description,
        status || current.status,
        id,
        website.id,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Education fee structure updated successfully.',
      data: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Error updating education fee:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update fee configuration.' },
      { status: 500 }
    );
  }
}

// DELETE: Remove or deactivate fee structure
export async function DELETE(request, context) {
  try {
    const auth = await verifyEducationFeeAccess(request, context, 'delete');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Fee configuration ID is required.' }, { status: 400 });
    }

    // Check if payments exist
    const paymentsCheck = await queryDb(
      `SELECT COUNT(*)::int AS count FROM website_education_fee_payments WHERE education_fee_id = $1 AND website_id = $2`,
      [id, website.id]
    );

    if (paymentsCheck.rows[0].count > 0) {
      // Soft-delete / deactivate so historical invoices aren't orphaned
      await queryDb(
        `UPDATE website_education_fees SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND website_id = $2`,
        [id, website.id]
      );
      return NextResponse.json({
        success: true,
        message: 'Fee structure has historical records; it was deactivated instead of deleted.',
        deactivated: true,
      });
    }

    await queryDb(
      `DELETE FROM website_education_fees WHERE id = $1 AND website_id = $2`,
      [id, website.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Education fee structure deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting education fee:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete fee configuration.' },
      { status: 500 }
    );
  }
}
