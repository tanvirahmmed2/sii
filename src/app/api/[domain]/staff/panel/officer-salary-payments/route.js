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

    let whereConditions = [`osp.website_id = $1`];
    const params = [website.id];

    if (month && month !== 'all') {
      params.push(month);
      whereConditions.push(`osp.month = $${params.length}`);
    }

    if (status && status !== 'all') {
      params.push(status);
      whereConditions.push(`osp.payment_status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereConditions.push(`(wo.name ILIKE $${params.length} OR wo.email ILIKE $${params.length} OR wo.phone ILIKE $${params.length} OR osp.transaction_id ILIKE $${params.length})`);
    }

    const query = `
      SELECT 
        osp.id AS payment_id,
        osp.officer_id,
        osp.salary_id,
        osp.month,
        osp.amount_paid,
        osp.payment_status,
        osp.payment_method,
        osp.payment_date,
        osp.transaction_id,
        osp.remarks,
        osp.created_at,
        wo.name AS officer_name,
        wo.email AS officer_email,
        wo.phone AS officer_phone,
        wo.department,
        wo.designation,
        wo.photo_url,
        op.title AS payroll_title,
        op.grade_code,
        op.basic_salary,
        op.house_rent,
        op.medical_allowance,
        op.transport_allowance,
        op.other_allowance,
        (op.basic_salary + op.house_rent + op.medical_allowance + op.transport_allowance + op.other_allowance) AS gross_salary,
        op.provident_fund,
        op.tax_deduction,
        op.other_deductions,
        (op.provident_fund + op.tax_deduction + op.other_deductions) AS total_deductions,
        ((op.basic_salary + op.house_rent + op.medical_allowance + op.transport_allowance + op.other_allowance) - 
         (op.provident_fund + op.tax_deduction + op.other_deductions)) AS net_salary
      FROM website_officer_salary_payments osp
      JOIN website_officers wo ON wo.id = osp.officer_id
      LEFT JOIN website_officer_salaries os ON os.id = osp.salary_id
      LEFT JOIN website_officer_payrolls op ON op.id = os.payroll_id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY osp.created_at DESC
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
       FROM website_officer_salary_payments
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
    console.error('Error fetching officer payments:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch officer salary payments.' }, { status: 500 });
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

      // Fetch all active officers who have an assigned payroll scale
      const officersToPay = await queryDb(
        `SELECT 
          os.id AS salary_id,
          os.officer_id,
          ((op.basic_salary + op.house_rent + op.medical_allowance + op.transport_allowance + op.other_allowance) - 
           (op.provident_fund + op.tax_deduction + op.other_deductions)) AS net_salary
         FROM website_officer_salaries os
         JOIN website_officer_payrolls op ON op.id = os.payroll_id
         WHERE os.website_id = $1 AND os.status = 'active' AND op.is_active = TRUE`,
        [website.id]
      );

      if (officersToPay.rows.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'No active officers with assigned payroll scales found.',
        }, { status: 400 });
      }

      let generatedCount = 0;
      for (const o of officersToPay.rows) {
        const net = Math.max(0, Number(o.net_salary));
        const insertRes = await queryDb(
          `INSERT INTO website_officer_salary_payments (
            website_id, officer_id, salary_id, month, amount_paid, payment_status, remarks
          ) VALUES ($1, $2, $3, $4, $5, 'Pending', 'Monthly salary slip generated')
          ON CONFLICT (website_id, officer_id, month) DO NOTHING
          RETURNING id`,
          [website.id, o.officer_id, o.salary_id, month, net]
        );
        if (insertRes.rows.length > 0) {
          generatedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Generated ${generatedCount} salary slip(s) for ${month}. ${officersToPay.rows.length - generatedCount} were already existing.`,
        generated_count: generatedCount,
      });
    }

    // Single payment record creation
    const { officer_id, month, amount_paid, payment_status, payment_method, payment_date, transaction_id, remarks } = body;
    if (!officer_id || !month) {
      return NextResponse.json({ success: false, message: 'Officer ID and Month are required.' }, { status: 400 });
    }

    // Lookup salary_id
    const salLookup = await queryDb(
      `SELECT id FROM website_officer_salaries WHERE website_id = $1 AND officer_id = $2 LIMIT 1`,
      [website.id, officer_id]
    );
    const salaryId = salLookup.rows[0]?.id || null;

    const amount = Math.max(0, parseFloat(amount_paid) || 0);
    const statusVal = payment_status || 'Pending';
    const pDate = payment_date || (statusVal === 'Paid' ? new Date().toISOString() : null);

    const insertRes = await queryDb(
      `INSERT INTO website_officer_salary_payments (
        website_id, officer_id, salary_id, month, amount_paid, payment_status, 
        payment_method, payment_date, transaction_id, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (website_id, officer_id, month) DO UPDATE SET
        amount_paid = EXCLUDED.amount_paid,
        payment_status = EXCLUDED.payment_status,
        payment_method = EXCLUDED.payment_method,
        payment_date = EXCLUDED.payment_date,
        transaction_id = EXCLUDED.transaction_id,
        remarks = EXCLUDED.remarks,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [website.id, officer_id, salaryId, month, amount, statusVal, payment_method || 'Bank Transfer', pDate, transaction_id || null, remarks || null]
    );

    return NextResponse.json({
      success: true,
      message: 'Payment record created successfully.',
      payment: insertRes.rows[0],
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating officer payment:', error);
    return NextResponse.json({ success: false, message: 'Failed to record officer payment.' }, { status: 500 });
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
      `SELECT * FROM website_officer_salary_payments WHERE id = $1 AND website_id = $2 LIMIT 1`,
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
      `UPDATE website_officer_salary_payments SET
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
    console.error('Error updating officer payment:', error);
    return NextResponse.json({ success: false, message: 'Failed to update officer payment.' }, { status: 500 });
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
      `DELETE FROM website_officer_salary_payments WHERE id = $1 AND website_id = $2 RETURNING id, month`,
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
    console.error('Error deleting officer payment:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete payment record.' }, { status: 500 });
  }
}
