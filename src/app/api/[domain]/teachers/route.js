import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

// GET: Public list of active teachers
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
      `SELECT t.id,
              t.website_id,
              t.name,
              t.email,
              t.number,
              t.gender,
              t.blood_group,
              t.joining_date,
              t.photo_url,
              t.department_id,
              t.designation_id,
              dept.name AS department_name,
              dept.code AS department_code,
              des.title AS designation_title,
              des.display_order,
              COALESCE(split_part(t.email, '@', 1), t.id::text) AS username
       FROM website_teachers t
       LEFT JOIN website_departments dept ON dept.id = t.department_id AND dept.website_id = t.website_id
       LEFT JOIN website_designations des ON des.id = t.designation_id AND des.website_id = t.website_id
       WHERE t.website_id = $1 AND t.is_active = true
       ORDER BY des.display_order ASC NULLS LAST, t.name ASC`,
      [website.id]
    );

    return NextResponse.json({
      success: true,
      teachers: result.rows,
      payload: { teachers: result.rows },
      paylod: { teachers: result.rows },
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching teachers in home/teachers:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
