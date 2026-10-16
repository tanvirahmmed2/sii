import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/websiteResolver.js';

// GET: List all classes for public tenant consumption
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const result = await queryDb(
      `SELECT c.id,
              c.website_id,
              c.department_id,
              c.name,
              c.code,
              c.max_seats,
              c.description,
              c.created_at,
              c.updated_at,
              d.name AS department_name,
              d.code AS department_code,
              d.slug AS department_slug,
              di.motto AS motto,
              di.summary AS summary,
              COALESCE(c.description, di.description) AS detailed_description,
              COALESCE(di.expected_cost, 0.00) AS expected_cost,
              COALESCE((SELECT COUNT(*) FROM website_sections sec WHERE sec.class_id = c.id), 0)::int AS section_count,
              COALESCE((SELECT COUNT(*) FROM website_class_subjects cs WHERE cs.class_id = c.id), 0)::int AS subject_count,
              COALESCE(
                (SELECT json_agg(json_build_object('id', sec.id, 'name', sec.name, 'capacity', sec.capacity, 'room_number', sec.room_number) ORDER BY sec.name ASC)
                 FROM website_sections sec
                 WHERE sec.class_id = c.id),
                '[]'::json
              ) AS sections
       FROM website_classes c
       JOIN website_departments d ON d.id = c.department_id AND d.website_id = c.website_id
       LEFT JOIN website_department_information di ON di.department_id = d.id AND di.website_id = c.website_id
       WHERE c.website_id = $1
       ORDER BY d.name ASC, c.name ASC, c.id ASC`,
      [website.id]
    );

    return NextResponse.json({
      success: true,
      classes: result.rows,
      payload: { classes: result.rows },
      paylod: { classes: result.rows },
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching tenant classes in home/classes:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch academic classes.' },
      { status: 500 }
    );
  }
}
