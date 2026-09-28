import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET all classes and their configured tuition fee rates (Public route)
export async function GET() {
  try {
    const sql = `
      SELECT 
        c.name AS class_name, 
        c.numeric_name,
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
    console.error('Error fetching public monthly fees:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
