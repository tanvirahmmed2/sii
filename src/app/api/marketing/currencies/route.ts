import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';

export async function GET() {
  try {
    const res = await queryDb(
      `SELECT id, code, name, symbol, is_default, created_at, updated_at
       FROM currencies
       ORDER BY is_default DESC, id ASC`
    );

    let rows = res.rows;
    if (rows.length === 0) {
      rows = [
        { id: 1, code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', is_default: true },
        { id: 2, code: 'USD', name: 'United States Dollar', symbol: '$', is_default: false },
        { id: 3, code: 'EUR', name: 'Euro', symbol: '€', is_default: false },
        { id: 4, code: 'GBP', name: 'British Pound', symbol: '£', is_default: false },
        { id: 5, code: 'AUD', name: 'Australian Dollar', symbol: 'A$', is_default: false },
        { id: 6, code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', is_default: false },
      ];
    }

    return NextResponse.json({
      success: true,
      currencies: rows,
      count: rows.length,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      currencies: [
        { id: 1, code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', is_default: true },
        { id: 2, code: 'USD', name: 'United States Dollar', symbol: '$', is_default: false },
        { id: 3, code: 'EUR', name: 'Euro', symbol: '€', is_default: false },
        { id: 4, code: 'GBP', name: 'British Pound', symbol: '£', is_default: false },
        { id: 5, code: 'AUD', name: 'Australian Dollar', symbol: 'A$', is_default: false },
        { id: 6, code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', is_default: false },
      ],
    }, { status: 200 });
  }
}
