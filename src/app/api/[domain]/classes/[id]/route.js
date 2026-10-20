import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/websiteResolver.js';

// GET: Single class details with subjects, sections, and faculty
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Class identifier required' }, { status: 400 });
    }

    // Lookup class by ID or Code
    const classRes = await queryDb(
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
              COALESCE(di.expected_cost, 0.00) AS expected_cost
       FROM website_classes c
       JOIN website_departments d ON d.id = c.department_id AND d.website_id = c.website_id
       LEFT JOIN website_department_information di ON di.department_id = d.id AND di.website_id = c.website_id
       WHERE c.website_id = $1 AND (c.id::text = $2 OR LOWER(c.code) = LOWER($2))
       LIMIT 1`,
      [website.id, id]
    );

    if (classRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Class not found' }, { status: 404 });
    }

    const classData = classRes.rows[0];

    // Get Sections
    const sectionsRes = await queryDb(
      `SELECT id, name, capacity, room_number
       FROM website_sections
       WHERE website_id = $1 AND class_id = $2
       ORDER BY name ASC`,
      [website.id, classData.id]
    );

    // Get Subjects assigned to this class
    const subjectsRes = await queryDb(
      `SELECT cs.id AS assignment_id,
              s.id AS subject_id,
              s.name AS subject_name,
              s.code AS subject_code,
              s.description AS subject_description
       FROM website_class_subjects cs
       JOIN website_subjects s ON s.id = cs.subject_id AND s.website_id = cs.website_id
       WHERE cs.website_id = $1 AND cs.class_id = $2
       ORDER BY s.name ASC`,
      [website.id, classData.id]
    );

    // Get Teachers associated with this department or class
    const teachersRes = await queryDb(
      `SELECT t.id,
              t.name,
              t.email,
              t.number,
              t.gender,
              t.photo_url,
              des.title AS designation_title,
              COALESCE(split_part(t.email, '@', 1), t.id::text) AS username
       FROM website_teachers t
       LEFT JOIN website_designations des ON des.id = t.designation_id
       WHERE t.website_id = $1 AND (t.department_id = $2 OR t.department_id IS NULL) AND t.is_active = true
       ORDER BY des.display_order ASC NULLS LAST, t.name ASC`,
      [website.id, classData.department_id]
    );

    const fullClass = {
      ...classData,
      sections: sectionsRes.rows,
      subjects: subjectsRes.rows,
      teachers: teachersRes.rows,
    };

    return NextResponse.json({
      success: true,
      class: fullClass,
      payload: { class: fullClass, subjects: subjectsRes.rows, sections: sectionsRes.rows, teachers: teachersRes.rows },
      paylod: { class: fullClass, subjects: subjectsRes.rows, sections: sectionsRes.rows, teachers: teachersRes.rows },
    });
  } catch (error) {
    console.error('Error fetching class detail:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
