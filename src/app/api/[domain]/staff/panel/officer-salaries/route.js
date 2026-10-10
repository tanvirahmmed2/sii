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
    const status = searchParams.get('status') || 'all'; // 'all', 'assigned', 'unassigned', 'active', 'inactive'
    const department = searchParams.get('department') || 'all';

    let whereConditions = [`wo.website_id = $1`];
    const params = [website.id];

    if (search) {
      params.push(`%${search}%`);
      whereConditions.push(`(wo.name ILIKE $${params.length} OR wo.email ILIKE $${params.length} OR wo.phone ILIKE $${params.length} OR wo.designation ILIKE $${params.length})`);
    }

    if (department && department !== 'all') {
      params.push(department);
      whereConditions.push(`wo.department = $${params.length}`);
    }

    if (status === 'assigned') {
      whereConditions.push(`os.id IS NOT NULL`);
    } else if (status === 'unassigned') {
      whereConditions.push(`os.id IS NULL`);
    } else if (status === 'active') {
      whereConditions.push(`os.status = 'active'`);
    } else if (status === 'inactive') {
      whereConditions.push(`os.status = 'inactive'`);
    }

    const query = `
      SELECT 
        wo.id AS officer_id,
        wo.name AS officer_name,
        wo.email AS officer_email,
        wo.phone AS officer_phone,
        wo.department,
        wo.designation,
        wo.gender,
        wo.photo_url,
        os.id AS salary_id,
        os.payroll_id,
        os.effective_date,
        os.status AS salary_status,
        os.remarks,
        os.created_at AS assigned_at,
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
      FROM website_officers wo
      LEFT JOIN website_officer_salaries os ON os.officer_id = wo.id AND os.website_id = wo.website_id
      LEFT JOIN website_officer_payrolls op ON op.id = os.payroll_id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY wo.name ASC
    `;

    const result = await queryDb(query, params);
    return NextResponse.json({
      success: true,
      officers: result.rows,
    });
  } catch (error) {
    console.error('Error fetching officer salaries:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch officer salary records.' }, { status: 500 });
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

    const officerId = body.officer_id;
    const payrollId = body.payroll_id;
    const effectiveDate = body.effective_date || new Date().toISOString().split('T')[0];
    const status = body.status || 'active';
    const remarks = body.remarks?.trim() || null;

    if (!officerId || !payrollId) {
      return NextResponse.json({ success: false, message: 'Officer ID and Payroll Scale ID are required.' }, { status: 400 });
    }

    // Validate officer exists
    const officerCheck = await queryDb(
      `SELECT id, name FROM website_officers WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [officerId, website.id]
    );
    if (officerCheck.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Officer not found.' }, { status: 404 });
    }

    // Validate payroll scale exists
    const payrollCheck = await queryDb(
      `SELECT id, title, basic_salary, house_rent, medical_allowance, transport_allowance, other_allowance,
              provident_fund, tax_deduction, other_deductions
       FROM website_officer_payrolls WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [payrollId, website.id]
    );
    if (payrollCheck.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Officer payroll scale not found.' }, { status: 404 });
    }

    const p = payrollCheck.rows[0];
    const gross = Number(p.basic_salary) + Number(p.house_rent) + Number(p.medical_allowance) + Number(p.transport_allowance) + Number(p.other_allowance);
    const deductions = Number(p.provident_fund) + Number(p.tax_deduction) + Number(p.other_deductions);
    const netSalary = Math.max(0, gross - deductions);

    // Upsert into website_officer_salaries
    const upsertRes = await queryDb(
      `INSERT INTO website_officer_salaries (
        website_id, officer_id, payroll_id, effective_date, status, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (website_id, officer_id) DO UPDATE SET
        payroll_id = EXCLUDED.payroll_id,
        effective_date = EXCLUDED.effective_date,
        status = EXCLUDED.status,
        remarks = EXCLUDED.remarks,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [website.id, officerId, payrollId, effectiveDate, status, remarks]
    );

    // Sync legacy salary column in website_officers
    await queryDb(
      `UPDATE website_officers SET salary = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND website_id = $3`,
      [netSalary, officerId, website.id]
    );

    return NextResponse.json({
      success: true,
      message: `Payroll scale assigned to ${officerCheck.rows[0].name} successfully.`,
      salary: upsertRes.rows[0],
    }, { status: 201 });
  } catch (error) {
    console.error('Error assigning officer salary:', error);
    return NextResponse.json({ success: false, message: 'Failed to assign officer salary.' }, { status: 500 });
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
    const { officer_id, payroll_id, status, effective_date, remarks } = body;

    if (!officer_id) {
      return NextResponse.json({ success: false, message: 'Officer ID is required.' }, { status: 400 });
    }

    // Check existing
    const existing = await queryDb(
      `SELECT id, payroll_id FROM website_officer_salaries WHERE website_id = $1 AND officer_id = $2 LIMIT 1`,
      [website.id, officer_id]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Salary assignment not found for this officer.' }, { status: 404 });
    }

    const targetPayrollId = payroll_id || existing.rows[0].payroll_id;

    // Fetch net salary if payroll changed
    const payrollCheck = await queryDb(
      `SELECT basic_salary, house_rent, medical_allowance, transport_allowance, other_allowance,
              provident_fund, tax_deduction, other_deductions
       FROM website_officer_payrolls WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [targetPayrollId, website.id]
    );
    if (payrollCheck.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Target payroll scale not found.' }, { status: 404 });
    }

    const p = payrollCheck.rows[0];
    const gross = Number(p.basic_salary) + Number(p.house_rent) + Number(p.medical_allowance) + Number(p.transport_allowance) + Number(p.other_allowance);
    const deductions = Number(p.provident_fund) + Number(p.tax_deduction) + Number(p.other_deductions);
    const netSalary = Math.max(0, gross - deductions);

    const updateRes = await queryDb(
      `UPDATE website_officer_salaries SET
        payroll_id = $1,
        status = COALESCE($2, status),
        effective_date = COALESCE($3, effective_date),
        remarks = COALESCE($4, remarks),
        updated_at = CURRENT_TIMESTAMP
      WHERE website_id = $5 AND officer_id = $6
      RETURNING *`,
      [targetPayrollId, status, effective_date, remarks, website.id, officer_id]
    );

    // Sync legacy salary column in website_officers
    await queryDb(
      `UPDATE website_officers SET salary = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND website_id = $3`,
      [netSalary, officer_id, website.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Officer salary assignment updated successfully.',
      salary: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Error updating officer salary:', error);
    return NextResponse.json({ success: false, message: 'Failed to update officer salary assignment.' }, { status: 500 });
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
    const officerId = searchParams.get('officer_id');

    if (!officerId) {
      return NextResponse.json({ success: false, message: 'Officer ID is required.' }, { status: 400 });
    }

    const deleteRes = await queryDb(
      `DELETE FROM website_officer_salaries WHERE website_id = $1 AND officer_id = $2 RETURNING id`,
      [website.id, officerId]
    );

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Salary assignment not found for this officer.' }, { status: 404 });
    }

    // Reset legacy salary in website_officers
    await queryDb(
      `UPDATE website_officers SET salary = 0.00, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND website_id = $2`,
      [officerId, website.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Officer unassigned from payroll scale successfully.',
    });
  } catch (error) {
    console.error('Error deleting officer salary assignment:', error);
    return NextResponse.json({ success: false, message: 'Failed to unassign officer from payroll.' }, { status: 500 });
  }
}
