import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// GET Inventory Categories
export async function GET() {
  try {
    const result = await query('SELECT * FROM inventory_categories ORDER BY name ASC');
    return NextResponse.json({
      success: true,
      paylod: { categories: result.rows }
    });
  } catch (error) {
    console.error('Error fetching inventory categories:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST Create Inventory Category (Admin only)
export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json({ success: false, error: 'Category name is required.' }, { status: 400 });
    }

    const result = await query(`
      INSERT INTO inventory_categories (name, description)
      VALUES ($1, $2)
      RETURNING *
    `, [name.trim(), description?.trim() || null]);

    return NextResponse.json({
      success: true,
      message: 'Inventory category created successfully.',
      paylod: { category: result.rows[0] }
    });
  } catch (error) {
    console.error('Error creating inventory category:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
