import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// DELETE a specific monthly fee configuration
export async function DELETE(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }

    const { id } = await params;

    const result = await query(`
      DELETE FROM class_monthly_fees 
      WHERE id = $1 
      RETURNING *
    `, [parseInt(id, 10)]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Configuration record not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Monthly fee rate reset successfully.'
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting monthly fee:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
