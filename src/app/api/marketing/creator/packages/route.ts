import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
export async function GET() {
    try {
        const res = await queryDb(`SELECT *, (COALESCE(usd_per_month, 0) * 100)::int AS price_in_cents
       FROM packages 
       WHERE is_active = TRUE AND is_public = TRUE
       ORDER BY sort_order ASC, bdt_per_month ASC, id ASC`);
        return NextResponse.json({ success: true, packages: res.rows });
    }
    catch (error: any) {
        console.error('Packages GET API error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
