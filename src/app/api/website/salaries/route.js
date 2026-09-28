import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isCashier } from '@/lib/auth';

export async function GET(request) {
  try {
    const authenticated = (await isAdmin()) || (await isCashier());
    if (!authenticated) {
      const res_err_244 = { error: 'Unauthorized. Admins or Cashiers only.' };
      return NextResponse.json({
        success: false,
        message: res_err_244?.error || res_err_244?.message || 'An error occurred',
        error: res_err_244?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let sql;
    let result;

    if (type === 'staff') {
      sql = `
        SELECT s.*, 
               st.name as staff_name,
               st.role as staff_role
        FROM staff_salaries s
        LEFT JOIN staffs st ON s.staff_id = st.id
        ORDER BY s.id DESC
      `;
      result = await query(sql);
    } else {
      sql = `
        SELECT s.*, 
               t.name as teacher_name
        FROM salaries s
        LEFT JOIN teachers t ON s.teacher_id = t.id
      `;
      if (type === 'teacher') {
        sql += ` WHERE s.teacher_id IS NOT NULL`;
      }
      sql += ` ORDER BY s.id DESC`;
      result = await query(sql);
    }
    const res_data_784 = { salaries: result.rows };
    return NextResponse.json({
      success: true,
      message: res_data_784?.message || 'Successfully fetched data',
      paylod: res_data_784
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching salaries:', error);
    const res_err_1371 = { error: 'Internal server error.' };
    return NextResponse.json({
      success: false,
      message: res_err_1371?.error || res_err_1371?.message || 'An error occurred',
      error: res_err_1371?.error || 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

export async function PUT(request) {
  let client;
  try {
    const authenticated = (await isAdmin()) || (await isCashier());
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { salary_id, type, status } = await request.json();

    if (!salary_id || !type || !status || !['Paid', 'Pending'].includes(status)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Salary ID, Type (teacher/staff), and status (Paid/Pending) are required.' 
      }, { status: 400 });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const table = type === 'staff' ? 'staff_salaries' : 'salaries';

    const result = await client.query(`
      UPDATE ${table}
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [status, parseInt(salary_id, 10)]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return NextResponse.json({ success: false, error: 'Salary record not found.' }, { status: 404 });
    }

    // Log payment transaction details if marked as Paid
    if (status === 'Paid') {
      const salary = result.rows[0];
      const netPay = parseFloat(salary.basic) + parseFloat(salary.allowance) - parseFloat(salary.deductions);
      const remarksText = `Paid ${type} salary for record #${salary.id} month ${salary.month}`;

      let paymentId;
      if (type === 'staff') {
        const paymentRes = await client.query(`
          INSERT INTO staff_salary_payments (staff_salary_id, amount_paid, payment_method, remarks)
          VALUES ($1, $2, 'Bank Transfer', $3)
          RETURNING id
        `, [salary.id, netPay, remarksText]);
        paymentId = paymentRes.rows[0].id;
      } else {
        const paymentRes = await client.query(`
          INSERT INTO teacher_salary_payments (salary_id, amount_paid, payment_method, remarks)
          VALUES ($1, $2, 'Bank Transfer', $3)
          RETURNING id
        `, [salary.id, netPay, remarksText]);
        paymentId = paymentRes.rows[0].id;
      }

      const transactionNo = `TXN-PAY-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      await client.query(`
        INSERT INTO payment_transactions (
          transaction_number, payment_method, amount, transaction_type, category, 
          reference_id, status, remarks, payment_date
        ) VALUES ($1, 'Bank Transfer', $2, 'Debit', $3, $4, 'Success', $5, CURRENT_TIMESTAMP)
      `, [
        transactionNo,
        netPay,
        type === 'staff' ? 'Staff Salary' : 'Teacher Salary',
        paymentId,
        remarksText
      ]);
    }

    await client.query('COMMIT');
    client.release();

    return NextResponse.json({
      success: true,
      message: `Salary payment status updated to ${status} successfully.`,
      paylod: { salary: result.rows[0] }
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('Error during rollback:', rollbackErr);
      }
      client.release();
    }
    console.error('Error updating salary status:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
