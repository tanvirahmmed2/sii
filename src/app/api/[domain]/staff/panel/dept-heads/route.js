import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/websiteResolver.js';
import { getStaffSession } from 'src/lib/middleware/staff.js';
import { uploadImage, deleteImage } from 'src/lib/database/cloudinary.js';

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

// Helper to retrieve a single fully joined department head record
async function getJoinedDeptHead(id, websiteId) {
  const res = await queryDb(
    `SELECT dh.*,
            d.name AS department_name,
            d.slug AS department_slug,
            d.code AS department_code,
            t.email AS teacher_account_email,
            t.name AS teacher_account_name
     FROM website_dept_heads dh
     JOIN website_departments d ON d.id = dh.department_id AND d.website_id = dh.website_id
     LEFT JOIN website_teachers t ON t.id = dh.teacher_id AND t.website_id = dh.website_id
     WHERE dh.id = $1 AND dh.website_id = $2`,
    [id, websiteId]
  );
  return res.rows[0] || null;
}

// GET: List department heads, available departments, and available teachers
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
             t.email AS teacher_account_email,
             t.name AS teacher_account_name
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
      query += ` AND (
        dh.name ILIKE $${params.length} OR 
        dh.title ILIKE $${params.length} OR 
        dh.designation ILIKE $${params.length} OR 
        dh.email ILIKE $${params.length} OR 
        d.name ILIKE $${params.length}
      )`;
    }

    query += ` ORDER BY dh.order_no ASC, d.name ASC, dh.id ASC`;

    // Fetch heads, departments, and teachers concurrently
    const [deptHeadsRes, departmentsRes, teachersRes] = await Promise.all([
      queryDb(query, params),
      queryDb(
        `SELECT id, name, slug, code 
         FROM website_departments 
         WHERE website_id = $1 
         ORDER BY name ASC`,
        [auth.website.id]
      ),
      queryDb(
        `SELECT id, name, email, phone, designation, photo, photo_id 
         FROM website_teachers 
         WHERE website_id = $1 
         ORDER BY name ASC`,
        [auth.website.id]
      ).catch(() => ({ rows: [] })),
    ]);

    return NextResponse.json({
      success: true,
      dept_heads: deptHeadsRes.rows,
      department_heads: deptHeadsRes.rows,
      available_departments: departmentsRes.rows,
      departments: departmentsRes.rows,
      available_teachers: teachersRes.rows,
      teachers: teachersRes.rows,
      total: deptHeadsRes.rowCount,
      payload: {
        dept_heads: deptHeadsRes.rows,
        available_departments: departmentsRes.rows,
        available_teachers: teachersRes.rows,
      },
      paylod: {
        dept_heads: deptHeadsRes.rows,
        available_departments: departmentsRes.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching department heads:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Helper to parse multipart/form-data or json
async function parseDeptHeadRequest(request) {
  const contentType = request.headers.get('content-type') || '';
  let body = {};
  let imageFile = null;

  if (contentType.includes('multipart/form-data') || contentType.includes('form-data')) {
    const formData = await request.formData();
    for (const [key, value] of formData.entries()) {
      if (value && typeof value === 'object' && typeof value.arrayBuffer === 'function') {
        if (key === 'file' || key === 'image' || key === 'photo') {
          imageFile = value;
        }
      } else {
        body[key] = value;
      }
    }
  } else {
    body = await request.json().catch(() => ({}));
  }

  return { body, imageFile };
}

// POST: Create or assign a department head
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { body, imageFile } = await parseDeptHeadRequest(request);
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
      return NextResponse.json({ success: false, error: 'Department selection is required.' }, { status: 400 });
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
      return NextResponse.json({ success: false, error: 'Selected department not found.' }, { status: 404 });
    }

    const staffId = auth.staffSession?.staff_id || auth.staffSession?.id || null;

    // STEP 1: CREATE OR UPSERT DEPARTMENT HEAD IN DATABASE FIRST
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

    const createdRecordId = result.rows[0].id;

    // STEP 2: ONLY AFTER TABLE ROW EXISTS, UPLOAD IMAGE TO CLOUDINARY & SAVE URL
    if (imageFile) {
      try {
        const uploadRes = await uploadImage(imageFile, `school/${auth.website.id}/dept_heads`);
        if (uploadRes?.secure_url) {
          await queryDb(
            `UPDATE website_dept_heads SET image = $1, image_id = $2 WHERE id = $3 AND website_id = $4`,
            [uploadRes.secure_url, uploadRes.publicId, createdRecordId, auth.website.id]
          );
        }
      } catch (uploadErr) {
        console.error('Department head photo Cloudinary upload error:', uploadErr);
      }
    }

    const savedHead = await getJoinedDeptHead(createdRecordId, auth.website.id);

    return NextResponse.json({
      success: true,
      message: `Department head for "${deptCheck.rows[0].name}" saved successfully.`,
      dept_head: savedHead || result.rows[0],
      payload: { dept_head: savedHead || result.rows[0] },
      paylod: { dept_head: savedHead || result.rows[0] },
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

    const { body, imageFile } = await parseDeptHeadRequest(request);
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

    // If department_id is changing, ensure new department is valid and doesn't belong to another head
    const targetDeptId = department_id !== undefined ? department_id : existing.department_id;
    if (String(targetDeptId) !== String(existing.department_id)) {
      const deptCheck = await queryDb(
        `SELECT id, name FROM website_departments WHERE id = $1 AND website_id = $2`,
        [targetDeptId, auth.website.id]
      );
      if (deptCheck.rowCount === 0) {
        return NextResponse.json({ success: false, error: 'Selected department not found.' }, { status: 404 });
      }

      const conflictCheck = await queryDb(
        `SELECT id, name FROM website_dept_heads WHERE website_id = $1 AND department_id = $2 AND id != $3`,
        [auth.website.id, targetDeptId, existing.id]
      );
      if (conflictCheck.rowCount > 0) {
        return NextResponse.json({
          success: false,
          error: `Another head ("${conflictCheck.rows[0].name}") is already assigned to that department.`,
        }, { status: 400 });
      }
    }

    // If image is being replaced by URL, clean up old image if different
    if (image_id !== undefined && existing.image_id && existing.image_id !== image_id && !imageFile) {
      deleteImage(existing.image_id).catch(() => null);
    }

    const updatedName = name !== undefined ? (name ? String(name).trim() : existing.name) : existing.name;
    const updatedTitle = title !== undefined ? (title ? String(title).trim() : null) : existing.title;
    const updatedDesignation = designation !== undefined ? (designation ? String(designation).trim() : 'Department Head') : existing.designation;
    const updatedImage = image !== undefined ? (image || null) : existing.image;
    const updatedImageId = image_id !== undefined ? (image_id || null) : existing.image_id;
    const updatedBio = bio !== undefined ? (bio ? String(bio).trim() : null) : existing.bio;
    const updatedMessage = message !== undefined ? (message ? String(message).trim() : null) : existing.message;
    const updatedEmail = email !== undefined ? (email ? String(email).trim() : null) : existing.email;
    const updatedPhone = phone !== undefined ? (phone ? String(phone).trim() : null) : existing.phone;
    const updatedJoiningDate = joining_date !== undefined ? (joining_date || null) : existing.joining_date;
    const updatedOrderNo = order_no !== undefined ? (parseInt(order_no, 10) || 0) : existing.order_no;
    const updatedIsActive = is_active !== undefined ? Boolean(is_active) : existing.is_active;
    const updatedTeacherId = teacher_id !== undefined ? (teacher_id || null) : existing.teacher_id;

    // STEP 1: UPDATE DEPARTMENT HEAD IN DATABASE FIRST
    await queryDb(
      `UPDATE website_dept_heads
       SET department_id = $1,
           teacher_id = $2,
           name = $3,
           title = $4,
           designation = $5,
           image = $6,
           image_id = $7,
           bio = $8,
           message = $9,
           email = $10,
           phone = $11,
           joining_date = $12,
           order_no = $13,
           is_active = $14,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $15 AND website_id = $16`,
      [
        targetDeptId,
        updatedTeacherId,
        updatedName,
        updatedTitle,
        updatedDesignation,
        updatedImage,
        updatedImageId,
        updatedBio,
        updatedMessage,
        updatedEmail,
        updatedPhone,
        updatedJoiningDate,
        updatedOrderNo,
        updatedIsActive,
        existing.id,
        auth.website.id,
      ]
    );

    // STEP 2: IF NEW FILE PROVIDED, UPLOAD TO CLOUDINARY & UPDATE TABLE ROW
    if (imageFile) {
      try {
        const uploadRes = await uploadImage(imageFile, `school/${auth.website.id}/dept_heads`);
        if (uploadRes?.secure_url) {
          if (existing.image_id) {
            deleteImage(existing.image_id).catch(() => null);
          }
          await queryDb(
            `UPDATE website_dept_heads SET image = $1, image_id = $2 WHERE id = $3 AND website_id = $4`,
            [uploadRes.secure_url, uploadRes.publicId, existing.id, auth.website.id]
          );
        }
      } catch (uploadErr) {
        console.error('Department head photo update Cloudinary error:', uploadErr);
      }
    }

    const savedHead = await getJoinedDeptHead(existing.id, auth.website.id);

    return NextResponse.json({
      success: true,
      message: 'Department head updated successfully.',
      dept_head: savedHead,
      payload: { dept_head: savedHead },
      paylod: { dept_head: savedHead },
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
    let id = searchParams.get('id');
    let departmentId = searchParams.get('department_id');

    // Also support JSON body if params are not in the URL
    if (!id && !departmentId) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
      departmentId = body.department_id;
    }

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
      id: deleteRes.rows[0].id,
    });
  } catch (error) {
    console.error('Error deleting department head:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
