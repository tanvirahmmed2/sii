import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
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

// GET: List all board members for this website
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status');
    const designation = searchParams.get('designation')?.trim();

    let query = `
      SELECT * FROM website_board_members 
      WHERE website_id = $1
    `;
    const params = [auth.website.id];

    if (status === 'active') {
      params.push(true);
      query += ` AND is_active = $${params.length}`;
    } else if (status === 'inactive') {
      params.push(false);
      query += ` AND is_active = $${params.length}`;
    }

    if (designation && designation !== 'all') {
      params.push(designation);
      query += ` AND designation ILIKE $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR title ILIKE $${params.length} OR designation ILIKE $${params.length} OR bio ILIKE $${params.length})`;
    }

    query += ` ORDER BY order_no ASC, id ASC`;

    const result = await queryDb(query, params);

    return NextResponse.json({
      success: true,
      board_members: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching board members:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Helper to parse multipart/form-data or json
async function parseBoardMemberRequest(request) {
  const contentType = request.headers.get('content-type') || '';
  let body = {};
  let imageFile = null;

  if (contentType.includes('multipart/form-data') || contentType.includes('form-data')) {
    const formData = await request.formData();
    for (const [key, value] of formData.entries()) {
      if (value && typeof value === 'object' && typeof value.arrayBuffer === 'function') {
        if (key === 'file' || key === 'image') {
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

// POST: Create a new board member
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { body, imageFile } = await parseBoardMemberRequest(request);
    const {
      name,
      title,
      designation,
      image,
      image_id,
      bio,
      order_no = 0,
      is_active = true,
    } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, error: 'Member name is required.' }, { status: 400 });
    }
    if (!designation || !String(designation).trim()) {
      return NextResponse.json({ success: false, error: 'Member designation or role is required.' }, { status: 400 });
    }

    const staffId = auth.staffSession?.staff_id || auth.staffSession?.id || null;

    // STEP 1: CREATE BOARD MEMBER IN DATABASE FIRST
    const insertResult = await queryDb(
      `INSERT INTO website_board_members (
        website_id, name, title, designation, image, image_id, bio, order_no, is_active, created_by_staff_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        auth.website.id,
        String(name).trim(),
        title ? String(title).trim() : null,
        String(designation).trim(),
        image ? String(image).trim() : null,
        image_id ? String(image_id).trim() : null,
        bio ? String(bio).trim() : null,
        parseInt(order_no, 10) || 0,
        Boolean(is_active),
        staffId,
      ]
    );

    const createdMember = insertResult.rows[0];

    // STEP 2: ONLY AFTER TABLE ROW EXISTS, UPLOAD IMAGE TO CLOUDINARY & SAVE URL
    if (imageFile) {
      try {
        const uploadRes = await uploadImage(imageFile, `school/${auth.website.id}/board_members`);
        if (uploadRes?.secure_url) {
          const updatePhotoRes = await queryDb(
            `UPDATE website_board_members SET image = $1, image_id = $2 WHERE id = $3 AND website_id = $4 RETURNING *`,
            [uploadRes.secure_url, uploadRes.publicId, createdMember.id, auth.website.id]
          );
          if (updatePhotoRes.rows[0]) {
            createdMember.image = updatePhotoRes.rows[0].image;
            createdMember.image_id = updatePhotoRes.rows[0].image_id;
          }
        }
      } catch (uploadErr) {
        console.error('Board member photo Cloudinary upload error:', uploadErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Board member created successfully.',
      member: createdMember,
    });
  } catch (error) {
    console.error('Error creating board member:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update an existing board member
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { body, imageFile } = await parseBoardMemberRequest(request);
    const {
      id,
      name,
      title,
      designation,
      image,
      image_id,
      bio,
      order_no,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Board member ID is required for update.' }, { status: 400 });
    }

    // Retrieve previous record to clean up old Cloudinary image if replaced
    const existingResult = await queryDb(
      `SELECT image_id FROM website_board_members WHERE id = $1 AND website_id = $2`,
      [id, auth.website.id]
    );
    const oldImageId = existingResult.rows[0]?.image_id;

    // STEP 1: UPDATE BOARD MEMBER IN DATABASE FIRST
    const updateResult = await queryDb(
      `UPDATE website_board_members
       SET name = COALESCE($1, name),
           title = CASE WHEN $2::text IS NOT NULL THEN $2::text ELSE title END,
           designation = COALESCE($3, designation),
           image = CASE WHEN $4::text IS NOT NULL THEN $4::text ELSE image END,
           image_id = CASE WHEN $5::text IS NOT NULL THEN $5::text ELSE image_id END,
           bio = CASE WHEN $6::text IS NOT NULL THEN $6::text ELSE bio END,
           order_no = COALESCE($7, order_no),
           is_active = COALESCE($8, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND website_id = $10
       RETURNING *`,
      [
        name !== undefined ? String(name).trim() : null,
        title !== undefined ? (title ? String(title).trim() : '') : null,
        designation !== undefined ? String(designation).trim() : null,
        image !== undefined ? (image ? String(image).trim() : '') : null,
        image_id !== undefined ? (image_id ? String(image_id).trim() : '') : null,
        bio !== undefined ? (bio ? String(bio).trim() : '') : null,
        order_no !== undefined ? parseInt(order_no, 10) : null,
        is_active !== undefined ? Boolean(is_active) : null,
        id,
        auth.website.id,
      ]
    );

    if (updateResult.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Board member not found.' }, { status: 404 });
    }

    let updatedMember = updateResult.rows[0];

    // STEP 2: IF NEW FILE PROVIDED, UPLOAD TO CLOUDINARY & UPDATE TABLE ROW
    if (imageFile) {
      try {
        const uploadRes = await uploadImage(imageFile, `school/${auth.website.id}/board_members`);
        if (uploadRes?.secure_url) {
          if (oldImageId) {
            deleteImage(oldImageId).catch((err) =>
              console.warn('Could not clean up replaced board member image on Cloudinary:', err.message)
            );
          }
          const updatePhotoRes = await queryDb(
            `UPDATE website_board_members SET image = $1, image_id = $2 WHERE id = $3 AND website_id = $4 RETURNING *`,
            [uploadRes.secure_url, uploadRes.publicId, id, auth.website.id]
          );
          if (updatePhotoRes.rows[0]) {
            updatedMember = updatePhotoRes.rows[0];
          }
        }
      } catch (uploadErr) {
        console.error('Board member photo update Cloudinary error:', uploadErr);
      }
    } else if (image_id !== undefined && oldImageId && oldImageId !== image_id) {
      // If image_id was replaced by explicit string and old image_id exists, clean up old Cloudinary asset
      deleteImage(oldImageId).catch((err) =>
        console.warn('Could not clean up replaced board member image on Cloudinary:', err.message)
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Board member updated successfully.',
      member: updatedMember,
    });
  } catch (error) {
    console.error('Error updating board member:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a board member
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('id');
    const body = await request.json().catch(() => ({}));
    const id = queryId || body.id;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Board member ID is required for deletion.' }, { status: 400 });
    }

    const deleteResult = await queryDb(
      `DELETE FROM website_board_members WHERE id = $1 AND website_id = $2 RETURNING id, name, image_id`,
      [id, auth.website.id]
    );

    if (deleteResult.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Board member not found or already deleted.' }, { status: 404 });
    }

    const deletedRecord = deleteResult.rows[0];
    if (deletedRecord.image_id) {
      deleteImage(deletedRecord.image_id).catch((err) =>
        console.warn('Could not delete board member image on Cloudinary:', err.message)
      );
    }

    return NextResponse.json({
      success: true,
      message: `Board member "${deletedRecord.name}" deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting board member:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
