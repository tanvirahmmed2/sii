import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// GET security audit login logs (Admin only)
export async function GET() {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Try to fetch logs. We will run a query
    const result = await query(`
      SELECT * FROM login_logs
      ORDER BY login_time DESC, id DESC
      LIMIT 200
    `);

    return NextResponse.json({
      success: true,
      paylod: { logs: result.rows }
    });
  } catch (error) {
    console.error('Error fetching security login logs:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
