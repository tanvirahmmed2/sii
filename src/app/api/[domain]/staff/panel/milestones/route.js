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

// GET: List all milestones for this website
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status');

    let query = `
      SELECT * FROM website_milestons 
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

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (title ILIKE $${params.length} OR year ILIKE $${params.length} OR description ILIKE $${params.length})`;
    }

    query += ` ORDER BY order_no ASC, year ASC, id ASC`;

    const result = await queryDb(query, params);

    return NextResponse.json({
      success: true,
      milestones: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching milestones:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Helper to parse multipart/form-data or json
async function parseMilestoneRequest(request) {
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

// POST: Create a new milestone
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { body, imageFile } = await parseMilestoneRequest(request);
    const { year, title, description, image, image_id, order_no = 0, is_active = true } = body;

    if (!title || !String(title).trim()) {
      return NextResponse.json({ success: false, error: 'Milestone title is required.' }, { status: 400 });
    }
    if (!description || !String(description).trim()) {
      return NextResponse.json({ success: false, error: 'Milestone description is required.' }, { status: 400 });
    }

    const finalYear = String(year || new Date().getFullYear()).trim();
    const staffId = auth.staffSession?.staff_id || auth.staffSession?.id || null;

    // STEP 1: CREATE MILESTONE IN DATABASE FIRST
    const insertResult = await queryDb(
      `INSERT INTO website_milestons (
        website_id, year, title, description, image, image_id, order_no, is_active, created_by_staff_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        auth.website.id,
        finalYear,
        String(title).trim(),
        String(description).trim(),
        image ? String(image).trim() : null,
        image_id ? String(image_id).trim() : null,
        parseInt(order_no, 10) || 0,
        Boolean(is_active),
        staffId,
      ]
    );

    const createdMilestone = insertResult.rows[0];

    // STEP 2: ONLY AFTER TABLE ROW EXISTS, UPLOAD IMAGE TO CLOUDINARY & SAVE URL
    if (imageFile) {
      try {
        const uploadRes = await uploadImage(imageFile, `school/${auth.website.id}/milestones`);
        if (uploadRes?.secure_url) {
          const updatePhotoRes = await queryDb(
            `UPDATE website_milestons SET image = $1, image_id = $2 WHERE id = $3 AND website_id = $4 RETURNING *`,
            [uploadRes.secure_url, uploadRes.publicId, createdMilestone.id, auth.website.id]
          );
          if (updatePhotoRes.rows[0]) {
            createdMilestone.image = updatePhotoRes.rows[0].image;
            createdMilestone.image_id = updatePhotoRes.rows[0].image_id;
          }
        }
      } catch (uploadErr) {
        console.error('Milestone photo Cloudinary upload error:', uploadErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Milestone created successfully.',
      milestone: createdMilestone,
    });
  } catch (error) {
    console.error('Error creating milestone:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update an existing milestone
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { body, imageFile } = await parseMilestoneRequest(request);
    const { id, year, title, description, image, image_id, order_no, is_active } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Milestone ID is required for update.' }, { status: 400 });
    }

    // Retrieve previous milestone to clean up old Cloudinary image if replaced
    const existingResult = await queryDb(
      `SELECT image_id FROM website_milestons WHERE id = $1 AND website_id = $2`,
      [id, auth.website.id]
    );
    const oldImageId = existingResult.rows[0]?.image_id;

    // STEP 1: UPDATE MILESTONE IN DATABASE FIRST
    const updateResult = await queryDb(
      `UPDATE website_milestons
       SET year = COALESCE($1, year),
           title = COALESCE($2, title),
           description = COALESCE($3, description),
           image = CASE WHEN $4::text IS NOT NULL THEN $4::text ELSE image END,
           image_id = CASE WHEN $5::text IS NOT NULL THEN $5::text ELSE image_id END,
           order_no = COALESCE($6, order_no),
           is_active = COALESCE($7, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND website_id = $9
       RETURNING *`,
      [
        year !== undefined ? String(year).trim() : null,
        title !== undefined ? String(title).trim() : null,
        description !== undefined ? String(description).trim() : null,
        image !== undefined ? (image ? String(image).trim() : '') : null,
        image_id !== undefined ? (image_id ? String(image_id).trim() : '') : null,
        order_no !== undefined ? parseInt(order_no, 10) : null,
        is_active !== undefined ? Boolean(is_active) : null,
        id,
        auth.website.id,
      ]
    );

    if (updateResult.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Milestone not found.' }, { status: 404 });
    }

    let updatedMilestone = updateResult.rows[0];

    // STEP 2: IF NEW FILE PROVIDED, UPLOAD TO CLOUDINARY & UPDATE TABLE ROW
    if (imageFile) {
      try {
        const uploadRes = await uploadImage(imageFile, `school/${auth.website.id}/milestones`);
        if (uploadRes?.secure_url) {
          if (oldImageId) {
            deleteImage(oldImageId).catch((err) =>
              console.warn('Could not clean up replaced milestone image on Cloudinary:', err.message)
            );
          }
          const updatePhotoRes = await queryDb(
            `UPDATE website_milestons SET image = $1, image_id = $2 WHERE id = $3 AND website_id = $4 RETURNING *`,
            [uploadRes.secure_url, uploadRes.publicId, id, auth.website.id]
          );
          if (updatePhotoRes.rows[0]) {
            updatedMilestone = updatePhotoRes.rows[0];
          }
        }
      } catch (uploadErr) {
        console.error('Milestone photo update Cloudinary error:', uploadErr);
      }
    } else if (image_id !== undefined && oldImageId && oldImageId !== image_id) {
      // If image_id was replaced by explicit string and old image_id exists, clean up old Cloudinary asset
      deleteImage(oldImageId).catch((err) =>
        console.warn('Could not clean up replaced milestone image on Cloudinary:', err.message)
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Milestone updated successfully.',
      milestone: updatedMilestone,
    });
  } catch (error) {
    console.error('Error updating milestone:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a milestone
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('id');
    const body = await request.json().catch(() => ({}));
    const id = queryId || body.id;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Milestone ID is required for deletion.' }, { status: 400 });
    }

    const deleteResult = await queryDb(
      `DELETE FROM website_milestons WHERE id = $1 AND website_id = $2 RETURNING id, title, image_id`,
      [id, auth.website.id]
    );

    if (deleteResult.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Milestone not found or already deleted.' }, { status: 404 });
    }

    const deletedRecord = deleteResult.rows[0];
    if (deletedRecord.image_id) {
      deleteImage(deletedRecord.image_id).catch((err) =>
        console.warn('Could not delete milestone image on Cloudinary:', err.message)
      );
    }

    return NextResponse.json({
      success: true,
      message: `Milestone "${deletedRecord.title}" deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting milestone:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
