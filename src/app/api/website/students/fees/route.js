import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool, { query } from '@/lib/db';
import { isAdmin, isCashier, verifyJWT } from '@/lib/auth';
import { triggerMonthlyFeeGeneration } from '@/lib/fees';

// GET student fees logs (Admin/Cashier only)
export async function GET(request) {
  try {
    const authenticated = (await isAdmin()) || (await isCashier());
    if (!authenticated) {
      const res_err_288 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_288?.error || res_err_288?.message || 'An error occurred',
        error: res_err_288?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    // Auto-generate missing monthly fees
    await triggerMonthlyFeeGeneration();

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const classId = searchParams.get('class_id');

    let sql = `
      SELECT 
        sf.*, 
        s.name AS student_name, 
        s.registration_number,
        c.name AS class_name
      FROM student_fees sf
      JOIN students s ON sf.student_id = s.id
      JOIN classes c ON s.class_id = c.id
    `;
    let params = [];
    let conditions = [];

    if (studentId) {
      params.push(studentId);
      conditions.push(`sf.student_id = $${params.length}`);
    }

    if (classId) {
      params.push(classId);
      conditions.push(`s.class_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY sf.due_date DESC, s.registration_number ASC';

    const result = await query(sql, params);
    const res_data_1321 = { fees: result.rows };
      return NextResponse.json({
        success: true,
        message: res_data_1321?.message || 'Successfully fecthed data',
        paylod: res_data_1321
      }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student fees:', error);
    const res_err_1914 = { error: 'Failed to retrieve student fees. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_1914?.error || res_err_1914?.message || 'An error occurred',
        error: res_err_1914?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// POST: Add student fee structure (individual or class-wide) (Admin/Cashier only)
export async function POST(request) {
  try {
    const authenticated = (await isAdmin()) || (await isCashier());
    if (!authenticated) {
      const res_err_2462 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_2462?.error || res_err_2462?.message || 'An error occurred',
        error: res_err_2462?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { student_id, class_id, title, amount, due_date } = await request.json();

    if (!title || amount === undefined || !due_date) {
      const res_err_2931 = { error: 'Fee Title, Amount, and Due Date are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_2931?.error || res_err_2931?.message || 'An error occurred',
        error: res_err_2931?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      const res_err_3366 = { error: 'Amount must be a valid non-negative number.' };
      return NextResponse.json({
        success: false,
        message: res_err_3366?.error || res_err_3366?.message || 'An error occurred',
        error: res_err_3366?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Case 1: Individual student fee log
    if (student_id) {
      const studentCheck = await query('SELECT id FROM students WHERE id = $1', [student_id]);
      if (studentCheck.rows.length === 0) {
        const res_err_3917 = { error: 'Target student not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_3917?.error || res_err_3917?.message || 'An error occurred',
        error: res_err_3917?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
      }

      const newFee = await query(
        `INSERT INTO student_fees (student_id, title, amount, due_date, status, paid_amount)
         VALUES ($1, $2, $3, $4, 'unpaid', 0.00)
         RETURNING *`,
        [student_id, title.trim(), numAmount, due_date]
      );

      const res_data_3166 = { message: 'Individual student fee invoice logged successfully.', fee: newFee.rows[0] };
      return NextResponse.json({
        success: true,
        message: res_data_3166?.message || 'Successfully fecthed data',
        paylod: res_data_3166
      }, { status: 201 });
    }

    // Case 2: Class-wide student fee logs
    if (class_id) {
      const classCheck = await query('SELECT id FROM classes WHERE id = $1', [class_id]);
      if (classCheck.rows.length === 0) {
        const res_err_5113 = { error: 'Target academic class not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_5113?.error || res_err_5113?.message || 'An error occurred',
        error: res_err_5113?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
      }

      // Fetch all registered students in this class
      const studentsInClass = await query('SELECT id FROM students WHERE class_id = $1 AND is_registered = TRUE', [class_id]);
      
      if (studentsInClass.rows.length === 0) {
        const res_data_4108 = { message: 'Class selected has no registered students. Invoices not created.' };
      return NextResponse.json({
        success: true,
        message: res_data_4108?.message || 'Successfully fecthed data',
        paylod: res_data_4108
      }, { status: 200 });
      }

      for (const std of studentsInClass.rows) {
        await query(
          `INSERT INTO student_fees (student_id, title, amount, due_date, status, paid_amount)
           VALUES ($1, $2, $3, $4, 'unpaid', 0.00)`,
          [std.id, title.trim(), numAmount, due_date]
        );
      }

      const res_data_4797 = { message: `Class fee invoices generated successfully for ${studentsInClass.rows.length} students.` };
      return NextResponse.json({
        success: true,
        message: res_data_4797?.message || 'Successfully fecthed data',
        paylod: res_data_4797
      }, { status: 201 });
    }

    const res_err_6791 = { error: 'Either Student ID or Class ID must be specified to assign fees.' };
      return NextResponse.json({
        success: false,
        message: res_err_6791?.error || res_err_6791?.message || 'An error occurred',
        error: res_err_6791?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
  } catch (error) {
    console.error('Error generating fees:', error);
    const res_err_7220 = { error: 'Failed to generate student fees. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_7220?.error || res_err_7220?.message || 'An error occurred',
        error: res_err_7220?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// PUT: Process student fee payments (Admin/Cashier only)
export async function PUT(request) {
  let client;
  try {
    const authenticated = (await isAdmin()) || (await isCashier());
    if (!authenticated) {
      const res_err_7756 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_7756?.error || res_err_7756?.message || 'An error occurred',
        error: res_err_7756?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('fit-staff')?.value;
    let staffEmail = null;
    if (token) {
      const decoded = verifyJWT(token);
      staffEmail = decoded?.email || null;
    }

    const { fee_id, paid_amount, payment_method, transaction_id, remarks } = await request.json();

    if (!fee_id || paid_amount === undefined) {
      const res_err_8233 = { error: 'Fee ID and Paid Amount are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_8233?.error || res_err_8233?.message || 'An error occurred',
        error: res_err_8233?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    const numPaid = parseFloat(paid_amount);
    if (isNaN(numPaid) || numPaid <= 0) {
      const res_err_8659 = { error: 'Paid Amount must be a valid positive number.' };
      return NextResponse.json({
        success: false,
        message: res_err_8659?.error || res_err_8659?.message || 'An error occurred',
        error: res_err_8659?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Connect client for transaction
    client = await pool.connect();
    await client.query('BEGIN');

    // Fetch existing fee details
    const feeRes = await client.query('SELECT * FROM student_fees WHERE id = $1 FOR UPDATE', [fee_id]);
    if (feeRes.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
      const res_err_9370 = { error: 'Fee invoice record not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_9370?.error || res_err_9370?.message || 'An error occurred',
        error: res_err_9370?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const fee = feeRes.rows[0];
    const totalAmount = parseFloat(fee.amount);
    const prevPaid = parseFloat(fee.paid_amount);
    const newCumulativePaid = Math.round((prevPaid + numPaid) * 100) / 100;

    if (newCumulativePaid > totalAmount) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
      const res_err_10035 = { error: `Paid amount exceeds the remaining balance. Total due: ৳${(totalAmount - prevPaid).toFixed(2)}` };
      return NextResponse.json({
        success: false,
        message: res_err_10035?.error || res_err_10035?.message || 'An error occurred',
        error: res_err_10035?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    let newStatus = 'unpaid';
    let paymentDate = fee.payment_date;

    if (newCumulativePaid >= totalAmount) {
      newStatus = 'paid';
      paymentDate = new Date();
    } else if (newCumulativePaid > 0) {
      newStatus = 'partially paid';
    }

    const result = await client.query(
      `UPDATE student_fees
       SET paid_amount = $1,
           status = $2,
           payment_date = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [newCumulativePaid, newStatus, paymentDate, fee_id]
    );

    // If Re-Admission fee is paid in full, activate and register the student account
    if (newStatus === 'paid' && (fee.title || '').toLowerCase().includes('re-admission')) {
      await client.query(
        `UPDATE students 
         SET is_active = TRUE, is_registered = TRUE, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [fee.student_id]
      );
    }

    // Log payment transaction details
    const method = payment_method ? payment_method.trim() : 'Cash';
    await client.query(
      `INSERT INTO student_fee_payments (student_fee_id, amount_paid, payment_method, transaction_id, remarks, billed_by, payment_date)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [fee_id, numPaid, method, transaction_id ? transaction_id.trim() : null, remarks ? remarks.trim() : null, staffEmail]
    );

    // Insert into unified ledger payment_transactions
    const txnNo = `TXN-FEE-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    try {
      await client.query(
        `INSERT INTO payment_transactions (
          transaction_number, payment_method, amount, transaction_type, category, reference_id, status, remarks, billed_by, payment_date
        ) VALUES ($1, $2, $3, 'Credit', 'Student Fee', $4, 'Success', $5, $6, CURRENT_TIMESTAMP)`,
        [txnNo, method, numPaid, fee.student_id, remarks ? remarks.trim() : `Collected payment for ${fee.title}`, staffEmail]
      );
    } catch (txnErr) {
      console.error('Error logging payment_transactions:', txnErr);
    }

    // Also log in exam_fee_payments if this is an exam fee
    if (fee.title.startsWith('Exam Fee:')) {
      const examName = fee.title.replace(/^Exam Fee:\s*/i, '').trim();
      const examCheck = await client.query('SELECT id FROM exams WHERE LOWER(name) = LOWER($1)', [examName]);
      if (examCheck.rows.length > 0) {
        const examId = examCheck.rows[0].id;
        await client.query(
          `INSERT INTO exam_fee_payments (fee_id, exam_id, student_id, amount, payment_method, transaction_id, remarks)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            fee_id,
            examId,
            fee.student_id,
            numPaid,
            method,
            transaction_id ? transaction_id.trim() : null,
            remarks ? remarks.trim() : null
          ]
        );
      }
    }

    await client.query('COMMIT');
    client.release();
    client = null;

    const res_data_8290 = {
      message: 'Payment processed successfully.',
      fee: result.rows[0]
    };
      return NextResponse.json({
        success: true,
        message: res_data_8290?.message || 'Successfully fecthed data',
        paylod: res_data_8290
      }, { status: 200 });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('Error during rollback:', rollbackErr);
      }
      client.release();
    }
    console.error('Error logging payment:', error);
    const res_err_12159 = { error: 'Failed to process payment. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_12159?.error || res_err_12159?.message || 'An error occurred',
        error: res_err_12159?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
