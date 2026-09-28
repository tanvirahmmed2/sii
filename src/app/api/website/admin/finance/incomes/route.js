import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// GET Incomes
export async function GET() {
  try {
    const result = await query(`
      SELECT i.*, c.name AS category_name
      FROM incomes i
      JOIN income_categories c ON i.category_id = c.id
      ORDER BY i.income_date DESC, i.id DESC
    `);
    return NextResponse.json({
      success: true,
      paylod: { incomes: result.rows }
    });
  } catch (error) {
    console.error('Error fetching incomes:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST Create Income (Admin only)
export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { category_id, title, amount, income_date, received_by, description } = await request.json();

    if (!category_id || !title || !amount || !income_date) {
      return NextResponse.json({ success: false, error: 'Category, title, amount, and date are required.' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Amount must be a positive number.' }, { status: 400 });
    }

    // 1. Insert into incomes
    const incResult = await query(`
      INSERT INTO incomes (category_id, title, amount, income_date, received_by, description)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [category_id, title.trim(), parsedAmount, income_date, received_by?.trim() || null, description?.trim() || null]);

    const income = incResult.rows[0];

    // 2. Generate transaction number
    const transactionNo = `TXN-INC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    // 3. Insert into payment_transactions (Credit transaction)
    await query(`
      INSERT INTO payment_transactions (
        transaction_number, payment_method, amount, transaction_type, category, 
        reference_id, status, remarks, payment_date
      ) VALUES ($1, $2, $3, 'Credit', 'Income', $4, 'Success', $5, $6)
    `, [
      transactionNo,
      'Cash',
      parsedAmount,
      income.id,
      `Logged income: ${title}`,
      new Date(income_date)
    ]);

    return NextResponse.json({
      success: true,
      message: 'Income logged successfully.',
      paylod: { income }
    });
  } catch (error) {
    console.error('Error logging income:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
