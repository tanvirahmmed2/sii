import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isCashier } from '@/lib/auth';

// GET general transaction ledger
export async function GET() {
  try {
    const authorized = (await isAdmin()) || (await isCashier());
    if (!authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const result = await query(`
      SELECT * FROM payment_transactions
      ORDER BY payment_date DESC, id DESC
    `);

    return NextResponse.json({
      success: true,
      paylod: { transactions: result.rows }
    });
  } catch (error) {
    console.error('Error fetching general transaction ledger:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
