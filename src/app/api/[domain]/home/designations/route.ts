import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
export async function GET(request: any, context: any) {
    try {
        const website = await resolveWebsiteFromRequest(request, context);
        if (!website) {
            return NextResponse.json({ success: false, error: 'Educational institution portal not found.' }, { status: 404 });
        }
        const result = await queryDb(`SELECT id,
              title,
              description,
              display_order,
              is_active,
              created_at,
              updated_at
       FROM website_teacher_designation
       WHERE website_id = $1 AND is_active = true
       ORDER BY display_order ASC, title ASC`, [website.id]);
        return NextResponse.json({
            success: true,
            designations: result.rows,
            payload: { designations: result.rows },
            paylod: { designations: result.rows },
            total: result.rowCount,
        });
    }
    catch (error: any) {
        console.error('Error fetching designations in home/designations:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
