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
    const search = searchParams.get('search')?.trim() || '';

    let whereClause = `WHERE op.website_id = $1`;
    const params = [website.id];

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (op.title ILIKE $${params.length} OR op.grade_code ILIKE $${params.length})`;
    }

    const query = `
      SELECT 
        op.id,
        op.title,
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
         (op.provident_fund + op.tax_deduction + op.other_deductions)) AS net_salary,
        op.notes,
        op.is_active,
        op.created_at,
        op.updated_at,
        COUNT(os.id)::int AS assigned_officers_count
      FROM website_officer_payrolls op
      LEFT JOIN website_officer_salaries os ON os.payroll_id = op.id
      ${whereClause}
      GROUP BY op.id
      ORDER BY op.basic_salary DESC, op.title ASC
    `;

    const result = await queryDb(query, params);
    return NextResponse.json({
      success: true,
      payrolls: result.rows,
    });
  } catch (error) {
    console.error('Error fetching officer payrolls:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch officer payroll scales.' }, { status: 500 });
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

    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ success: false, message: 'Payroll title is required.' }, { status: 400 });
    }

    const gradeCode = body.grade_code?.trim() || null;
    const basicSalary = Math.max(0, parseFloat(body.basic_salary) || 0);
    const houseRent = Math.max(0, parseFloat(body.house_rent) || 0);
    const medicalAllowance = Math.max(0, parseFloat(body.medical_allowance) || 0);
    const transportAllowance = Math.max(0, parseFloat(body.transport_allowance) || 0);
    const otherAllowance = Math.max(0, parseFloat(body.other_allowance) || 0);
    const providentFund = Math.max(0, parseFloat(body.provident_fund) || 0);
    const taxDeduction = Math.max(0, parseFloat(body.tax_deduction) || 0);
    const otherDeductions = Math.max(0, parseFloat(body.other_deductions) || 0);
    const notes = body.notes?.trim() || null;
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : true;

    // Check duplicate title
    const existing = await queryDb(
      `SELECT id FROM website_officer_payrolls WHERE website_id = $1 AND LOWER(title) = LOWER($2) LIMIT 1`,
      [website.id, title]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ success: false, message: 'An officer payroll scale with this title already exists.' }, { status: 409 });
    }

    const insertRes = await queryDb(
      `INSERT INTO website_officer_payrolls (
        website_id, title, grade_code, basic_salary, house_rent, medical_allowance, transport_allowance, 
        other_allowance, provident_fund, tax_deduction, other_deductions, notes, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        website.id, title, gradeCode, basicSalary, houseRent, medicalAllowance, transportAllowance,
        otherAllowance, providentFund, taxDeduction, otherDeductions, notes, isActive
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Officer payroll scale created successfully.',
      payroll: insertRes.rows[0],
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating officer payroll:', error);
    return NextResponse.json({ success: false, message: 'Failed to create officer payroll scale.' }, { status: 500 });
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
    const id = body.id;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Payroll scale ID is required.' }, { status: 400 });
    }

    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ success: false, message: 'Payroll title is required.' }, { status: 400 });
    }

    // Check conflict
    const conflict = await queryDb(
      `SELECT id FROM website_officer_payrolls WHERE website_id = $1 AND LOWER(title) = LOWER($2) AND id != $3 LIMIT 1`,
      [website.id, title, id]
    );
    if (conflict.rows.length > 0) {
      return NextResponse.json({ success: false, message: 'Another officer payroll scale already uses this title.' }, { status: 409 });
    }

    const gradeCode = body.grade_code?.trim() || null;
    const basicSalary = Math.max(0, parseFloat(body.basic_salary) || 0);
    const houseRent = Math.max(0, parseFloat(body.house_rent) || 0);
    const medicalAllowance = Math.max(0, parseFloat(body.medical_allowance) || 0);
    const transportAllowance = Math.max(0, parseFloat(body.transport_allowance) || 0);
    const otherAllowance = Math.max(0, parseFloat(body.other_allowance) || 0);
    const providentFund = Math.max(0, parseFloat(body.provident_fund) || 0);
    const taxDeduction = Math.max(0, parseFloat(body.tax_deduction) || 0);
    const otherDeductions = Math.max(0, parseFloat(body.other_deductions) || 0);
    const notes = body.notes !== undefined ? (body.notes?.trim() || null) : undefined;
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : undefined;

    const updateRes = await queryDb(
      `UPDATE website_officer_payrolls SET
        title = $1,
        grade_code = $2,
        basic_salary = $3,
        house_rent = $4,
        medical_allowance = $5,
        transport_allowance = $6,
        other_allowance = $7,
        provident_fund = $8,
        tax_deduction = $9,
        other_deductions = $10,
        notes = COALESCE($11, notes),
        is_active = COALESCE($12, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13 AND website_id = $14
      RETURNING *`,
      [
        title, gradeCode, basicSalary, houseRent, medicalAllowance, transportAllowance,
        otherAllowance, providentFund, taxDeduction, otherDeductions, notes, isActive, id, website.id
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Officer payroll scale not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Officer payroll scale updated successfully.',
      payroll: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Error updating officer payroll:', error);
    return NextResponse.json({ success: false, message: 'Failed to update officer payroll scale.' }, { status: 500 });
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
      return NextResponse.json({ success: false, message: 'Payroll scale ID is required.' }, { status: 400 });
    }

    // Check if any officers are currently assigned
    const assignedCount = await queryDb(
      `SELECT COUNT(*)::int AS count FROM website_officer_salaries WHERE payroll_id = $1 AND website_id = $2`,
      [id, website.id]
    );
    if (assignedCount.rows[0].count > 0) {
      return NextResponse.json({
        success: false,
        message: `Cannot delete scale: ${assignedCount.rows[0].count} officer(s) are actively assigned to it. Reassign or remove them first.`,
      }, { status: 400 });
    }

    const deleteRes = await queryDb(
      `DELETE FROM website_officer_payrolls WHERE id = $1 AND website_id = $2 RETURNING id, title`,
      [id, website.id]
    );

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Officer payroll scale not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Officer payroll scale "${deleteRes.rows[0].title}" deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting officer payroll:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete officer payroll scale.' }, { status: 500 });
  }
}
