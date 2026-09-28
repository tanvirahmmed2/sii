import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// GET all classes and their configured monthly tuition fee rates
export async function GET() {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }

    const sql = `
      SELECT 
        c.id AS class_id, 
        c.name AS class_name, 
        c.numeric_name,
        cmf.id AS monthly_fee_id, 
        COALESCE(cmf.amount, 0.00) AS amount
      FROM classes c
      LEFT JOIN class_monthly_fees cmf ON c.id = cmf.class_id
      ORDER BY c.numeric_name ASC, c.name ASC
    `;
    const result = await query(sql);

    return NextResponse.json({
      success: true,
      paylod: {
        monthlyFees: result.rows
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching monthly fees:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST or PUT: Upsert monthly tuition fee rate for a class
export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }

    const { class_id, amount } = await request.json();

    if (!class_id || amount === undefined) {
      return NextResponse.json({ success: false, error: 'Class ID and Amount are required.' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return NextResponse.json({ success: false, error: 'Amount must be a non-negative number.' }, { status: 400 });
    }

    const result = await query(`
      INSERT INTO class_monthly_fees (class_id, amount)
      VALUES ($1, $2)
      ON CONFLICT (class_id)
      DO UPDATE SET amount = EXCLUDED.amount, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [parseInt(class_id, 10), parsedAmount]);

    return NextResponse.json({
      success: true,
      message: 'Monthly fee rate configured successfully.',
      paylod: {
        monthlyFee: result.rows[0]
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error configuring monthly fee:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
