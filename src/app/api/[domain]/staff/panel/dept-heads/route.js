import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStaffSession } from 'src/lib/middleware/staff.js';
import { deleteImage } from 'src/lib/database/cloudinary.js';

async function verifyStaffAccess(request, context) {
  const website = await resolveWebsiteFromRequest(request, context);
  if (!website) {
    return { error: 'Educational institution portal not found.', status: 404 };
  }
  const staffSession = await getStaffSession(request);
  if (!staffSession) {
    return { error: 'Unauthorized: Staff access required.', status: 401 };
  }

  const staffWebsiteId =
    staffSession?.website_id ||
    staffSession?.websiteId ||
    staffSession?.staff?.websiteId ||
    staffSession?.staff?.website_id;

  if (staffWebsiteId && String(staffWebsiteId) !== String(website.id)) {
    return { error: 'Forbidden: Cross-tenant access denied.', status: 403 };
  }

  return { website, staffSession };
}

// GET: List department heads for this website (optionally filter by department_id)
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('department_id');
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.trim();

    let query = `
      SELECT dh.*,
             d.name AS department_name,
             d.slug AS department_slug,
             d.code AS department_code,
             t.email AS teacher_account_email
      FROM website_dept_heads dh
      JOIN website_departments d ON d.id = dh.department_id AND d.website_id = dh.website_id
      LEFT JOIN website_teachers t ON t.id = dh.teacher_id AND t.website_id = dh.website_id
      WHERE dh.website_id = $1
    `;
    const params = [auth.website.id];

    if (departmentId) {
      params.push(departmentId);
      query += ` AND dh.department_id = $${params.length}`;
    }

    if (status === 'active') {
      params.push(true);
      query += ` AND dh.is_active = $${params.length}`;
    } else if (status === 'inactive') {
      params.push(false);
      query += ` AND dh.is_active = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (dh.name ILIKE $${params.length} OR dh.title ILIKE $${params.length} OR dh.designation ILIKE $${params.length} OR d.name ILIKE $${params.length})`;
    }

    query += ` ORDER BY dh.order_no ASC, d.name ASC, dh.id ASC`;

    const result = await queryDb(query, params);

    return NextResponse.json({
      success: true,
      dept_heads: result.rows,
      payload: { dept_heads: result.rows },
      paylod: { dept_heads: result.rows },
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching department heads:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create or assign a department head
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const {
      department_id,
      teacher_id = null,
      name,
      title = 'Head of Department',
      designation = 'Department Head',
      image = null,
      image_id = null,
      bio = null,
      message = null,
      email = null,
      phone = null,
      joining_date = null,
      order_no = 0,
      is_active = true,
    } = body;

    if (!department_id) {
      return NextResponse.json({ success: false, error: 'Department ID is required.' }, { status: 400 });
    }
    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, error: 'Department head name is required.' }, { status: 400 });
    }

    // Verify department belongs to this website
    const deptCheck = await queryDb(
      `SELECT id, name FROM website_departments WHERE id = $1 AND website_id = $2`,
      [department_id, auth.website.id]
    );
    if (deptCheck.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Specified department not found.' }, { status: 404 });
    }

    const staffId = auth.staffSession?.staff_id || auth.staffSession?.id || null;

    const result = await queryDb(
      `INSERT INTO website_dept_heads (
        website_id, department_id, teacher_id, name, title, designation,
        image, image_id, bio, message, email, phone, joining_date,
        order_no, is_active, created_by_staff_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (website_id, department_id) DO UPDATE
      SET teacher_id = EXCLUDED.teacher_id,
          name = EXCLUDED.name,
          title = EXCLUDED.title,
          designation = EXCLUDED.designation,
          image = COALESCE(EXCLUDED.image, website_dept_heads.image),
          image_id = COALESCE(EXCLUDED.image_id, website_dept_heads.image_id),
          bio = EXCLUDED.bio,
          message = EXCLUDED.message,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          joining_date = EXCLUDED.joining_date,
          order_no = EXCLUDED.order_no,
          is_active = EXCLUDED.is_active,
          updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        auth.website.id,
        department_id,
        teacher_id || null,
        String(name).trim(),
        title ? String(title).trim() : null,
        designation ? String(designation).trim() : 'Department Head',
        image || null,
        image_id || null,
        bio ? String(bio).trim() : null,
        message ? String(message).trim() : null,
        email ? String(email).trim() : null,
        phone ? String(phone).trim() : null,
        joining_date || null,
        parseInt(order_no, 10) || 0,
        Boolean(is_active),
        staffId,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Department head saved successfully.',
      dept_head: result.rows[0],
      payload: { dept_head: result.rows[0] },
      paylod: { dept_head: result.rows[0] },
    });
  } catch (error) {
    console.error('Error saving department head:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update an existing department head
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const {
      id,
      department_id,
      teacher_id,
      name,
      title,
      designation,
      image,
      image_id,
      bio,
      message,
      email,
      phone,
      joining_date,
      order_no,
      is_active,
    } = body;

    if (!id && !department_id) {
      return NextResponse.json({ success: false, error: 'Department Head ID or Department ID is required.' }, { status: 400 });
    }

    const checkRes = await queryDb(
      `SELECT * FROM website_dept_heads WHERE website_id = $1 AND (id = $2 OR department_id = $3)`,
      [auth.website.id, id || null, department_id || null]
    );

    if (checkRes.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Department head record not found.' }, { status: 404 });
    }

    const existing = checkRes.rows[0];

    // If image is being replaced, clean up old image if different
    if (image_id && existing.image_id && existing.image_id !== image_id) {
      deleteImage(existing.image_id).catch(() => null);
    }

    const updateRes = await queryDb(
      `UPDATE website_dept_heads
       SET teacher_id = COALESCE($1, teacher_id),
           name = COALESCE($2, name),
           title = COALESCE($3, title),
           designation = COALESCE($4, designation),
           image = COALESCE($5, image),
           image_id = COALESCE($6, image_id),
           bio = COALESCE($7, bio),
           message = COALESCE($8, message),
           email = COALESCE($9, email),
           phone = COALESCE($10, phone),
           joining_date = COALESCE($11, joining_date),
           order_no = COALESCE($12, order_no),
           is_active = COALESCE($13, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $14 AND website_id = $15
       RETURNING *`,
      [
        teacher_id !== undefined ? (teacher_id || null) : null,
        name !== undefined ? (name ? String(name).trim() : null) : null,
        title !== undefined ? (title ? String(title).trim() : null) : null,
        designation !== undefined ? (designation ? String(designation).trim() : null) : null,
        image !== undefined ? (image || null) : null,
        image_id !== undefined ? (image_id || null) : null,
        bio !== undefined ? (bio ? String(bio).trim() : null) : null,
        message !== undefined ? (message ? String(message).trim() : null) : null,
        email !== undefined ? (email ? String(email).trim() : null) : null,
        phone !== undefined ? (phone ? String(phone).trim() : null) : null,
        joining_date !== undefined ? (joining_date || null) : null,
        order_no !== undefined ? parseInt(order_no, 10) : null,
        is_active !== undefined ? Boolean(is_active) : null,
        existing.id,
        auth.website.id,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Department head updated successfully.',
      dept_head: updateRes.rows[0],
      payload: { dept_head: updateRes.rows[0] },
      paylod: { dept_head: updateRes.rows[0] },
    });
  } catch (error) {
    console.error('Error updating department head:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a department head
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const departmentId = searchParams.get('department_id');

    if (!id && !departmentId) {
      return NextResponse.json({ success: false, error: 'ID or department_id is required.' }, { status: 400 });
    }

    const deleteRes = await queryDb(
      `DELETE FROM website_dept_heads 
       WHERE website_id = $1 AND (id = $2 OR department_id = $3)
       RETURNING id, name, image_id`,
      [auth.website.id, id || null, departmentId || null]
    );

    if (deleteRes.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Department head record not found.' }, { status: 404 });
    }

    if (deleteRes.rows[0].image_id) {
      deleteImage(deleteRes.rows[0].image_id).catch(() => null);
    }

    return NextResponse.json({
      success: true,
      message: `Department head "${deleteRes.rows[0].name}" removed successfully.`,
      deleted_id: deleteRes.rows[0].id,
    });
  } catch (error) {
    console.error('Error deleting department head:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
