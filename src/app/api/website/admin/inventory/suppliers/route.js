import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// GET Suppliers
export async function GET() {
  try {
    const result = await query('SELECT * FROM suppliers ORDER BY name ASC');
    return NextResponse.json({
      success: true,
      paylod: { suppliers: result.rows }
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST Create Supplier (Admin only)
export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { name, contact_name, phone, email, address } = await request.json();

    if (!name || !phone) {
      return NextResponse.json({ success: false, error: 'Supplier name and contact phone are required.' }, { status: 400 });
    }

    const result = await query(`
      INSERT INTO suppliers (name, contact_name, phone, email, address)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name.trim(), contact_name?.trim() || null, phone.trim(), email?.trim() || null, address?.trim() || null]);

    return NextResponse.json({
      success: true,
      message: 'Supplier registered successfully.',
      paylod: { supplier: result.rows[0] }
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
