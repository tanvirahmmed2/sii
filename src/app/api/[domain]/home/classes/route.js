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
              COALESCE((SELECT COUNT(*) FROM website_sections s WHERE s.class_id = c.id), 0)::int AS section_count,
              COALESCE((SELECT COUNT(*) FROM website_class_subjects cs WHERE cs.class_id = c.id), 0)::int AS subject_count
       FROM website_classes c
       WHERE c.website_id = $1
       ORDER BY c.numeric_name ASC NULLS LAST, c.name ASC`,
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
