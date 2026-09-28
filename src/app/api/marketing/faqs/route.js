import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db/pg';

export async function GET() {
  try {
    const res = await queryDb('SELECT id, question, answer, created_at FROM faqs ORDER BY id ASC');
    return NextResponse.json({ success: true, faqs: res.rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
