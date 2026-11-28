import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { verifyStaffModuleAccess } from 'src/lib/middleware/staff';
import { verifyAcademicDimensionEnabled } from 'src/lib/modules/academicConfig';
async function verifyStaffAccess(request: any, context: any, action: any = 'view') {
    const auth = await verifyStaffModuleAccess(request, context, ['academic-year', 'routine'], action);
    if (auth.error)
        return auth;
    const dim = await verifyAcademicDimensionEnabled(auth.website, 'session');
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
        let query = `
      SELECT s.*,
             COALESCE((SELECT COUNT(*) FROM website_students st WHERE st.session_id = s.id), 0)::int AS student_count
      FROM website_sessions s
      WHERE s.website_id = $1
    `;
        const params = [auth.website.id];
        if (search) {
            params.push(`%${search}%`);
            query += ` AND s.name ILIKE $${params.length}`;
        }
        query += ` ORDER BY s.name ASC, s.id DESC`;
        const result = await queryDb(query, params);
        return NextResponse.json({
            success: true,
            locked: Boolean(auth.academicDim?.locked),
            academicConfig: auth.academicDim?.config || null,
            sessions: result.rows,
            payload: { sessions: result.rows }
        });
    }
    catch (error: any) {
        console.error('Error in GET sessions:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
export async function POST(request: any, context: any) {
    try {
        const auth = await verifyStaffAccess(request, context, 'create');
        if (auth.error)
            return NextResponse.json({ success: false, error: auth.error, locked: Boolean(auth.locked) }, { status: auth.status });
        const body = await request.json().catch(() => ({}));
        const { name, status = 'active' } = body;
        if (!name || !String(name).trim()) {
            return NextResponse.json({ success: false, error: 'Session Name is required (e.g., 2026-2027).' }, { status: 400 });
        }
        const trimmedName = String(name).trim();
        const insertRes = await queryDb(`INSERT INTO website_sessions (website_id, name, status)
       VALUES ($1, $2, $3)
       RETURNING *`, [
            auth.website.id,
            trimmedName,
            status || 'active'
        ]);
        const savedRow = insertRes.rows[0];
        return NextResponse.json({
            success: true,
            session: { ...savedRow, class_count: 0 },
            message: 'Academic session created successfully.'
        });
    }
    catch (error: any) {
        console.error('Error in POST session:', error);
        if (error.code === '23505') {
            return NextResponse.json({ success: false, error: 'An academic session with this name already exists.' }, { status: 409 });
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
        const { id, name, status } = body;
        if (!id) {
            return NextResponse.json({ success: false, error: 'Session ID is required.' }, { status: 400 });
        }
        const updateRes = await queryDb(`UPDATE website_sessions
       SET name = COALESCE($1, name),
           status = COALESCE($2, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND website_id = $4
       RETURNING *`, [
            name ? String(name).trim() : null,
            status || null,
            id,
            auth.website.id
        ]);
        if (updateRes.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Session not found.' }, { status: 404 });
        }
        return NextResponse.json({
            success: true,
            session: { ...updateRes.rows[0], class_count: 0 },
            message: 'Academic session updated successfully.'
        });
    }
    catch (error: any) {
        console.error('Error in PUT session:', error);
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
            return NextResponse.json({ success: false, error: 'Session ID is required.' }, { status: 400 });
        }
        const delRes = await queryDb(`DELETE FROM website_sessions WHERE id = $1 AND website_id = $2 RETURNING id, name`, [id, auth.website.id]);
        if (delRes.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Session not found.' }, { status: 404 });
        }
        return NextResponse.json({
            success: true,
            message: `Academic session "${delRes.rows[0].name}" deleted successfully.`
        });
    }
    catch (error: any) {
        console.error('Error in DELETE session:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
