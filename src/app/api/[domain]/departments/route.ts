import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
export async function GET(request: any, context: any) {
    try {
        const website = await resolveWebsiteFromRequest(request, context);
        if (!website) {
            return NextResponse.json({ success: false, error: 'Educational institution portal not found.' }, { status: 404 });
        }
        const result = await queryDb(`SELECT d.id,
              d.name,
              COALESCE(d.slug, LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(d.name), '[^a-zA-Z0-9\\s-]', '', 'g'), '\\s+', '-', 'g'))) AS slug,
              d.code,
              d.description,
              d.order_no,
              di.motto,
              di.summary,
              COALESCE(di.description, d.description) AS detailed_description,
              COALESCE(di.expected_cost, 0.00) AS expected_cost,
              row_to_json(dh.*) AS dept_head
       FROM website_departments d
       LEFT JOIN website_department_information di ON di.department_id = d.id AND di.website_id = d.website_id
       LEFT JOIN website_dept_heads dh ON dh.department_id = d.id AND dh.website_id = d.website_id AND dh.is_active = true
       WHERE d.website_id = $1 AND d.is_active = TRUE
       ORDER BY d.order_no ASC, d.name ASC, d.id ASC`, [website.id]);
        return NextResponse.json({
            success: true,
            departments: result.rows,
            payload: { departments: result.rows },
            paylod: { departments: result.rows },
            total: result.rowCount,
        });
    }
    catch (error: any) {
        console.error('Error fetching public departments:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
