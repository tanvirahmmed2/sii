import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyStaffPaymentAccess } from 'src/lib/database/paymentGateways.js';

/**
 * GET /api/[domain]/staff/panel/admissions
 * Fetches all admission circulars, departments, classes, sessions, and applicant count breakdown.
 */
export async function GET(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const websiteId = auth.website.id;

    // 1. Fetch circulars with fee info, dept info, class info, session info, and stats
    const circularsRes = await queryDb(`
      SELECT a.*,
             d.name AS department_name,
             d.code AS department_code,
             c.name AS class_name,
             s.name AS session_name,
             af.id AS fee_id, af.fee_title, af.amount AS fee_amount, af.currency AS fee_currency, af.late_fee,
             COALESCE(st.total_applicants, 0)::int AS total_applicants,
             COALESCE(st.pending_applicants, 0)::int AS pending_applicants,
             COALESCE(st.selected_applicants, 0)::int AS selected_applicants,
             COALESCE(st.rejected_applicants, 0)::int AS rejected_applicants,
             COALESCE(st.enrolled_applicants, 0)::int AS enrolled_applicants
      FROM website_admissions a
      LEFT JOIN website_departments d ON d.id = a.department_id
      LEFT JOIN website_classes c ON c.id = a.class_id
      LEFT JOIN website_sessions s ON s.id = a.session_id
      LEFT JOIN website_admission_fees af ON af.admission_id = a.id AND af.status = 'active'
      LEFT JOIN (
        SELECT admission_id,
               COUNT(*)::int AS total_applicants,
               COUNT(CASE WHEN status = 'pending' THEN 1 END)::int AS pending_applicants,
               COUNT(CASE WHEN status = 'selected' THEN 1 END)::int AS selected_applicants,
               COUNT(CASE WHEN status = 'rejected' THEN 1 END)::int AS rejected_applicants,
               COUNT(CASE WHEN status = 'enrolled' THEN 1 END)::int AS enrolled_applicants
        FROM website_admission_applicants
        WHERE website_id = $1
        GROUP BY admission_id
      ) st ON st.admission_id = a.id
      WHERE a.website_id = $1
      ORDER BY a.created_at DESC
    `, [websiteId]);

    // 2. Fetch departments, classes and sessions for selectors
    const [departmentsRes, classesRes, sessionsRes] = await Promise.all([
      queryDb(`SELECT id, name, code FROM website_departments WHERE website_id = $1 ORDER BY order_no ASC, name ASC`, [websiteId]),
      queryDb(`SELECT id, name, department_id, session_id FROM website_classes WHERE website_id = $1 ORDER BY name ASC`, [websiteId]),
      queryDb(`SELECT id, name, is_current FROM website_sessions WHERE website_id = $1 ORDER BY id DESC`, [websiteId])
    ]);

    return NextResponse.json({
      success: true,
      circulars: circularsRes.rows,
      departments: departmentsRes.rows,
      classes: classesRes.rows,
      sessions: sessionsRes.rows
    });
  } catch (error) {
    console.error('Error in GET /staff/panel/admissions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/[domain]/staff/panel/admissions
 * Creates a new admission circular with department, session, class, result date, and fee.
 */
export async function POST(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const {
      title,
      circular_number,
      description,
      department_id,
      session_id,
      class_id,
      start_date,
      end_date,
      exam_date,
      result_date,
      min_age,
      max_age,
      capacity = 100,
      status = 'open',
      is_published = true,
      fee_title = 'Application Form Fee',
      fee_amount = 500.00,
      fee_currency = 'BDT',
      late_fee = 0.00
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: 'Admission circular title is required.' }, { status: 400 });
    }
    if (!start_date || !end_date) {
      return NextResponse.json({ success: false, error: 'Start date and end date are required.' }, { status: 400 });
    }

    const staffId = auth.user?.id || null;

    // 1. Insert admission circular
    const insertRes = await queryDb(`
      INSERT INTO website_admissions (
        website_id, department_id, session_id, class_id, title, circular_number, description,
        start_date, end_date, exam_date, result_date, min_age, max_age, capacity,
        status, is_published, created_by_staff_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17
      ) RETURNING *
    `, [
      auth.website.id,
      department_id ? parseInt(department_id, 10) : null,
      session_id ? parseInt(session_id, 10) : null,
      class_id ? parseInt(class_id, 10) : null,
      title.trim(),
      circular_number ? circular_number.trim() : `CIR-${Date.now().toString().slice(-6)}`,
      description ? description.trim() : null,
      start_date,
      end_date,
      exam_date || null,
      result_date || null,
      min_age ? parseInt(min_age, 10) : null,
      max_age ? parseInt(max_age, 10) : null,
      parseInt(capacity, 10) || 100,
      status || 'open',
      Boolean(is_published),
      staffId
    ]);

    const createdAdm = insertRes.rows[0];

    // 2. Insert admission fee structure
    const feeRes = await queryDb(`
      INSERT INTO website_admission_fees (
        website_id, admission_id, fee_title, amount, currency, late_fee, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 'active'
      ) RETURNING *
    `, [
      auth.website.id,
      createdAdm.id,
      fee_title ? fee_title.trim() : 'Application Form Fee',
      parseFloat(fee_amount) || 0.00,
      String(fee_currency || 'BDT').toUpperCase().trim(),
      parseFloat(late_fee) || 0.00
    ]);

    return NextResponse.json({
      success: true,
      message: `Admission circular '${createdAdm.title}' created successfully.`,
      circular: {
        ...createdAdm,
        fee: feeRes.rows[0]
      }
    });
  } catch (error) {
    console.error('Error in POST /staff/panel/admissions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/[domain]/staff/panel/admissions
 * Updates an existing admission circular and its fee structure.
 */
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const {
      id,
      title,
      circular_number,
      description,
      department_id,
      class_id,
      session_id,
      start_date,
      end_date,
      exam_date,
      result_date,
      min_age,
      max_age,
      capacity,
      status,
      is_published,
      fee_title,
      fee_amount,
      fee_currency,
      late_fee
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Admission circular ID is required.' }, { status: 400 });
    }

    // Verify ownership
    const checkRes = await queryDb(`SELECT id FROM website_admissions WHERE id = $1 AND website_id = $2`, [id, auth.website.id]);
    if (checkRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Admission circular not found.' }, { status: 404 });
    }

    // Update circular
    const updateRes = await queryDb(`
      UPDATE website_admissions
      SET title = COALESCE($1, title),
          circular_number = COALESCE($2, circular_number),
          description = COALESCE($3, description),
          department_id = $4,
          session_id = $5,
          class_id = $6,
          start_date = COALESCE($7, start_date),
          end_date = COALESCE($8, end_date),
          exam_date = $9,
          result_date = $10,
          min_age = $11,
          max_age = $12,
          capacity = COALESCE($13, capacity),
          status = COALESCE($14, status),
          is_published = COALESCE($15, is_published),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $16 AND website_id = $17
      RETURNING *
    `, [
      title ? title.trim() : null,
      circular_number ? circular_number.trim() : null,
      description !== undefined ? description : null,
      department_id ? parseInt(department_id, 10) : null,
      session_id ? parseInt(session_id, 10) : null,
      class_id ? parseInt(class_id, 10) : null,
      start_date || null,
      end_date || null,
      exam_date || null,
      result_date || null,
      min_age ? parseInt(min_age, 10) : null,
      max_age ? parseInt(max_age, 10) : null,
      capacity ? parseInt(capacity, 10) : null,
      status || null,
      is_published !== undefined ? Boolean(is_published) : null,
      id,
      auth.website.id
    ]);

    // Upsert or update fee
    if (fee_amount !== undefined) {
      const existingFee = await queryDb(
        `SELECT id FROM website_admission_fees WHERE admission_id = $1 AND website_id = $2 LIMIT 1`,
        [id, auth.website.id]
      );

      if (existingFee.rows.length > 0) {
        await queryDb(`
          UPDATE website_admission_fees
          SET fee_title = COALESCE($1, fee_title),
              amount = $2,
              currency = COALESCE($3, currency),
              late_fee = COALESCE($4, late_fee),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $5
        `, [
          fee_title ? fee_title.trim() : null,
          parseFloat(fee_amount) || 0.00,
          fee_currency ? String(fee_currency).toUpperCase().trim() : null,
          late_fee !== undefined ? parseFloat(late_fee) || 0.00 : null,
          existingFee.rows[0].id
        ]);
      } else {
        await queryDb(`
          INSERT INTO website_admission_fees (
            website_id, admission_id, fee_title, amount, currency, late_fee, status
          ) VALUES (
            $1, $2, $3, $4, $5, $6, 'active'
          )
        `, [
          auth.website.id,
          id,
          fee_title ? fee_title.trim() : 'Application Form Fee',
          parseFloat(fee_amount) || 0.00,
          String(fee_currency || 'BDT').toUpperCase().trim(),
          parseFloat(late_fee) || 0.00
        ]);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Admission circular updated successfully.',
      circular: updateRes.rows[0]
    });
  } catch (error) {
    console.error('Error in PUT /staff/panel/admissions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/[domain]/staff/panel/admissions
 */
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Circular ID is required.' }, { status: 400 });
    }

    await queryDb(`DELETE FROM website_admissions WHERE id = $1 AND website_id = $2`, [id, auth.website.id]);

    return NextResponse.json({
      success: true,
      message: 'Admission circular deleted successfully.'
    });
  } catch (error) {
    console.error('Error in DELETE /staff/panel/admissions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
