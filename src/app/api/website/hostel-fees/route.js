import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// GET all hostel fees
export async function GET() {
  try {
    const result = await query(`
      SELECT hf.id, hf.student_id, hf.amount, hf.due_date, hf.status, hf.paid_amount, hf.payment_date, hf.created_at,
             s.name as student_name, s.registration_number as student_reg_number
      FROM hostel_fees hf
      JOIN students s ON hf.student_id = s.id
      ORDER BY hf.due_date DESC, s.name ASC
    `);
    const res_data = { fees: result.rows };
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched hostel fees list',
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching hostel fees:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve fees list. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// POST create/invoice a fee
export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 403 });
    }

    const { student_id, amount, due_date, status, paid_amount } = await request.json();

    if (!student_id || amount === undefined || !due_date) {
      return NextResponse.json({
        success: false,
        message: 'Student ID, amount, and due date are required.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    const finalAmount = parseFloat(amount);
    const finalPaidAmount = paid_amount ? parseFloat(paid_amount) : 0.00;
    const finalStatus = status || 'Unpaid';
    const paymentDate = finalStatus === 'Paid' ? new Date() : null;

    const result = await query(
      `INSERT INTO hostel_fees (student_id, amount, due_date, status, paid_amount, payment_date) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, student_id, amount, due_date, status, paid_amount, payment_date`,
      [student_id, finalAmount, new Date(due_date), finalStatus, finalPaidAmount, paymentDate]
    );

    const res_data = { message: 'Hostel fee invoiced successfully.', fee: result.rows[0] };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating fee invoice:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to invoice fee. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
