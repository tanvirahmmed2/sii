import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/websiteResolver';
export async function GET(request: any, context: any) {
    try {
        const website = await resolveWebsiteFromRequest(request, context);
        if (!website) {
            return NextResponse.json({ success: false, error: 'Educational institution portal not found.' }, { status: 404 });
        }
        const result = await queryDb(`SELECT c.id,
              c.website_id,
              c.name,
              c.code,
              c.max_seats,
              c.description,
              c.created_at,
              c.updated_at,
              ci.motto AS motto,
              ci.summary AS summary,
              COALESCE(ci.description, c.description) AS detailed_description,
              COALESCE(ci.expected_cost, 0.00) AS expected_cost,
              COALESCE((SELECT COUNT(*) FROM website_class_subjects cs WHERE cs.class_id = c.id), 0)::int AS subject_count
       FROM website_classes c
       LEFT JOIN website_class_information ci ON ci.class_id = c.id AND ci.website_id = c.website_id
       WHERE c.website_id = $1
       ORDER BY c.name ASC, c.id ASC`, [website.id]);
        return NextResponse.json({
            success: true,
            classes: result.rows,
            payload: { classes: result.rows },
            paylod: { classes: result.rows },
            total: result.rowCount,
        });
    }
    catch (error: any) {
        console.error('Error fetching tenant classes in home/classes:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to fetch academic classes.' }, { status: 500 });
    }
}
