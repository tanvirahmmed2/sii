import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
export async function GET(request: any, context: any) {
    try {
        const website = await resolveWebsiteFromRequest(request, context);
        if (!website) {
            return NextResponse.json({ success: false, error: 'Educational institution portal not found.' }, { status: 404 });
        }
        let faqs: any[] = [];
        try {
            const res = await queryDb(`SELECT id, question, answer, created_at, updated_at
         FROM faq
         ORDER BY id ASC`);
            faqs = res.rows || [];
        }
        catch (dbErr: any) {
            console.warn('FAQ table query error, returning empty list:', dbErr.message);
        }
        return NextResponse.json({
            success: true,
            faqs,
            payload: {
                faqs,
            },
        });
    }
    catch (error: any) {
        console.error('Error in home/faqs API:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to fetch FAQs.' }, { status: 500 });
    }
}
