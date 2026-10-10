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

    let whereConditions = [`wt.website_id = $1`];
    const params = [website.id];

    if (search) {
      params.push(`%${search}%`);
      whereConditions.push(`(wt.name ILIKE $${params.length} OR wt.email ILIKE $${params.length} OR wt.number ILIKE $${params.length})`);
    }

    if (status === 'assigned') {
      whereConditions.push(`ts.id IS NOT NULL`);
    } else if (status === 'unassigned') {
      whereConditions.push(`ts.id IS NULL`);
    } else if (status === 'active') {
      whereConditions.push(`ts.status = 'active'`);
    } else if (status === 'inactive') {
      whereConditions.push(`ts.status = 'inactive'`);
    }

    const query = `
      SELECT 
        wt.id AS teacher_id,
        wt.name AS teacher_name,
        wt.email AS teacher_email,
        wt.number AS teacher_phone,
        wt.gender,
        wt.photo_url,
        wd.title AS designation_name,
        ts.id AS salary_id,
        ts.payroll_id,
        ts.effective_date,
        ts.status AS salary_status,
        ts.remarks,
        ts.created_at AS assigned_at,
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
      FROM website_teachers wt
      LEFT JOIN website_designations wd ON wd.id = wt.designation_id
      LEFT JOIN website_teacher_salaries ts ON ts.teacher_id = wt.id AND ts.website_id = wt.website_id
      LEFT JOIN website_teacher_payrolls tp ON tp.id = ts.payroll_id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY wt.name ASC
    `;

    const result = await queryDb(query, params);
    return NextResponse.json({
      success: true,
      teachers: result.rows,
    });
  } catch (error) {
    console.error('Error fetching teacher salaries:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch teacher salary records.' }, { status: 500 });
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

    const teacherId = body.teacher_id;
    const payrollId = body.payroll_id;
    const effectiveDate = body.effective_date || new Date().toISOString().split('T')[0];
    const status = body.status || 'active';
    const remarks = body.remarks?.trim() || null;

    if (!teacherId || !payrollId) {
      return NextResponse.json({ success: false, message: 'Teacher ID and Payroll Scale ID are required.' }, { status: 400 });
    }

    // Validate teacher exists
    const teacherCheck = await queryDb(
      `SELECT id, name FROM website_teachers WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [teacherId, website.id]
    );
    if (teacherCheck.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Teacher not found.' }, { status: 404 });
    }

    // Validate payroll scale exists
    const payrollCheck = await queryDb(
      `SELECT id, title, basic_salary, house_rent, medical_allowance, transport_allowance, other_allowance,
              provident_fund, tax_deduction, other_deductions
       FROM website_teacher_payrolls WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [payrollId, website.id]
    );
    if (payrollCheck.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Teacher payroll scale not found.' }, { status: 404 });
    }

    const p = payrollCheck.rows[0];
    const gross = Number(p.basic_salary) + Number(p.house_rent) + Number(p.medical_allowance) + Number(p.transport_allowance) + Number(p.other_allowance);
    const deductions = Number(p.provident_fund) + Number(p.tax_deduction) + Number(p.other_deductions);
    const netSalary = Math.max(0, gross - deductions);

    // Upsert into website_teacher_salaries
    const upsertRes = await queryDb(
      `INSERT INTO website_teacher_salaries (
        website_id, teacher_id, payroll_id, effective_date, status, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (website_id, teacher_id) DO UPDATE SET
        payroll_id = EXCLUDED.payroll_id,
        effective_date = EXCLUDED.effective_date,
        status = EXCLUDED.status,
        remarks = EXCLUDED.remarks,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [website.id, teacherId, payrollId, effectiveDate, status, remarks]
    );

    // Sync legacy salary column in website_teachers
    await queryDb(
      `UPDATE website_teachers SET salary = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND website_id = $3`,
      [netSalary, teacherId, website.id]
    );

    return NextResponse.json({
      success: true,
      message: `Payroll scale assigned to ${teacherCheck.rows[0].name} successfully.`,
      salary: upsertRes.rows[0],
    }, { status: 201 });
  } catch (error) {
    console.error('Error assigning teacher salary:', error);
    return NextResponse.json({ success: false, message: 'Failed to assign teacher salary.' }, { status: 500 });
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
    const { teacher_id, payroll_id, status, effective_date, remarks } = body;

    if (!teacher_id) {
      return NextResponse.json({ success: false, message: 'Teacher ID is required.' }, { status: 400 });
    }

    // Check existing
    const existing = await queryDb(
      `SELECT id, payroll_id FROM website_teacher_salaries WHERE website_id = $1 AND teacher_id = $2 LIMIT 1`,
      [website.id, teacher_id]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Salary assignment not found for this teacher.' }, { status: 404 });
    }

    const targetPayrollId = payroll_id || existing.rows[0].payroll_id;

    // Fetch net salary if payroll changed
    const payrollCheck = await queryDb(
      `SELECT basic_salary, house_rent, medical_allowance, transport_allowance, other_allowance,
              provident_fund, tax_deduction, other_deductions
       FROM website_teacher_payrolls WHERE id = $1 AND website_id = $2 LIMIT 1`,
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
      `UPDATE website_teacher_salaries SET
        payroll_id = $1,
        status = COALESCE($2, status),
        effective_date = COALESCE($3, effective_date),
        remarks = COALESCE($4, remarks),
        updated_at = CURRENT_TIMESTAMP
      WHERE website_id = $5 AND teacher_id = $6
      RETURNING *`,
      [targetPayrollId, status, effective_date, remarks, website.id, teacher_id]
    );

    // Sync legacy salary column in website_teachers
    await queryDb(
      `UPDATE website_teachers SET salary = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND website_id = $3`,
      [netSalary, teacher_id, website.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Teacher salary assignment updated successfully.',
      salary: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Error updating teacher salary:', error);
    return NextResponse.json({ success: false, message: 'Failed to update teacher salary assignment.' }, { status: 500 });
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
    const teacherId = searchParams.get('teacher_id');

    if (!teacherId) {
      return NextResponse.json({ success: false, message: 'Teacher ID is required.' }, { status: 400 });
    }

    const deleteRes = await queryDb(
      `DELETE FROM website_teacher_salaries WHERE website_id = $1 AND teacher_id = $2 RETURNING id`,
      [website.id, teacherId]
    );

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Salary assignment not found for this teacher.' }, { status: 404 });
    }

    // Reset legacy salary in website_teachers
    await queryDb(
      `UPDATE website_teachers SET salary = 0.00, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND website_id = $2`,
      [teacherId, website.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Teacher unassigned from payroll scale successfully.',
    });
  } catch (error) {
    console.error('Error deleting teacher salary assignment:', error);
    return NextResponse.json({ success: false, message: 'Failed to unassign teacher from payroll.' }, { status: 500 });
  }
}
