import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isCashier } from '@/lib/auth';

// GET student fines (Admin, Cashier and Students)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');

    let sql = `
      SELECT 
        sf.*, 
        s.name AS student_name, 
        s.registration_number,
        fee.title AS linked_fee_title
      FROM student_fines sf
      JOIN students s ON sf.student_id = s.id
      LEFT JOIN student_fees fee ON sf.fee_id = fee.id
    `;
    let params = [];
    let conditions = [];

    if (studentId) {
      params.push(studentId);
      conditions.push(`sf.student_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY sf.created_at DESC, s.registration_number ASC';

    const result = await query(sql, params);
    const res_data_1018 = { fines: result.rows };
      return NextResponse.json({
        success: true,
        message: res_data_1018?.message || 'Successfully fecthed data',
        paylod: res_data_1018
      }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student fines:', error);
    const res_err_1385 = { error: 'Failed to retrieve student fines. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_1385?.error || res_err_1385?.message || 'An error occurred',
        error: res_err_1385?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// POST: Add student fine (Admin/Cashier only)
export async function POST(request) {
  try {
    const authenticated = (await isAdmin()) || (await isCashier());
    if (!authenticated) {
      const res_err_1898 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_1898?.error || res_err_1898?.message || 'An error occurred',
        error: res_err_1898?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { student_id, fee_id, title, amount } = await request.json();

    if (!student_id || !title || amount === undefined) {
      const res_err_2357 = { error: 'Student ID, Fine Title, and Fine Amount are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_2357?.error || res_err_2357?.message || 'An error occurred',
        error: res_err_2357?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      const res_err_2800 = { error: 'Fine Amount must be a valid non-negative number.' };
      return NextResponse.json({
        success: false,
        message: res_err_2800?.error || res_err_2800?.message || 'An error occurred',
        error: res_err_2800?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Verify student exists
    const studentCheck = await query('SELECT id FROM students WHERE id = $1', [student_id]);
    if (studentCheck.rows.length === 0) {
      const res_err_3315 = { error: 'Target student not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_3315?.error || res_err_3315?.message || 'An error occurred',
        error: res_err_3315?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    // Verify fee exists if linked
    if (fee_id) {
      const feeCheck = await query('SELECT id FROM student_fees WHERE id = $1 AND student_id = $2', [fee_id, student_id]);
      if (feeCheck.rows.length === 0) {
        const res_err_3861 = { error: 'Linked student fee invoice not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_3861?.error || res_err_3861?.message || 'An error occurred',
        error: res_err_3861?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
      }
    }

    const result = await query(
      `INSERT INTO student_fines (student_id, fee_id, title, amount, status)
       VALUES ($1, $2, $3, $4, 'Unpaid')
       RETURNING *`,
      [student_id, fee_id ? parseInt(fee_id, 10) : null, title.trim(), numAmount]
    );

    const res_data_3118 = { message: 'Fine logged successfully for student.', fine: result.rows[0] };
      return NextResponse.json({
        success: true,
        message: res_data_3118?.message || 'Successfully fecthed data',
        paylod: res_data_3118
      }, { status: 201 });
  } catch (error) {
    console.error('Error logging student fine:', error);
    const res_err_4927 = { error: 'Failed to log fine. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_4927?.error || res_err_4927?.message || 'An error occurred',
        error: res_err_4927?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// PUT: Update student fine payment status (Admin/Cashier only)
export async function PUT(request) {
  try {
    const authenticated = (await isAdmin()) || (await isCashier());
    if (!authenticated) {
      const res_err_5442 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_5442?.error || res_err_5442?.message || 'An error occurred',
        error: res_err_5442?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { fine_id, status } = await request.json();

    if (!fine_id || !status) {
      const res_err_5857 = { error: 'Fine ID and payment status are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_5857?.error || res_err_5857?.message || 'An error occurred',
        error: res_err_5857?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    if (status !== 'Paid' && status !== 'Unpaid') {
      const res_err_6252 = { error: "Status must be either 'Paid' or 'Unpaid'." };
      return NextResponse.json({
        success: false,
        message: res_err_6252?.error || res_err_6252?.message || 'An error occurred',
        error: res_err_6252?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    const checkExist = await query('SELECT id FROM student_fines WHERE id = $1', [fine_id]);
    if (checkExist.rows.length === 0) {
      const res_err_6729 = { error: 'Fine record not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_6729?.error || res_err_6729?.message || 'An error occurred',
        error: res_err_6729?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const result = await query(
      `UPDATE student_fines
       SET status = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, fine_id]
    );

    const res_data_4742 = {
      message: `Fine marked as ${status} successfully.`,
      fine: result.rows[0]
    };
      return NextResponse.json({
        success: true,
        message: res_data_4742?.message || 'Successfully fecthed data',
        paylod: res_data_4742
      }, { status: 200 });
  } catch (error) {
    console.error('Error updating fine status:', error);
    const res_err_7728 = { error: 'Failed to update fine status. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_7728?.error || res_err_7728?.message || 'An error occurred',
        error: res_err_7728?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
