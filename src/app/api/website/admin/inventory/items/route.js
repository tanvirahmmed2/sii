import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// GET Inventory Items
export async function GET() {
  try {
    const result = await query(`
      SELECT i.*, c.name AS category_name
      FROM inventory_items i
      JOIN inventory_categories c ON i.category_id = c.id
      ORDER BY i.name ASC
    `);
    return NextResponse.json({
      success: true,
      paylod: { items: result.rows }
    });
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST Create Inventory Item (Admin only)
export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { category_id, name, code, description, unit = 'Pcs' } = await request.json();

    if (!category_id || !name || !code) {
      return NextResponse.json({ success: false, error: 'Category, name, and item code are required.' }, { status: 400 });
    }

    // Verify duplicate code
    const dupCheck = await query('SELECT id FROM inventory_items WHERE LOWER(code) = LOWER($1)', [code.trim()]);
    if (dupCheck.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'An inventory item with this code already exists.' }, { status: 400 });
    }

    const result = await query(`
      INSERT INTO inventory_items (category_id, name, code, description, total_quantity, available_quantity, unit)
      VALUES ($1, $2, $3, $4, 0, 0, $5)
      RETURNING *
    `, [category_id, name.trim(), code.trim(), description?.trim() || null, unit.trim()]);

    return NextResponse.json({
      success: true,
      message: 'Inventory item registered successfully.',
      paylod: { item: result.rows[0] }
    });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
