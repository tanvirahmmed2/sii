import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { verifyStaffModuleAccess } from 'src/lib/middleware/staff';
import { verifyAcademicDimensionEnabled } from 'src/lib/modules/academicConfig';
import slugify from 'slugify';
function createSlug(text: any) {
    if (!text)
        return '';
    return slugify(String(text), { lower: true, strict: true, trim: true });
}
async function verifyStaffAccess(request: any, context: any, action: any = 'view') {
    const auth = await verifyStaffModuleAccess(request, context, ['departments', 'class-setup'], action);
    if (auth.error)
        return auth;
    const dim = await verifyAcademicDimensionEnabled(auth.website, 'department');
    if (dim.locked && action !== 'view') {
        return { error: dim.message, status: 403, locked: true, code: 'ACADEMIC_DIMENSION_LOCKED' };
    }
    return { ...auth, academicDim: dim };
}
export async function GET(request: any, context: any) {
    try {
        const auth = await verifyStaffAccess(request, context, 'view');
        if (auth.error) {
            return NextResponse.json({ success: false, error: auth.error, locked: Boolean(auth.locked) }, { status: auth.status });
        }
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search')?.trim();
        const status = searchParams.get('status');
        let query = `
      SELECT d.*,
             EXISTS(SELECT 1 FROM website_department_information di WHERE di.department_id = d.id) AS has_information,
             row_to_json(dh.*) AS dept_head
      FROM website_departments d
      LEFT JOIN website_dept_heads dh ON dh.department_id = d.id AND dh.website_id = d.website_id
      WHERE d.website_id = $1
    `;
        const params = [auth.website.id];
        if (status === 'active') {
            params.push(true);
            query += ` AND d.is_active = $${params.length}`;
        }
        else if (status === 'inactive') {
            params.push(false);
            query += ` AND d.is_active = $${params.length}`;
        }
        if (search) {
            params.push(`%${search}%`);
            query += ` AND (d.name ILIKE $${params.length} OR d.code ILIKE $${params.length} OR d.slug ILIKE $${params.length} OR d.description ILIKE $${params.length})`;
        }
        query += ` ORDER BY d.order_no ASC, d.id ASC`;
        const result = await queryDb(query, params);
        return NextResponse.json({
            success: true,
            locked: Boolean(auth.academicDim?.locked),
            academicConfig: auth.academicDim?.config || null,
            departments: result.rows,
            total: result.rowCount,
        });
    }
    catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
export async function POST(request: any, context: any) {
    try {
        const auth = await verifyStaffAccess(request, context, 'create');
        if (auth.error) {
            return NextResponse.json({ success: false, error: auth.error, locked: Boolean(auth.locked) }, { status: auth.status });
        }
        const body = await request.json().catch(() => ({}));
        const { name, code, slug, description = '', order_no = 0, is_active = true, } = body;
        if (!name || !String(name).trim()) {
            return NextResponse.json({ success: false, error: 'Department name is required.' }, { status: 400 });
        }
        const deptSlug = slug ? createSlug(slug) : createSlug(name);
        const staffId = auth.staffSession?.staff_id || auth.staffSession?.id || null;
        const insertResult = await queryDb(`INSERT INTO website_departments (
        website_id, name, slug, code, description, order_no, is_active, created_by_staff_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`, [
            auth.website.id,
            String(name).trim(),
            deptSlug,
            code ? String(code).trim().toUpperCase() : null,
            description ? String(description).trim() : null,
            parseInt(order_no, 10) || 0,
            Boolean(is_active),
            staffId,
        ]);
        const savedDept = insertResult.rows[0];
        const enrichedResult = await queryDb(`SELECT d.*,
              FALSE AS has_information,
              NULL::json AS dept_head
       FROM website_departments d
       WHERE d.id = $1`, [savedDept.id]);
        return NextResponse.json({
            success: true,
            message: 'Department created successfully.',
            department: enrichedResult.rows[0] || savedDept,
        });
    }
    catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
export async function PUT(request: any, context: any) {
    try {
        const auth = await verifyStaffAccess(request, context, 'edit');
        if (auth.error) {
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
        }
        const body = await request.json().catch(() => ({}));
        const { id, name, slug, code, description, order_no, is_active, } = body;
        if (!id) {
            return NextResponse.json({ success: false, error: 'Department ID is required for update.' }, { status: 400 });
        }
        const checkResult = await queryDb(`SELECT id FROM website_departments WHERE id = $1 AND website_id = $2`, [id, auth.website.id]);
        if (checkResult.rowCount === 0) {
            return NextResponse.json({ success: false, error: 'Department not found.' }, { status: 404 });
        }
        const deptSlug = slug !== undefined
            ? (slug ? createSlug(slug) : null)
            : (name ? createSlug(name) : null);
        await queryDb(`UPDATE website_departments
       SET name = COALESCE($1, name),
           slug = COALESCE($2, slug),
           code = COALESCE($3, code),
           description = COALESCE($4, description),
           order_no = COALESCE($5, order_no),
           is_active = COALESCE($6, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND website_id = $8`, [
            name !== undefined ? (name ? String(name).trim() : null) : null,
            deptSlug,
            code !== undefined ? (code ? String(code).trim().toUpperCase() : null) : null,
            description !== undefined ? String(description).trim() : null,
            order_no !== undefined ? parseInt(order_no, 10) : null,
            is_active !== undefined ? Boolean(is_active) : null,
            id,
            auth.website.id,
        ]);
        const updatedResult = await queryDb(`SELECT d.*,
              EXISTS(SELECT 1 FROM website_department_information di WHERE di.department_id = d.id) AS has_information,
              row_to_json(dh.*) AS dept_head
       FROM website_departments d
       LEFT JOIN website_dept_heads dh ON dh.department_id = d.id AND dh.website_id = d.website_id
       WHERE d.id = $1`, [id]);
        return NextResponse.json({
            success: true,
            message: 'Department updated successfully.',
            department: updatedResult.rows[0],
        });
    }
    catch (error: any) {
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
            return NextResponse.json({ success: false, error: 'Department ID is required.' }, { status: 400 });
        }
        const deleteResult = await queryDb(`DELETE FROM website_departments WHERE id = $1 AND website_id = $2 RETURNING id, name`, [id, auth.website.id]);
        if (deleteResult.rowCount === 0) {
            return NextResponse.json({ success: false, error: 'Department not found.' }, { status: 404 });
        }
        return NextResponse.json({
            success: true,
            message: `Department "${deleteResult.rows[0].name}" removed successfully.`,
            deleted_id: deleteResult.rows[0].id,
        });
    }
    catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
