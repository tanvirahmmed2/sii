import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// GET Expenses
export async function GET() {
  try {
    const result = await query(`
      SELECT e.*, c.name AS category_name
      FROM expenses e
      JOIN expense_categories c ON e.category_id = c.id
      ORDER BY e.expense_date DESC, e.id DESC
    `);
    return NextResponse.json({
      success: true,
      paylod: { expenses: result.rows }
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST Create Expense (Admin only)
export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { category_id, title, amount, expense_date, paid_by, description } = await request.json();

    if (!category_id || !title || !amount || !expense_date) {
      return NextResponse.json({ success: false, error: 'Category, title, amount, and date are required.' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Amount must be a positive number.' }, { status: 400 });
    }

    // Begin transaction block by using query directly or just standard queries.
    // We will do simple sequential query executions.
    
    // 1. Insert into expenses
    const expResult = await query(`
      INSERT INTO expenses (category_id, title, amount, expense_date, paid_by, description)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [category_id, title.trim(), parsedAmount, expense_date, paid_by?.trim() || null, description?.trim() || null]);

    const expense = expResult.rows[0];

    // 2. Generate transaction number
    const transactionNo = `TXN-EXP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    // 3. Insert into payment_transactions (Debit transaction)
    await query(`
      INSERT INTO payment_transactions (
        transaction_number, payment_method, amount, transaction_type, category, 
        reference_id, status, remarks, payment_date
      ) VALUES ($1, $2, $3, 'Debit', 'Expense', $4, 'Success', $5, $6)
    `, [
      transactionNo,
      'Cash', // default
      parsedAmount,
      expense.id,
      `Logged expense: ${title}`,
      new Date(expense_date)
    ]);

    return NextResponse.json({
      success: true,
      message: 'Expense logged successfully.',
      paylod: { expense }
    });
  } catch (error) {
    console.error('Error logging expense:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
