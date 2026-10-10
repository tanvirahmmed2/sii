import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyPayrollStaffAccess } from 'src/lib/middleware/payroll_auth.js';

export async function GET(request, context) {
  try {
    const auth = await verifyPayrollStaffAccess(request, context, 'view');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month')?.trim() || new Date().toISOString().slice(0, 7); // Default YYYY-MM
    const status = searchParams.get('status') || 'all'; // 'all', 'Pending', 'Paid'
    const search = searchParams.get('search')?.trim() || '';

    let whereConditions = [`tsp.website_id = $1`];
    const params = [website.id];

    if (month && month !== 'all') {
      params.push(month);
      whereConditions.push(`tsp.month = $${params.length}`);
    }

    if (status && status !== 'all') {
      params.push(status);
      whereConditions.push(`tsp.payment_status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereConditions.push(`(wt.name ILIKE $${params.length} OR wt.email ILIKE $${params.length} OR wt.number ILIKE $${params.length} OR tsp.transaction_id ILIKE $${params.length})`);
    }

    const query = `
      SELECT 
        tsp.id AS payment_id,
        tsp.teacher_id,
        tsp.salary_id,
        tsp.month,
        tsp.amount_paid,
        tsp.payment_status,
        tsp.payment_method,
        tsp.payment_date,
        tsp.transaction_id,
        tsp.remarks,
        tsp.created_at,
        wt.name AS teacher_name,
        wt.email AS teacher_email,
        wt.number AS teacher_phone,
        wt.photo_url,
        wd.title AS designation_name,
        tp.title AS payroll_title,
        tp.grade_code,
        tp.basic_salary,
        tp.house_rent,
        tp.medical_allowance,
        tp.transport_allowance,
        tp.other_allowance,
        (tp.basic_salary + tp.house_rent + tp.medical_allowance + tp.transport_allowance + tp.other_allowance) AS gross_salary,
        tp.provident_fund,
        tp.tax_deduction,
        tp.other_deductions,
        (tp.provident_fund + tp.tax_deduction + tp.other_deductions) AS total_deductions,
        ((tp.basic_salary + tp.house_rent + tp.medical_allowance + tp.transport_allowance + tp.other_allowance) - 
         (tp.provident_fund + tp.tax_deduction + tp.other_deductions)) AS net_salary
      FROM website_teacher_salary_payments tsp
      JOIN website_teachers wt ON wt.id = tsp.teacher_id
      LEFT JOIN website_designations wd ON wd.id = wt.designation_id
      LEFT JOIN website_teacher_salaries ts ON ts.id = tsp.salary_id
      LEFT JOIN website_teacher_payrolls tp ON tp.id = ts.payroll_id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY tsp.created_at DESC
    `;

    const result = await queryDb(query, params);

    // Summary metrics for the month
    const summaryRes = await queryDb(
      `SELECT 
        COUNT(*)::int AS total_slips,
        COUNT(CASE WHEN payment_status = 'Paid' THEN 1 END)::int AS paid_count,
        COUNT(CASE WHEN payment_status = 'Pending' THEN 1 END)::int AS pending_count,
        COALESCE(SUM(amount_paid), 0)::numeric AS total_amount,
        COALESCE(SUM(CASE WHEN payment_status = 'Paid' THEN amount_paid ELSE 0 END), 0)::numeric AS paid_amount,
        COALESCE(SUM(CASE WHEN payment_status = 'Pending' THEN amount_paid ELSE 0 END), 0)::numeric AS pending_amount
       FROM website_teacher_salary_payments
       WHERE website_id = $1 ${month && month !== 'all' ? `AND month = '${month}'` : ''}`,
      [website.id]
    );

    return NextResponse.json({
      success: true,
      payments: result.rows,
      summary: summaryRes.rows[0] || {},
      month,
    });
  } catch (error) {
    console.error('Error fetching teacher payments:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch teacher salary payments.' }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const auth = await verifyPayrollStaffAccess(request, context, 'create');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json();
    const action = body.action || 'generate_month'; // 'generate_month' | 'single'

    if (action === 'generate_month') {
      const month = body.month?.trim() || new Date().toISOString().slice(0, 7);
      if (!month) {
        return NextResponse.json({ success: false, message: 'Month is required (YYYY-MM).' }, { status: 400 });
      }

      // Fetch all active teachers who have an assigned payroll scale
      const teachersToPay = await queryDb(
        `SELECT 
          ts.id AS salary_id,
          ts.teacher_id,
          ((tp.basic_salary + tp.house_rent + tp.medical_allowance + tp.transport_allowance + tp.other_allowance) - 
           (tp.provident_fund + tp.tax_deduction + tp.other_deductions)) AS net_salary
         FROM website_teacher_salaries ts
         JOIN website_teacher_payrolls tp ON tp.id = ts.payroll_id
         WHERE ts.website_id = $1 AND ts.status = 'active' AND tp.is_active = TRUE`,
        [website.id]
      );

      if (teachersToPay.rows.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'No active teachers with assigned payroll scales found.',
        }, { status: 400 });
      }

      let generatedCount = 0;
      for (const t of teachersToPay.rows) {
        const net = Math.max(0, Number(t.net_salary));
        const insertRes = await queryDb(
          `INSERT INTO website_teacher_salary_payments (
            website_id, teacher_id, salary_id, month, amount_paid, payment_status, remarks
          ) VALUES ($1, $2, $3, $4, $5, 'Pending', 'Monthly salary slip generated')
          ON CONFLICT (website_id, teacher_id, month) DO NOTHING
          RETURNING id`,
          [website.id, t.teacher_id, t.salary_id, month, net]
        );
        if (insertRes.rows.length > 0) {
          generatedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Generated ${generatedCount} salary slip(s) for ${month}. ${teachersToPay.rows.length - generatedCount} were already existing.`,
        generated_count: generatedCount,
      });
    }

    // Single payment record creation
    const { teacher_id, month, amount_paid, payment_status, payment_method, payment_date, transaction_id, remarks } = body;
    if (!teacher_id || !month) {
      return NextResponse.json({ success: false, message: 'Teacher ID and Month are required.' }, { status: 400 });
    }

    // Lookup salary_id
    const salLookup = await queryDb(
      `SELECT id FROM website_teacher_salaries WHERE website_id = $1 AND teacher_id = $2 LIMIT 1`,
      [website.id, teacher_id]
    );
    const salaryId = salLookup.rows[0]?.id || null;

    const amount = Math.max(0, parseFloat(amount_paid) || 0);
    const statusVal = payment_status || 'Pending';
    const pDate = payment_date || (statusVal === 'Paid' ? new Date().toISOString() : null);

    const insertRes = await queryDb(
      `INSERT INTO website_teacher_salary_payments (
        website_id, teacher_id, salary_id, month, amount_paid, payment_status, 
        payment_method, payment_date, transaction_id, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (website_id, teacher_id, month) DO UPDATE SET
        amount_paid = EXCLUDED.amount_paid,
        payment_status = EXCLUDED.payment_status,
        payment_method = EXCLUDED.payment_method,
        payment_date = EXCLUDED.payment_date,
        transaction_id = EXCLUDED.transaction_id,
        remarks = EXCLUDED.remarks,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [website.id, teacher_id, salaryId, month, amount, statusVal, payment_method || 'Bank Transfer', pDate, transaction_id || null, remarks || null]
    );

    return NextResponse.json({
      success: true,
      message: 'Payment record created successfully.',
      payment: insertRes.rows[0],
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating teacher payment:', error);
    return NextResponse.json({ success: false, message: 'Failed to record teacher payment.' }, { status: 500 });
  }
}

export async function PUT(request, context) {
  try {
    const auth = await verifyPayrollStaffAccess(request, context, 'edit');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json();
    const { id, amount_paid, payment_status, payment_method, payment_date, transaction_id, remarks } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Payment ID is required.' }, { status: 400 });
    }

    const currentRec = await queryDb(
      `SELECT * FROM website_teacher_salary_payments WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [id, website.id]
    );
    if (currentRec.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Payment record not found.' }, { status: 404 });
    }

    const cur = currentRec.rows[0];
    const newStatus = payment_status || cur.payment_status;
    const newAmount = amount_paid !== undefined ? Math.max(0, parseFloat(amount_paid) || 0) : cur.amount_paid;
    const newMethod = payment_method !== undefined ? payment_method : cur.payment_method;
    const newDate = payment_date !== undefined ? payment_date : (newStatus === 'Paid' && !cur.payment_date ? new Date().toISOString() : cur.payment_date);
    const newTxId = transaction_id !== undefined ? transaction_id : cur.transaction_id;
    const newRemarks = remarks !== undefined ? remarks : cur.remarks;

    const updateRes = await queryDb(
      `UPDATE website_teacher_salary_payments SET
        amount_paid = $1,
        payment_status = $2,
        payment_method = $3,
        payment_date = $4,
        transaction_id = $5,
        remarks = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND website_id = $8
      RETURNING *`,
      [newAmount, newStatus, newMethod, newDate, newTxId, newRemarks, id, website.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Payment record updated successfully.',
      payment: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Error updating teacher payment:', error);
    return NextResponse.json({ success: false, message: 'Failed to update teacher payment.' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const auth = await verifyPayrollStaffAccess(request, context, 'delete');
    if (!auth.allowed) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Payment ID is required.' }, { status: 400 });
    }

    const deleteRes = await queryDb(
      `DELETE FROM website_teacher_salary_payments WHERE id = $1 AND website_id = $2 RETURNING id, month`,
      [id, website.id]
    );

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Payment record not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Payment record for ${deleteRes.rows[0].month} deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting teacher payment:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete payment record.' }, { status: 500 });
  }
}
