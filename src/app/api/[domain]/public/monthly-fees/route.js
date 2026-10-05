import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';

// GET all classes and their configured tuition fee rates (Public route)
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Tenant website not found' }, { status: 404 });
    }

    const sql = `
      SELECT 
        c.name AS class_name, 
        c.numeric_name,
        COALESCE(cmf.amount, 0.00) AS amount
      FROM website_classes c
      LEFT JOIN website_class_monthly_fees cmf ON c.id = cmf.class_id AND cmf.website_id = $1
      WHERE c.website_id = $1
      ORDER BY c.numeric_name ASC, c.name ASC
    `;
    const result = await query(sql, [website.id]);

    const res_data = { monthlyFees: result.rows };
    return NextResponse.json({
      success: true,
      payload: res_data,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching public monthly fees:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
