import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { verifyStaffModuleAccess } from 'src/lib/middleware/staff';
import { verifyAcademicDimensionEnabled } from 'src/lib/modules/academicConfig';
async function verifyStaffAccess(request: any, context: any, action: any = 'view') {
    const auth = await verifyStaffModuleAccess(request, context, ['class-setup', 'classes', 'routine'], action);
    if (auth.error)
        return auth;
    const dim = await verifyAcademicDimensionEnabled(auth.website, 'class');
    if (dim.locked && action !== 'view') {
        return { error: dim.message, status: 403, locked: true, code: 'ACADEMIC_DIMENSION_LOCKED' };
    }
    return { ...auth, academicDim: dim };
}
export async function GET(request: any, context: any) {
    try {
        const auth = await verifyStaffAccess(request, context, 'view');
        if (auth.error)
            return NextResponse.json({ success: false, error: auth.error, locked: Boolean(auth.locked) }, { status: auth.status });
        const result = await queryDb(`
      SELECT c.*,
             COALESCE((SELECT COUNT(*) FROM website_subjects sub WHERE sub.class_id = c.id), 0)::int +
             COALESCE((SELECT COUNT(*) FROM website_class_subjects cs WHERE cs.class_id = c.id), 0)::int AS subject_count,
             EXISTS(SELECT 1 FROM website_class_information ci WHERE ci.class_id = c.id AND ci.website_id = c.website_id) AS has_information
      FROM website_classes c
      WHERE c.website_id = $1
      ORDER BY c.name ASC, c.id ASC
    `, [auth.website.id]);
        return NextResponse.json({
            success: true,
            locked: Boolean(auth.academicDim?.locked),
            academicConfig: auth.academicDim?.config || null,
            classes: result.rows,
            payload: {
                classes: result.rows,
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
            return NextResponse.json({ success: false, error: auth.error, locked: Boolean(auth.locked) }, { status: auth.status });
        const body = await request.json().catch(() => ({}));
        const { name, code, max_seats = 40, description = '' } = body;
        if (!name || !String(name).trim()) {
            return NextResponse.json({ success: false, error: 'Class name is required.' }, { status: 400 });
        }
        const trimmedName = String(name).trim();
        const cleanCodePart = trimmedName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
        const trimmedCode = code && String(code).trim()
            ? String(code).trim().toUpperCase()
            : `CLS-${cleanCodePart || '1'}`;
        const insertRes = await queryDb(`INSERT INTO website_classes (website_id, name, code, max_seats, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [
            auth.website.id,
            trimmedName,
            trimmedCode,
            parseInt(max_seats, 10) || 40,
            description ? String(description).trim() : null
        ]);
        const savedClass = insertRes.rows[0];
        return NextResponse.json({
            success: true,
            classItem: { ...savedClass, subject_count: 0, has_information: false },
            class: { ...savedClass, subject_count: 0, has_information: false },
            message: 'Class created successfully.'
        });
    }
    catch (error: any) {
        if (error.code === '23505') {
            return NextResponse.json({ success: false, error: 'A class with this name or code already exists.' }, { status: 409 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
export async function PUT(request: any, context: any) {
    try {
        const auth = await verifyStaffAccess(request, context, 'edit');
        if (auth.error)
            return NextResponse.json({ success: false, error: auth.error, locked: Boolean(auth.locked) }, { status: auth.status });
        const body = await request.json().catch(() => ({}));
        const { id, name, code, max_seats, description } = body;
        if (!id) {
            return NextResponse.json({ success: false, error: 'Class ID is required.' }, { status: 400 });
        }
        const existingCheck = await queryDb(`SELECT * FROM website_classes WHERE id = $1 AND website_id = $2`, [id, auth.website.id]);
        if (existingCheck.rowCount === 0) {
            return NextResponse.json({ success: false, error: 'Class not found.' }, { status: 404 });
        }
        const existing = existingCheck.rows[0];
        const updatedName = name !== undefined ? (name ? String(name).trim() : existing.name) : existing.name;
        const updatedCode = code !== undefined ? (code ? String(code).trim().toUpperCase() : existing.code) : existing.code;
        const updatedMaxSeats = max_seats !== undefined ? (parseInt(max_seats, 10) || existing.max_seats) : existing.max_seats;
        const updatedDesc = description !== undefined ? (description ? String(description).trim() : null) : existing.description;
        const updateRes = await queryDb(`UPDATE website_classes
       SET name = $1,
           code = $2,
           max_seats = $3,
           description = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND website_id = $6
       RETURNING *`, [
            updatedName,
            updatedCode,
            updatedMaxSeats,
            updatedDesc,
            id,
            auth.website.id
        ]);
        const enrichedRes = await queryDb(`SELECT c.*,
              COALESCE((SELECT COUNT(*) FROM website_subjects sub WHERE sub.class_id = c.id), 0)::int +
              COALESCE((SELECT COUNT(*) FROM website_class_subjects cs WHERE cs.class_id = c.id), 0)::int AS subject_count,
              EXISTS(SELECT 1 FROM website_class_information ci WHERE ci.class_id = c.id AND ci.website_id = c.website_id) AS has_information
       FROM website_classes c
       WHERE c.id = $1`, [id]);
        return NextResponse.json({
            success: true,
            classItem: enrichedRes.rows[0] || updateRes.rows[0],
            class: enrichedRes.rows[0] || updateRes.rows[0],
            message: 'Class updated successfully.'
        });
    }
    catch (error: any) {
        if (error.code === '23505') {
            return NextResponse.json({ success: false, error: 'A class with this name or code already exists.' }, { status: 409 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
export async function DELETE(request: any, context: any) {
    try {
        const auth = await verifyStaffAccess(request, context, 'delete');
        if (auth.error)
            return NextResponse.json({ success: false, error: auth.error, locked: Boolean(auth.locked) }, { status: auth.status });
        const { searchParams } = new URL(request.url);
        let id = searchParams.get('id');
        if (!id) {
            const body = await request.json().catch(() => ({}));
            id = body.id;
        }
        if (!id) {
            return NextResponse.json({ success: false, error: 'Class ID is required.' }, { status: 400 });
        }
        const delRes = await queryDb(`DELETE FROM website_classes WHERE id = $1 AND website_id = $2 RETURNING id, name`, [id, auth.website.id]);
        if (delRes.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Class not found.' }, { status: 404 });
        }
        return NextResponse.json({
            success: true,
            message: `Class "${delRes.rows[0].name}" deleted successfully.`,
            deleted_id: delRes.rows[0].id
        });
    }
    catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
