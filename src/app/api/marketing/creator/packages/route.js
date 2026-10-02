import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';

/**
 * API Route: /api/creator/packages
 * Dedicated to the `packages` table.
 */

export async function GET() {
  try {
    const res = await queryDb(
      `SELECT *, (COALESCE(monthly_price_usd, monthly_price, 0) * 100)::int AS price_in_cents
       FROM packages 
       WHERE is_active = TRUE 
       ORDER BY sort_order ASC, monthly_price_usd ASC, id ASC`
    );
    return NextResponse.json({ success: true, packages: res.rows });
  } catch (error) {
    console.error('Packages GET API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
