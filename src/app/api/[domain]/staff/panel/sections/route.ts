import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { verifyStaffModuleAccess } from 'src/lib/middleware/staff';
async function verifyStaffAccess(request: any, context: any, action: any = 'view') {
    return verifyStaffModuleAccess(request, context, ['class-section', 'sections', 'class-setup'], action);
}
export async function GET(request: any, context: any) {
    try {
        const auth = await verifyStaffAccess(request, context, 'view');
        if (auth.error)
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        const { searchParams } = new URL(request.url);
        const classId = searchParams.get('class_id');
        const departmentId = searchParams.get('department_id');
        const sessionId = searchParams.get('session_id');
        const [classesRes, departmentsRes, sessionsRes] = await Promise.all([
            queryDb(`SELECT c.id, c.name, c.code, c.department_id,
                dept.name AS department_name
         FROM website_classes c
         LEFT JOIN website_departments dept ON dept.id = c.department_id
         WHERE c.website_id = $1
         ORDER BY c.name ASC`, [auth.website.id]),
            queryDb(`SELECT id, name, code, slug
         FROM website_departments
         WHERE website_id = $1
         ORDER BY order_no ASC, name ASC`, [auth.website.id]),
            queryDb(`SELECT id, name, status
         FROM website_sessions
         WHERE website_id = $1
         ORDER BY name DESC`, [auth.website.id])
        ]);
        let queryText = `
      SELECT s.*, 
             c.name AS class_name, 
             c.code AS class_code,
             COALESCE(dept_sec.name, dept_cls.name) AS department_name,
             COALESCE(s.department_id, c.department_id) AS resolved_department_id,
             ses.name AS session_name
      FROM website_sections s
      LEFT JOIN website_classes c ON c.id = s.class_id
      LEFT JOIN website_departments dept_cls ON dept_cls.id = c.department_id
      LEFT JOIN website_departments dept_sec ON dept_sec.id = s.department_id
      LEFT JOIN website_sessions ses ON ses.id = s.session_id
      WHERE s.website_id = $1
    `;
        const params = [auth.website.id];
        if (classId && classId !== 'all') {
            params.push(classId);
            queryText += ` AND s.class_id = $${params.length}`;
        }
        if (departmentId && departmentId !== 'all') {
            params.push(departmentId);
            queryText += ` AND (s.department_id = $${params.length} OR c.department_id = $${params.length})`;
        }
        if (sessionId && sessionId !== 'all') {
            params.push(sessionId);
            queryText += ` AND s.session_id = $${params.length}`;
        }
        queryText += ` ORDER BY COALESCE(c.name, 'ZZZ') ASC, s.name ASC`;
        const result = await queryDb(queryText, params);
        return NextResponse.json({
            success: true,
            sections: result.rows,
            available_classes: classesRes.rows,
            available_departments: departmentsRes.rows,
            available_sessions: sessionsRes.rows,
            payload: {
                sections: result.rows,
                available_classes: classesRes.rows,
                available_departments: departmentsRes.rows,
                available_sessions: sessionsRes.rows
            }
        });
    }
    catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
export async function POST(request: any, context: any) {
    try {
        const auth = await verifyStaffAccess(request, context, 'create');
        if (auth.error)
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        const body = await request.json().catch(() => ({}));
        const { class_id, department_id, session_id, name, capacity = 40, room_number = '' } = body;
        if (!name || !String(name).trim()) {
            return NextResponse.json({ success: false, error: 'Section Name is required.' }, { status: 400 });
        }
        let parsedClassId = null;
        if (class_id && String(class_id).trim() && String(class_id) !== 'null') {
            parsedClassId = parseInt(class_id, 10);
            const classCheck = await queryDb(`SELECT id FROM website_classes WHERE id = $1 AND website_id = $2`, [parsedClassId, auth.website.id]);
            if (classCheck.rowCount === 0) {
                return NextResponse.json({ success: false, error: 'Target class does not exist.' }, { status: 400 });
            }
        }
        let parsedDepartmentId = null;
        if (department_id && String(department_id).trim() && String(department_id) !== 'null') {
            parsedDepartmentId = parseInt(department_id, 10);
            const deptCheck = await queryDb(`SELECT id FROM website_departments WHERE id = $1 AND website_id = $2`, [parsedDepartmentId, auth.website.id]);
            if (deptCheck.rowCount === 0) {
                return NextResponse.json({ success: false, error: 'Target department does not exist.' }, { status: 400 });
            }
        }
        let parsedSessionId = null;
        if (session_id && String(session_id).trim() && String(session_id) !== 'null') {
            parsedSessionId = parseInt(session_id, 10);
            const sesCheck = await queryDb(`SELECT id FROM website_sessions WHERE id = $1 AND website_id = $2`, [parsedSessionId, auth.website.id]);
            if (sesCheck.rowCount === 0) {
                return NextResponse.json({ success: false, error: 'Target session does not exist.' }, { status: 400 });
            }
        }
        const insertRes = await queryDb(`INSERT INTO website_sections (website_id, class_id, department_id, session_id, name, capacity, room_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`, [
            auth.website.id,
            parsedClassId,
            parsedDepartmentId,
            parsedSessionId,
            String(name).trim(),
            parseInt(capacity, 10) || 40,
            room_number ? String(room_number).trim() : null
        ]);
        const savedSection = insertRes.rows[0];
        const enrichedRes = await queryDb(`SELECT s.*, 
              c.name AS class_name, 
              c.code AS class_code,
              COALESCE(dept_sec.name, dept_cls.name) AS department_name,
              ses.name AS session_name
       FROM website_sections s
       LEFT JOIN website_classes c ON c.id = s.class_id
       LEFT JOIN website_departments dept_cls ON dept_cls.id = c.department_id
       LEFT JOIN website_departments dept_sec ON dept_sec.id = s.department_id
       LEFT JOIN website_sessions ses ON ses.id = s.session_id
       WHERE s.id = $1`, [savedSection.id]);
        return NextResponse.json({
            success: true,
            section: enrichedRes.rows[0] || savedSection,
            message: 'Section created successfully.'
        });
    }
    catch (error: any) {
        if (error.code === '23505') {
            return NextResponse.json({ success: false, error: 'A section with this name already exists in this scope.' }, { status: 409 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
export async function PUT(request: any, context: any) {
    try {
        const auth = await verifyStaffAccess(request, context, 'edit');
        if (auth.error)
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        const body = await request.json().catch(() => ({}));
        const { id, class_id, department_id, session_id, name, capacity, room_number } = body;
        if (!id) {
            return NextResponse.json({ success: false, error: 'Section ID is required.' }, { status: 400 });
        }
        const updateRes = await queryDb(`UPDATE website_sections
       SET class_id = CASE WHEN $1::text IS NOT NULL THEN $2::bigint ELSE class_id END,
           department_id = CASE WHEN $3::text IS NOT NULL THEN $4::bigint ELSE department_id END,
           session_id = CASE WHEN $5::text IS NOT NULL THEN $6::bigint ELSE session_id END,
           name = COALESCE($7, name),
           capacity = COALESCE($8, capacity),
           room_number = COALESCE($9, room_number),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND website_id = $11
       RETURNING *`, [
            class_id !== undefined ? 'set' : null,
            class_id && String(class_id) !== 'null' ? parseInt(class_id, 10) : null,
            department_id !== undefined ? 'set' : null,
            department_id && String(department_id) !== 'null' ? parseInt(department_id, 10) : null,
            session_id !== undefined ? 'set' : null,
            session_id && String(session_id) !== 'null' ? parseInt(session_id, 10) : null,
            name ? String(name).trim() : null,
            capacity !== undefined ? parseInt(capacity, 10) : null,
            room_number !== undefined ? (room_number ? String(room_number).trim() : null) : null,
            id,
            auth.website.id
        ]);
        if (updateRes.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Section not found.' }, { status: 404 });
        }
        const enrichedRes = await queryDb(`SELECT s.*, 
              c.name AS class_name, 
              c.code AS class_code,
              COALESCE(dept_sec.name, dept_cls.name) AS department_name,
              ses.name AS session_name
       FROM website_sections s
       LEFT JOIN website_classes c ON c.id = s.class_id
       LEFT JOIN website_departments dept_cls ON dept_cls.id = c.department_id
       LEFT JOIN website_departments dept_sec ON dept_sec.id = s.department_id
       LEFT JOIN website_sessions ses ON ses.id = s.session_id
       WHERE s.id = $1`, [id]);
        return NextResponse.json({
            success: true,
            section: enrichedRes.rows[0] || updateRes.rows[0],
            message: 'Section updated successfully.'
        });
    }
    catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
export async function DELETE(request: any, context: any) {
    try {
        const auth = await verifyStaffAccess(request, context, 'delete');
        if (auth.error)
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ success: false, error: 'Section ID is required.' }, { status: 400 });
        }
        const delRes = await queryDb(`DELETE FROM website_sections WHERE id = $1 AND website_id = $2 RETURNING id, name`, [id, auth.website.id]);
        if (delRes.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Section not found.' }, { status: 404 });
        }
        return NextResponse.json({
            success: true,
            message: `Section "${delRes.rows[0].name}" deleted successfully.`
        });
    }
    catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
