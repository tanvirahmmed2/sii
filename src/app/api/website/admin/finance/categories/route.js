import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// GET categories
export async function GET() {
  try {
    const expenses = await query('SELECT * FROM expense_categories ORDER BY name ASC');
    const incomes = await query('SELECT * FROM income_categories ORDER BY name ASC');

    return NextResponse.json({
      success: true,
      paylod: {
        expenseCategories: expenses.rows,
        incomeCategories: incomes.rows
      }
    });
  } catch (error) {
    console.error('Error fetching finance categories:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST create category
export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { name, description, type } = await request.json(); // type = 'Income' or 'Expense'

    if (!name || !type || !['Income', 'Expense'].includes(type)) {
      return NextResponse.json({ success: false, error: 'Name and valid type (Income/Expense) are required.' }, { status: 400 });
    }

    let result;
    if (type === 'Expense') {
      result = await query(`
        INSERT INTO expense_categories (name, description)
        VALUES ($1, $2)
        RETURNING *
      `, [name.trim(), description?.trim() || null]);
    } else {
      result = await query(`
        INSERT INTO income_categories (name, description)
        VALUES ($1, $2)
        RETURNING *
      `, [name.trim(), description?.trim() || null]);
    }

    return NextResponse.json({
      success: true,
      message: 'Category created successfully.',
      paylod: { category: result.rows[0] }
    });
  } catch (error) {
    console.error('Error creating finance category:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
