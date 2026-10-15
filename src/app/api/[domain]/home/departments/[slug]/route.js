import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';

// GET: Single department details with department head, curriculum, and faculty
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json(
        { success: false, error: 'Educational institution portal not found.' },
        { status: 404 }
      );
    }

    const { slug } = await context.params;
    if (!slug) {
      return NextResponse.json({ success: false, error: 'Department identifier required' }, { status: 400 });
    }

    const deptRes = await queryDb(
      `SELECT d.id,
              d.name,
              d.slug,
              d.code,
              d.description,
              d.order_no,
              di.motto,
              di.summary,
              COALESCE(di.description, d.description) AS detailed_description,
              COALESCE(di.expected_cost, 0.00) AS expected_cost,
              COALESCE((SELECT COUNT(*) FROM website_classes c WHERE c.department_id = d.id), 0)::int AS class_count
       FROM website_departments d
       LEFT JOIN website_department_information di ON di.department_id = d.id AND di.website_id = d.website_id
       WHERE d.website_id = $1 AND (d.slug = $2 OR LOWER(d.slug) = LOWER($2) OR LOWER(d.code) = LOWER($2) OR d.id::text = $2)
       LIMIT 1`,
      [website.id, slug]
    );

    if (deptRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Department not found' }, { status: 404 });
    }

    const dept = deptRes.rows[0];

    // Department Head (like Board Members)
    const headRes = await queryDb(
      `SELECT dh.*,
              t.email AS teacher_account_email
       FROM website_dept_heads dh
       LEFT JOIN website_teachers t ON t.id = dh.teacher_id AND t.website_id = dh.website_id
       WHERE dh.website_id = $1 AND dh.department_id = $2 AND dh.is_active = true
       ORDER BY dh.order_no ASC, dh.id ASC
       LIMIT 1`,
      [website.id, dept.id]
    );

    const deptHead = headRes.rows[0] || null;

    // Classes under this department
    const classesRes = await queryDb(
      `SELECT id, name, code, max_seats, description
       FROM website_classes
       WHERE website_id = $1 AND department_id = $2
       ORDER BY name ASC`,
      [website.id, dept.id]
    );

    // Faculty under this department
    const teachersRes = await queryDb(
      `SELECT t.id,
              t.name,
              t.email,
              t.number,
              t.photo_url,
              des.title AS designation_title,
              COALESCE(split_part(t.email, '@', 1), t.id::text) AS username
       FROM website_teachers t
       LEFT JOIN website_designations des ON des.id = t.designation_id
       WHERE t.website_id = $1 AND t.department_id = $2 AND t.is_active = true
       ORDER BY des.display_order ASC NULLS LAST, t.name ASC`,
      [website.id, dept.id]
    );

    const fullDept = {
      ...dept,
      dept_head: deptHead,
      classes: classesRes.rows,
      teachers: teachersRes.rows,
    };

    return NextResponse.json({
      success: true,
      department: fullDept,
      dept_head: deptHead,
      payload: { department: fullDept, dept_head: deptHead, classes: classesRes.rows, teachers: teachersRes.rows },
      paylod: { department: fullDept, dept_head: deptHead, classes: classesRes.rows, teachers: teachersRes.rows },
    });
  } catch (error) {
    console.error('Error fetching department detail:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
