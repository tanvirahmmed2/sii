import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { verifyStaffModuleAccess } from 'src/lib/middleware/staff';
import { getWebsiteAcademicConfig } from 'src/lib/modules/academicConfig';

async function verifyStaffAccess(request: any, context: any, action: any = 'view') {
  return verifyStaffModuleAccess(request, context, ['class-teacher', 'routine', 'class-setup'], action);
}

export async function GET(request: any, context: any) {
  try {
    const auth = await verifyStaffAccess(request, context, 'view');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const websiteId = auth.website.id;
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id');
    const teacherId = searchParams.get('teacher_id');
    const sessionId = searchParams.get('session_id');
    const sectionId = searchParams.get('section_id');

    let sql = `
      SELECT ct.*,
             t.name AS teacher_name,
             t.email AS teacher_email,
             t.number AS teacher_phone,
             t.photo_url AS teacher_photo,
             des.title AS designation_title,
             c.name AS class_name,
             c.code AS class_code,
             sec.name AS section_name,
             ses.name AS session_name
      FROM website_class_teachers ct
      JOIN website_teachers t ON t.id = ct.teacher_id AND t.website_id = ct.website_id
      LEFT JOIN website_teacher_designation des ON des.id = t.designation_id
      LEFT JOIN website_classes c ON c.id = ct.class_id AND c.website_id = ct.website_id
      LEFT JOIN website_sections sec ON sec.id = ct.section_id AND sec.website_id = ct.website_id
      LEFT JOIN website_sessions ses ON ses.id = ct.session_id AND ses.website_id = ct.website_id
      WHERE ct.website_id = $1
    `;
    const params: any[] = [websiteId];
    if (classId && classId !== 'all') {
      params.push(classId);
      sql += ` AND ct.class_id = $${params.length}`;
    }
    if (teacherId && teacherId !== 'all') {
      params.push(teacherId);
      sql += ` AND ct.teacher_id = $${params.length}`;
    }
    if (sessionId && sessionId !== 'all') {
      params.push(sessionId);
      sql += ` AND ct.session_id = $${params.length}`;
    }
    if (sectionId && sectionId !== 'all') {
      params.push(sectionId);
      sql += ` AND ct.section_id = $${params.length}`;
    }
    sql += ` ORDER BY ct.is_primary DESC, c.name ASC NULLS LAST, t.name ASC, ct.id DESC`;

    const [assignRes, teachersRes, classesRes, sectionsRes, sessionsRes, academicConfig] = await Promise.all([
      queryDb(sql, params),
      queryDb(`
        SELECT t.id, t.name, t.email, t.number, t.is_active, des.title AS designation_title
        FROM website_teachers t
        LEFT JOIN website_teacher_designation des ON des.id = t.designation_id
        WHERE t.website_id = $1 AND t.is_active = TRUE
        ORDER BY t.name ASC
      `, [websiteId]),
      queryDb(`SELECT id, name, code FROM website_classes WHERE website_id = $1 ORDER BY name ASC`, [websiteId]),
      queryDb(`SELECT id, name, capacity, room_number FROM website_sections WHERE website_id = $1 ORDER BY name ASC`, [websiteId]),
      queryDb(`SELECT id, name, status FROM website_sessions WHERE website_id = $1 ORDER BY name DESC`, [websiteId]),
      getWebsiteAcademicConfig(auth.website),
    ]);

    return NextResponse.json({
      success: true,
      assignments: assignRes.rows,
      available_teachers: teachersRes.rows,
      available_classes: classesRes.rows,
      available_sections: sectionsRes.rows,
      available_sessions: sessionsRes.rows,
      academicConfig,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: any, context: any) {
  try {
    const auth = await verifyStaffAccess(request, context, 'create');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const websiteId = auth.website.id;
    const body = await request.json().catch(() => ({}));
    const {
      teacher_id,
      class_id = null,
      section_id = null,
      session_id = null,
      role = 'Class Teacher',
      is_primary = true,
      remarks = '',
    } = body;

    if (!teacher_id) {
      return NextResponse.json({ success: false, error: 'Please select a teacher.' }, { status: 400 });
    }
    const teacherRes = await queryDb(`SELECT id FROM website_teachers WHERE id = $1 AND website_id = $2`, [teacher_id, websiteId]);
    if (teacherRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Selected teacher does not exist.' }, { status: 404 });
    }

    const parsedClassId = class_id && String(class_id) !== 'null' ? Number(class_id) : null;
    const parsedSectionId = section_id && String(section_id) !== 'null' ? Number(section_id) : null;
    const parsedSessionId = session_id && String(session_id) !== 'null' ? Number(session_id) : null;

    const dupCheck = await queryDb(`
      SELECT id FROM website_class_teachers
      WHERE website_id = $1
        AND teacher_id = $2
        AND class_id IS NOT DISTINCT FROM $3
        AND section_id IS NOT DISTINCT FROM $4
        AND session_id IS NOT DISTINCT FROM $5
      LIMIT 1
    `, [websiteId, Number(teacher_id), parsedClassId, parsedSectionId, parsedSessionId]);

    let savedId: any;
    if (dupCheck.rows.length > 0) {
      const upd = await queryDb(`
        UPDATE website_class_teachers
        SET role = $1, is_primary = $2, remarks = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4 AND website_id = $5
        RETURNING id
      `, [
        String(role || 'Class Teacher').trim(),
        Boolean(is_primary),
        remarks ? String(remarks).trim() : null,
        dupCheck.rows[0].id,
        websiteId,
      ]);
      savedId = upd.rows[0].id;
    } else {
      const ins = await queryDb(`
        INSERT INTO website_class_teachers (website_id, class_id, section_id, session_id, teacher_id, role, is_primary, remarks)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        websiteId,
        parsedClassId,
        parsedSectionId,
        parsedSessionId,
        Number(teacher_id),
        String(role || 'Class Teacher').trim(),
        Boolean(is_primary),
        remarks ? String(remarks).trim() : null,
      ]);
      savedId = ins.rows[0].id;
    }

    const enriched = await queryDb(`
      SELECT ct.*,
             t.name AS teacher_name,
             t.email AS teacher_email,
             t.number AS teacher_phone,
             des.title AS designation_title,
             c.name AS class_name,
             c.code AS class_code,
             sec.name AS section_name,
             ses.name AS session_name
      FROM website_class_teachers ct
      JOIN website_teachers t ON t.id = ct.teacher_id AND t.website_id = ct.website_id
      LEFT JOIN website_teacher_designation des ON des.id = t.designation_id
      LEFT JOIN website_classes c ON c.id = ct.class_id AND c.website_id = ct.website_id
      LEFT JOIN website_sections sec ON sec.id = ct.section_id AND sec.website_id = ct.website_id
      LEFT JOIN website_sessions ses ON ses.id = ct.session_id AND ses.website_id = ct.website_id
      WHERE ct.id = $1 AND ct.website_id = $2
    `, [savedId, websiteId]);

    return NextResponse.json({
      success: true,
      assignment: enriched.rows[0],
      message: 'Class teacher assigned successfully.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: any, context: any) {
  try {
    const auth = await verifyStaffAccess(request, context, 'edit');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const websiteId = auth.website.id;
    const body = await request.json().catch(() => ({}));
    const { id, teacher_id, class_id, section_id, session_id, role, is_primary, remarks } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Assignment ID is required.' }, { status: 400 });
    }
    const existingRes = await queryDb(`SELECT * FROM website_class_teachers WHERE id = $1 AND website_id = $2`, [id, websiteId]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Assignment not found.' }, { status: 404 });
    }
    const existing = existingRes.rows[0];
    const nextTeacherId = teacher_id ? Number(teacher_id) : existing.teacher_id;
    const nextClassId = class_id !== undefined ? (class_id && String(class_id) !== 'null' ? Number(class_id) : null) : existing.class_id;
    const nextSectionId = section_id !== undefined ? (section_id && String(section_id) !== 'null' ? Number(section_id) : null) : existing.section_id;
    const nextSessionId = session_id !== undefined ? (session_id && String(session_id) !== 'null' ? Number(session_id) : null) : existing.session_id;

    await queryDb(`
      UPDATE website_class_teachers
      SET teacher_id = $1,
          class_id = $2,
          section_id = $3,
          session_id = $4,
          role = $5,
          is_primary = $6,
          remarks = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8 AND website_id = $9
    `, [
      nextTeacherId,
      nextClassId,
      nextSectionId,
      nextSessionId,
      role !== undefined ? String(role || 'Class Teacher').trim() : existing.role,
      is_primary !== undefined ? Boolean(is_primary) : existing.is_primary,
      remarks !== undefined ? (remarks ? String(remarks).trim() : null) : existing.remarks,
      id,
      websiteId,
    ]);

    return NextResponse.json({
      success: true,
      message: 'Class teacher assignment updated successfully.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: any, context: any) {
  try {
    const auth = await verifyStaffAccess(request, context, 'delete');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Assignment ID is required.' }, { status: 400 });
    }
    const delRes = await queryDb(`DELETE FROM website_class_teachers WHERE id = $1 AND website_id = $2 RETURNING id`, [id, auth.website.id]);
    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Assignment not found.' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      message: 'Class teacher assignment removed successfully.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
