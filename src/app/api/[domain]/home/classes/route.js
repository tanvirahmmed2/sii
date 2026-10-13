import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';

// GET: List all classes for public tenant consumption
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Educational institution portal not found.' }, { status: 404 });
    }

    const result = await queryDb(
      `SELECT c.*,
              s.name AS session_name,
              d.name AS department_name,
              d.code AS department_code,
              COALESCE(di.motto, ci.motto) AS motto,
              COALESCE(di.summary, ci.summary) AS summary,
              COALESCE(di.description, ci.description, c.description) AS description,
              COALESCE(di.expected_cost, ci.expected_cost, 0.00) AS expected_cost,
              COALESCE((SELECT COUNT(*) FROM website_sections s WHERE s.class_id = c.id), 0)::int AS section_count,
              COALESCE((SELECT COUNT(*) FROM website_class_subjects cs WHERE cs.class_id = c.id), 0)::int AS subject_count
       FROM website_classes c
       LEFT JOIN website_sessions s ON s.id = c.session_id
       LEFT JOIN website_departments d ON d.id = c.department_id
       LEFT JOIN website_department_information di ON di.department_id = d.id AND di.website_id = c.website_id
       LEFT JOIN website_class_information ci ON ci.class_id = c.id AND ci.website_id = c.website_id
       WHERE c.website_id = $1
       ORDER BY c.name ASC, c.id ASC`,
      [website.id]
    );

    return NextResponse.json({
      success: true,
      classes: result.rows,
      payload: { classes: result.rows },
      paylod: { classes: result.rows },
    });
  } catch (error) {
    console.error('Error fetching tenant classes:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
