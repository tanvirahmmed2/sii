import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';

export async function GET() {
  try {
    // Check faq table (declared in Table 21 of psql/schema.psql)
    let res = await queryDb(`
      SELECT id, question, answer, created_at, updated_at 
      FROM faq 
      ORDER BY id ASC
    `).catch(async () => {
      // Fallback to faqs table if created by legacy migrations
      return await queryDb(`
        SELECT id, question, answer, created_at, updated_at 
        FROM faqs 
        ORDER BY id ASC
      `).catch((err) => {
        console.warn('faqs query error:', err.message);
        return { rows: [] };
      });
    });

    return NextResponse.json({ success: true, faqs: res.rows || [] });
  } catch (error) {
    console.error('Public faqs GET error:', error);
    return NextResponse.json({ success: false, error: error.message, faqs: [] }, { status: 500 });
  }
}
