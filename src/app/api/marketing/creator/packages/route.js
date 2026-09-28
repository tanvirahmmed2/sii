import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';

/**
 * API Route: /api/creator/packages
 * Dedicated to the `packages` table.
 */

export async function GET() {
  try {
    const res = await queryDb(
      `SELECT * FROM packages WHERE is_active = TRUE ORDER BY price_in_cents ASC`
    );
    return NextResponse.json({ success: true, packages: res.rows });
  } catch (error) {
    console.error('Packages GET API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
