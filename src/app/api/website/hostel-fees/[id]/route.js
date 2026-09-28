import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// PUT update fee details or record payment
export async function PUT(request, { params }) {
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

    const { id } = await params;
    const { amount, due_date, status, paid_amount, payment_date } = await request.json();

    if (amount === undefined || !due_date || !status) {
      return NextResponse.json({
        success: false,
        message: 'Amount, due date, and status are required.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    const finalAmount = parseFloat(amount);
    const finalPaidAmount = parseFloat(paid_amount) || 0.00;
    
    // Set auto payment date if status changed to Paid and no payment date was provided
    let finalPaymentDate = payment_date ? new Date(payment_date) : null;
    if (status === 'Paid' && !finalPaymentDate) {
      finalPaymentDate = new Date();
    }

    const result = await query(
      `UPDATE hostel_fees 
       SET amount = $1, due_date = $2, status = $3, paid_amount = $4, payment_date = $5, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $6 
       RETURNING id, student_id, amount, due_date, status, paid_amount, payment_date`,
      [finalAmount, new Date(due_date), status, finalPaidAmount, finalPaymentDate, id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Fee invoice record not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    const res_data = {
      message: 'Hostel fee details updated successfully.',
      fee: result.rows[0]
    };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating fee:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update fee details. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// DELETE a fee invoice
export async function DELETE(request, { params }) {
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

    const { id } = await params;
    const result = await query('DELETE FROM hostel_fees WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Fee record not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    const res_data = { message: 'Fee record deleted successfully.' };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting fee:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete fee. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
