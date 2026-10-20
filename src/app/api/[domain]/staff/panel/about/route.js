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

// GET: List all about entries for this website
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status');

    let query = `
      SELECT * FROM website_abouts 
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
      query += ` AND (title ILIKE $${params.length} OR subtitle ILIKE $${params.length} OR description ILIKE $${params.length})`;
    }

    query += ` ORDER BY order_no ASC, id ASC`;

    const result = await queryDb(query, params);

    return NextResponse.json({
      success: true,
      abouts: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching about entries:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Helper to parse multipart/form-data or json
async function parseAboutRequest(request) {
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

// POST: Create a new about section
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { body, imageFile } = await parseAboutRequest(request);
    const {
      title,
      subtitle,
      description,
      image,
      image_id,
      order_no = 0,
      is_active = true,
    } = body;

    if (!title || !String(title).trim()) {
      return NextResponse.json({ success: false, error: 'Title is required.' }, { status: 400 });
    }
    if (!description || !String(description).trim()) {
      return NextResponse.json({ success: false, error: 'Description is required.' }, { status: 400 });
    }

    const staffId = auth.staffSession?.staff_id || auth.staffSession?.id || null;

    // STEP 1: CREATE ABOUT ROW IN DATABASE FIRST
    const insertResult = await queryDb(
      `INSERT INTO website_abouts (
        website_id, title, subtitle, description, image, image_id, order_no, is_active, created_by_staff_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        auth.website.id,
        String(title).trim(),
        subtitle ? String(subtitle).trim() : null,
        String(description).trim(),
        image ? String(image).trim() : null,
        image_id ? String(image_id).trim() : null,
        parseInt(order_no, 10) || 0,
        Boolean(is_active),
        staffId,
      ]
    );

    const createdAbout = insertResult.rows[0];

    // STEP 2: ONLY AFTER TABLE ROW EXISTS, UPLOAD IMAGE TO CLOUDINARY & SAVE URL
    if (imageFile) {
      try {
        const uploadRes = await uploadImage(imageFile, `school/${auth.website.id}/abouts`);
        if (uploadRes?.secure_url) {
          const updatePhotoRes = await queryDb(
            `UPDATE website_abouts SET image = $1, image_id = $2 WHERE id = $3 AND website_id = $4 RETURNING *`,
            [uploadRes.secure_url, uploadRes.publicId, createdAbout.id, auth.website.id]
          );
          if (updatePhotoRes.rows[0]) {
            createdAbout.image = updatePhotoRes.rows[0].image;
            createdAbout.image_id = updatePhotoRes.rows[0].image_id;
          }
        }
      } catch (uploadErr) {
        console.error('About image Cloudinary upload error:', uploadErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'About section created successfully.',
      about: createdAbout,
    });
  } catch (error) {
    console.error('Error creating about section:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update an existing about section
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { body, imageFile } = await parseAboutRequest(request);
    const {
      id,
      title,
      subtitle,
      description,
      image,
      image_id,
      order_no,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'About section ID is required for update.' }, { status: 400 });
    }

    // Retrieve previous record to clean up old Cloudinary image if replaced
    const existingResult = await queryDb(
      `SELECT image_id FROM website_abouts WHERE id = $1 AND website_id = $2`,
      [id, auth.website.id]
    );
    const oldImageId = existingResult.rows[0]?.image_id;

    // STEP 1: UPDATE IN DATABASE FIRST
    const updateResult = await queryDb(
      `UPDATE website_abouts
       SET title = COALESCE($1, title),
           subtitle = CASE WHEN $2::text IS NOT NULL THEN $2::text ELSE subtitle END,
           description = COALESCE($3, description),
           image = CASE WHEN $4::text IS NOT NULL THEN $4::text ELSE image END,
           image_id = CASE WHEN $5::text IS NOT NULL THEN $5::text ELSE image_id END,
           order_no = COALESCE($6, order_no),
           is_active = COALESCE($7, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND website_id = $9
       RETURNING *`,
      [
        title !== undefined ? String(title).trim() : null,
        subtitle !== undefined ? (subtitle ? String(subtitle).trim() : '') : null,
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
      return NextResponse.json({ success: false, error: 'About section not found.' }, { status: 404 });
    }

    let updatedAbout = updateResult.rows[0];

    // STEP 2: IF NEW FILE PROVIDED, UPLOAD TO CLOUDINARY & UPDATE TABLE ROW
    if (imageFile) {
      try {
        const uploadRes = await uploadImage(imageFile, `school/${auth.website.id}/abouts`);
        if (uploadRes?.secure_url) {
          if (oldImageId) {
            deleteImage(oldImageId).catch((err) =>
              console.warn('Could not clean up replaced about image on Cloudinary:', err.message)
            );
          }
          const updatePhotoRes = await queryDb(
            `UPDATE website_abouts SET image = $1, image_id = $2 WHERE id = $3 AND website_id = $4 RETURNING *`,
            [uploadRes.secure_url, uploadRes.publicId, id, auth.website.id]
          );
          if (updatePhotoRes.rows[0]) {
            updatedAbout = updatePhotoRes.rows[0];
          }
        }
      } catch (uploadErr) {
        console.error('About image update Cloudinary error:', uploadErr);
      }
    } else if (image_id !== undefined && oldImageId && oldImageId !== image_id) {
      deleteImage(oldImageId).catch((err) =>
        console.warn('Could not clean up replaced about image on Cloudinary:', err.message)
      );
    }

    return NextResponse.json({
      success: true,
      message: 'About section updated successfully.',
      about: updatedAbout,
    });
  } catch (error) {
    console.error('Error updating about section:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete an about section
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('id');
    const body = await request.json().catch(() => ({}));
    const id = queryId || body.id;

    if (!id) {
      return NextResponse.json({ success: false, error: 'About section ID is required for deletion.' }, { status: 400 });
    }

    const deleteResult = await queryDb(
      `DELETE FROM website_abouts WHERE id = $1 AND website_id = $2 RETURNING id, title, image_id`,
      [id, auth.website.id]
    );

    if (deleteResult.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'About section not found or already deleted.' }, { status: 404 });
    }

    const deletedRecord = deleteResult.rows[0];
    if (deletedRecord.image_id) {
      deleteImage(deletedRecord.image_id).catch((err) =>
        console.warn('Could not delete about image on Cloudinary:', err.message)
      );
    }

    return NextResponse.json({
      success: true,
      message: `About section "${deletedRecord.title}" deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting about section:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
