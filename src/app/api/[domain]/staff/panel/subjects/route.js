import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyStaffModuleAccess } from 'src/lib/middleware/staff.js';

async function verifyStaffAccess(request, context, action = 'view') {
  return verifyStaffModuleAccess(request, context, ['subjects', 'class-subject'], action);
}

export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context, 'view');
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id');

    const classesResult = await queryDb(
      `SELECT id, name, code 
       FROM website_classes 
       WHERE website_id = $1 
       ORDER BY name ASC`,
      [auth.website.id]
    );

    let queryText = `
      SELECT s.*,
             c.name AS class_name,
             c.code AS class_code,
             COALESCE((SELECT COUNT(*) FROM website_class_subjects cs WHERE cs.subject_id = s.id), 0)::int AS class_count
      FROM website_subjects s
      LEFT JOIN website_classes c ON c.id = s.class_id
      WHERE s.website_id = $1
    `;
    const params = [auth.website.id];

    if (classId && classId !== 'all') {
      if (classId === 'none' || classId === 'null') {
        queryText += ` AND s.class_id IS NULL`;
      } else {
        params.push(classId);
        queryText += ` AND (s.class_id = $${params.length} OR EXISTS (
          SELECT 1 FROM website_class_subjects wcs 
          WHERE wcs.subject_id = s.id AND wcs.class_id = $${params.length}
        ))`;
      }
    }

    queryText += ` ORDER BY COALESCE(c.name, 'AAA') ASC, s.name ASC`;

    const result = await queryDb(queryText, params);

    return NextResponse.json({
      success: true,
      subjects: result.rows,
      available_classes: classesResult.rows,
      payload: { 
        subjects: result.rows,
        available_classes: classesResult.rows 
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context, 'create');
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { name, code, type = 'Theory', class_id, description = '' } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, error: 'Subject name is required.' }, { status: 400 });
    }

    const trimmedName = String(name).trim();
    const trimmedCode = code && String(code).trim() 
      ? String(code).trim().toUpperCase() 
      : trimmedName.substring(0, 4).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);

    const validTypes = ['Theory', 'Practical', 'Both', 'Optional'];
    const validType = validTypes.includes(type) ? type : 'Theory';

    let validClassId = null;
    if (class_id && String(class_id) !== 'none' && String(class_id) !== 'null') {
      const clsCheck = await queryDb(
        `SELECT id FROM website_classes WHERE id = $1 AND website_id = $2`,
        [class_id, auth.website.id]
      );
      if (clsCheck.rowCount > 0) {
        validClassId = parseInt(class_id, 10);
      }
    }

    const insertRes = await queryDb(
      `INSERT INTO website_subjects (website_id, class_id, name, code, type, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        auth.website.id,
        validClassId,
        trimmedName,
        trimmedCode,
        validType,
        description ? String(description).trim() : null
      ]
    );

    const savedSubject = insertRes.rows[0];

    if (validClassId) {
      await queryDb(
        `INSERT INTO website_class_subjects (website_id, class_id, subject_id, full_marks, pass_marks, is_optional)
         VALUES ($1, $2, $3, 100, 33, $4)
         ON CONFLICT (website_id, class_id, subject_id) DO NOTHING`,
        [auth.website.id, validClassId, savedSubject.id, validType === 'Optional']
      );
    }

    const enrichedRes = await queryDb(
      `SELECT s.*,
              c.name AS class_name,
              c.code AS class_code
       FROM website_subjects s
       LEFT JOIN website_classes c ON c.id = s.class_id
       WHERE s.id = $1`,
      [savedSubject.id]
    );

    return NextResponse.json({
      success: true,
      subject: enrichedRes.rows[0] || savedSubject,
      message: 'Subject created successfully.'
    });
  } catch (error) {
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'A subject with this name or code already exists in this class.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context, 'edit');
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { id, name, code, type, class_id, description } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Subject ID is required.' }, { status: 400 });
    }

    const existingCheck = await queryDb(
      `SELECT * FROM website_subjects WHERE id = $1 AND website_id = $2`,
      [id, auth.website.id]
    );
    if (existingCheck.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Subject not found.' }, { status: 404 });
    }
    const existing = existingCheck.rows[0];

    let targetClassId = existing.class_id;
    if (class_id !== undefined) {
      if (!class_id || String(class_id) === 'none' || String(class_id) === 'null') {
        targetClassId = null;
      } else {
        const clsCheck = await queryDb(
          `SELECT id FROM website_classes WHERE id = $1 AND website_id = $2`,
          [class_id, auth.website.id]
        );
        if (clsCheck.rowCount > 0) {
          targetClassId = parseInt(class_id, 10);
        } else {
          targetClassId = null;
        }
      }
    }

    const updateRes = await queryDb(
      `UPDATE website_subjects
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           type = COALESCE($3, type),
           class_id = $4,
           description = COALESCE($5, description),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND website_id = $7
       RETURNING *`,
      [
        name !== undefined ? String(name).trim() : null,
        code !== undefined ? String(code).trim().toUpperCase() : null,
        type !== undefined ? type : null,
        targetClassId,
        description !== undefined ? String(description).trim() : null,
        id,
        auth.website.id
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Subject not found.' }, { status: 404 });
    }

    if (targetClassId) {
      await queryDb(
        `INSERT INTO website_class_subjects (website_id, class_id, subject_id, full_marks, pass_marks, is_optional)
         VALUES ($1, $2, $3, 100, 33, $4)
         ON CONFLICT (website_id, class_id, subject_id) DO NOTHING`,
        [auth.website.id, targetClassId, id, type === 'Optional']
      );
    }

    const enrichedRes = await queryDb(
      `SELECT s.*,
              c.name AS class_name,
              c.code AS class_code
       FROM website_subjects s
       LEFT JOIN website_classes c ON c.id = s.class_id
       WHERE s.id = $1`,
      [id]
    );

    return NextResponse.json({
      success: true,
      subject: enrichedRes.rows[0] || updateRes.rows[0],
      message: 'Subject updated successfully.'
    });
  } catch (error) {
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'Another subject already uses this name or code in this class.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context, 'delete');
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Subject ID is required.' }, { status: 400 });
    }

    const delRes = await queryDb(
      `DELETE FROM website_subjects WHERE id = $1 AND website_id = $2 RETURNING id, name`,
      [id, auth.website.id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Subject not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Subject "${delRes.rows[0].name}" deleted successfully.`
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
