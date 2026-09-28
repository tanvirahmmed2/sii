import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// GET Stock Movements History (Admin only)
export async function GET() {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const result = await query(`
      SELECT sm.*, i.name AS item_name, i.code AS item_code
      FROM stock_movements sm
      JOIN inventory_items i ON sm.inventory_item_id = i.id
      ORDER BY sm.movement_date DESC, sm.id DESC
    `);

    return NextResponse.json({
      success: true,
      paylod: { movements: result.rows }
    });
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
