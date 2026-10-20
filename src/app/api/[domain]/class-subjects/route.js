import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

// GET: All class subject assignments for public catalog
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Website not found' }, { status: 404 });
    }

    const result = await queryDb(
      `SELECT cs.id,
              cs.class_id,
              cs.subject_id,
              c.name AS class_name,
              c.code AS class_code,
              s.name AS subject_name,
              s.code AS subject_code
       FROM website_class_subjects cs
       JOIN website_classes c ON c.id = cs.class_id AND c.website_id = cs.website_id
       JOIN website_subjects s ON s.id = cs.subject_id AND s.website_id = cs.website_id
       WHERE cs.website_id = $1
       ORDER BY c.name ASC, s.name ASC`,
      [website.id]
    );

    return NextResponse.json({
      success: true,
      assignments: result.rows,
      payload: { assignments: result.rows },
      paylod: { assignments: result.rows },
    });
  } catch (error) {
    console.error('Error fetching class subjects:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
