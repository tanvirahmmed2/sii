import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { verifyStaffModuleAccess } from 'src/lib/middleware/staff';
import { verifyAcademicDimensionEnabled } from 'src/lib/modules/academicConfig';
async function verifyStaffAccess(request: any, context: any, action: any = 'view') {
    const auth = await verifyStaffModuleAccess(request, context, ['class-section', 'sections', 'class-setup'], action);
    if (auth.error)
        return auth;
    const dim = await verifyAcademicDimensionEnabled(auth.website, 'section');
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
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search')?.trim();
        let queryText = `
      SELECT s.*,
             COALESCE((SELECT COUNT(*) FROM website_students st WHERE st.section_id = s.id), 0)::int AS student_count
      FROM website_sections s
      WHERE s.website_id = $1
    `;
        const params: any[] = [auth.website.id];
        if (search) {
            params.push(`%${search}%`);
            queryText += ` AND (s.name ILIKE $${params.length} OR COALESCE(s.room_number, '') ILIKE $${params.length})`;
        }
        queryText += ` ORDER BY s.name ASC, s.id ASC`;
        const result = await queryDb(queryText, params);
        return NextResponse.json({
            success: true,
            locked: Boolean(auth.academicDim?.locked),
            academicConfig: auth.academicDim?.config || null,
            sections: result.rows,
            payload: {
                sections: result.rows,
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
        const { name, capacity = 40, room_number = '' } = body;
        if (!name || !String(name).trim()) {
            return NextResponse.json({ success: false, error: 'Section Name is required.' }, { status: 400 });
        }
        const insertRes = await queryDb(`INSERT INTO website_sections (website_id, name, capacity, room_number)
       VALUES ($1, $2, $3, $4)
       RETURNING *`, [
            auth.website.id,
            String(name).trim(),
            parseInt(capacity, 10) || 40,
            room_number ? String(room_number).trim() : null
        ]);
        const savedSection = insertRes.rows[0];
        return NextResponse.json({
            success: true,
            section: { ...savedSection, student_count: 0 },
            message: 'Section created successfully.'
        });
    }
    catch (error: any) {
        if (error.code === '23505') {
            return NextResponse.json({ success: false, error: 'A section with this name already exists.' }, { status: 409 });
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
        const { id, name, capacity, room_number } = body;
        if (!id) {
            return NextResponse.json({ success: false, error: 'Section ID is required.' }, { status: 400 });
        }
        const updateRes = await queryDb(`UPDATE website_sections
       SET name = COALESCE($1, name),
           capacity = COALESCE($2, capacity),
           room_number = CASE WHEN $3::text IS NOT NULL THEN $4 ELSE room_number END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND website_id = $6
       RETURNING *`, [
            name ? String(name).trim() : null,
            capacity !== undefined ? (parseInt(capacity, 10) || 40) : null,
            room_number !== undefined ? 'set' : null,
            room_number ? String(room_number).trim() : null,
            id,
            auth.website.id
        ]);
        if (updateRes.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Section not found.' }, { status: 404 });
        }
        return NextResponse.json({
            success: true,
            section: updateRes.rows[0],
            message: 'Section updated successfully.'
        });
    }
    catch (error: any) {
        if (error.code === '23505') {
            return NextResponse.json({ success: false, error: 'A section with this name already exists.' }, { status: 409 });
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
