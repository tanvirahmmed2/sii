import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
export async function GET(request: any, context: any) {
    try {
        const website = await resolveWebsiteFromRequest(request, context);
        if (!website) {
            return NextResponse.json({ success: false, error: 'Educational institution portal not found.' }, { status: 404 });
        }
        let collaborations: any[] = [];
        try {
            const res = await queryDb(`SELECT id, institution_name, logo, description, partnership_type, order_no, created_at
         FROM website_collaborations
         WHERE website_id = $1 AND is_active = true
         ORDER BY order_no ASC, id ASC`, [website.id]);
            collaborations = res.rows || [];
        }
        catch {
            collaborations = [];
        }
        return NextResponse.json({
            success: true,
            collaborations,
            payload: {
                collaborations,
            },
        });
    }
    catch (error: any) {
        console.error('Error in home/collaborations API:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to fetch collaborations.' }, { status: 500 });
    }
}
