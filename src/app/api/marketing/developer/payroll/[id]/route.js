import { NextResponse } from 'next/server';
import { hasModulePermission } from '@/lib/middleware/developer';
import { queryDb } from '@/lib/db/pg';

// ============================================================================
// GET: Single payroll with all developer salary items and payments
// ============================================================================
export async function GET(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'payroll');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message },
        { status: auth.status || 403 }
      );
    }

    const { id } = await params;

    const payrollRes = await queryDb(
      `SELECT p.*, d.name AS created_by_name
       FROM payrolls p
       LEFT JOIN developers d ON p.created_by_developer_id = d.id
       WHERE p.id = $1`,
      [id]
    );

    if (payrollRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Payroll run not found.' }, { status: 404 });
    }

    const payroll = payrollRes.rows[0];

    // Developer salary line items
    const itemsRes = await queryDb(
      `SELECT 
        dp.*,
        d.name AS developer_name,
        d.email AS developer_email,
        COALESCE(r.slug, 'developer') AS developer_role,
        COALESCE(r.name, 'Developer') AS developer_role_name
       FROM developer_payrolls dp
       JOIN developers d ON dp.developer_id = d.id
       LEFT JOIN roles r ON d.role_id = r.id
       WHERE dp.payroll_id = $1
       ORDER BY d.name ASC`,
      [id]
    );

    // Payments recorded against this payroll
    const paymentsRes = await queryDb(
      `SELECT 
        pp.*,
        d.name AS developer_name,
        pdev.name AS processed_by_name
       FROM payroll_payments pp
       JOIN developers d ON pp.developer_id = d.id
       LEFT JOIN developers pdev ON pp.processed_by_developer_id = pdev.id
       WHERE pp.payroll_id = $1
       ORDER BY pp.payment_date DESC`,
      [id]
    );

    return NextResponse.json({
      success: true,
      payroll,
      items: itemsRes.rows,
      payments: paymentsRes.rows,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// PUT: Update payroll status, notes, or developer salary line (ADMIN ONLY)
// ============================================================================
export async function PUT(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'payroll');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message },
        { status: auth.status || 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // 1. Update status or notes on the payroll run itself
    if (body.status || body.notes !== undefined || body.title) {
      const fields = [];
      const values = [];
      let idx = 1;

      if (body.title) {
        fields.push(`title = $${idx++}`);
        values.push(body.title.trim());
      }
      if (body.status) {
        fields.push(`status = $${idx++}`);
        values.push(body.status);
      }
      if (body.notes !== undefined) {
        fields.push(`notes = $${idx++}`);
        values.push(body.notes);
      }

      if (fields.length > 0) {
        values.push(id);
        await queryDb(
          `UPDATE payrolls SET ${fields.join(', ')} WHERE id = $${idx}`,
          values
        );
      }
    }

    // 2. Update individual developer payroll item if provided
    if (body.developer_payroll_id) {
      const { developer_payroll_id, base_salary, bonus, deductions, payment_status, notes } = body;
      const base = parseFloat(base_salary) || 0;
      const bon = parseFloat(bonus) || 0;
      const ded = parseFloat(deductions) || 0;
      const net = Math.max(0, base + bon - ded);

      await queryDb(
        `UPDATE developer_payrolls 
         SET base_salary = $1, bonus = $2, deductions = $3, net_salary = $4,
             payment_status = COALESCE($5, payment_status), notes = COALESCE($6, notes)
         WHERE id = $7 AND payroll_id = $8`,
        [base, bon, ded, net, payment_status || null, notes || null, developer_payroll_id, id]
      );

      // Recalculate total payroll amount
      await queryDb(
        `UPDATE payrolls 
         SET total_amount = (SELECT COALESCE(SUM(net_salary), 0) FROM developer_payrolls WHERE payroll_id = $1)
         WHERE id = $1`,
        [id]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payroll updated successfully.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================================================
// DELETE: Delete payroll run (ADMIN ONLY)
// ============================================================================
export async function DELETE(request, { params }) {
  try {
    const auth = await hasModulePermission(request, 'payroll');
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.message },
        { status: auth.status || 403 }
      );
    }

    const { id } = await params;
    await queryDb('DELETE FROM payrolls WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: 'Payroll run deleted successfully.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
