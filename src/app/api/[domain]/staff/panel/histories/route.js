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

// GET: List all histories for this website
export async function GET(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status');

    let query = `
      SELECT * FROM website_histories 
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
      query += ` AND (title ILIKE $${params.length} OR description ILIKE $${params.length} OR infor ILIKE $${params.length} OR year ILIKE $${params.length})`;
    }

    query += ` ORDER BY order_no ASC, COALESCE(date, '1900-01-01'::date) DESC, id DESC`;

    const result = await queryDb(query, params);

    return NextResponse.json({
      success: true,
      histories: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching histories:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Helper to parse multipart/form-data or json
async function parseHistoryRequest(request) {
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

// POST: Create a new history record
export async function POST(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { body, imageFile } = await parseHistoryRequest(request);
    const {
      title,
      date,
      year,
      description,
      infor,
      image,
      image_id,
      order_no = 0,
      is_active = true,
    } = body;

    if (!title || !String(title).trim()) {
      return NextResponse.json({ success: false, error: 'History event title is required.' }, { status: 400 });
    }
    if (!description || !String(description).trim()) {
      return NextResponse.json({ success: false, error: 'History description is required.' }, { status: 400 });
    }

    const staffId = auth.staffSession?.staff_id || auth.staffSession?.id || null;

    // STEP 1: CREATE ROW IN DATABASE FIRST
    const insertResult = await queryDb(
      `INSERT INTO website_histories (
        website_id, title, date, year, description, infor, image, image_id, order_no, is_active, created_by_staff_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        auth.website.id,
        String(title).trim(),
        date ? date : null,
        year ? String(year).trim() : null,
        String(description).trim(),
        infor ? String(infor).trim() : null,
        image ? String(image).trim() : null,
        image_id ? String(image_id).trim() : null,
        parseInt(order_no, 10) || 0,
        Boolean(is_active),
        staffId,
      ]
    );

    const createdHistory = insertResult.rows[0];

    // STEP 2: ONLY AFTER TABLE ROW EXISTS, UPLOAD IMAGE TO CLOUDINARY & SAVE URL
    if (imageFile) {
      try {
        const uploadRes = await uploadImage(imageFile, `school/${auth.website.id}/histories`);
        if (uploadRes?.secure_url) {
          const updatePhotoRes = await queryDb(
            `UPDATE website_histories SET image = $1, image_id = $2 WHERE id = $3 AND website_id = $4 RETURNING *`,
            [uploadRes.secure_url, uploadRes.publicId, createdHistory.id, auth.website.id]
          );
          if (updatePhotoRes.rows[0]) {
            createdHistory.image = updatePhotoRes.rows[0].image;
            createdHistory.image_id = updatePhotoRes.rows[0].image_id;
          }
        }
      } catch (uploadErr) {
        console.error('History Cloudinary upload error:', uploadErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'History record created successfully.',
      history: createdHistory,
    });
  } catch (error) {
    console.error('Error creating history:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update an existing history record
export async function PUT(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { body, imageFile } = await parseHistoryRequest(request);
    const {
      id,
      title,
      date,
      year,
      description,
      infor,
      image,
      image_id,
      order_no,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'History ID is required for update.' }, { status: 400 });
    }

    // Retrieve previous record to clean up old Cloudinary image if replaced
    const existingResult = await queryDb(
      `SELECT image_id FROM website_histories WHERE id = $1 AND website_id = $2`,
      [id, auth.website.id]
    );
    const oldImageId = existingResult.rows[0]?.image_id;

    // STEP 1: UPDATE IN DATABASE FIRST
    const updateResult = await queryDb(
      `UPDATE website_histories
       SET title = COALESCE($1, title),
           date = CASE WHEN $2::date IS NOT NULL THEN $2::date ELSE date END,
           year = CASE WHEN $3::text IS NOT NULL THEN $3::text ELSE year END,
           description = COALESCE($4, description),
           infor = CASE WHEN $5::text IS NOT NULL THEN $5::text ELSE infor END,
           image = CASE WHEN $6::text IS NOT NULL THEN $6::text ELSE image END,
           image_id = CASE WHEN $7::text IS NOT NULL THEN $7::text ELSE image_id END,
           order_no = COALESCE($8, order_no),
           is_active = COALESCE($9, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND website_id = $11
       RETURNING *`,
      [
        title !== undefined ? String(title).trim() : null,
        date !== undefined ? date : null,
        year !== undefined ? (year ? String(year).trim() : '') : null,
        description !== undefined ? String(description).trim() : null,
        infor !== undefined ? (infor ? String(infor).trim() : '') : null,
        image !== undefined ? (image ? String(image).trim() : '') : null,
        image_id !== undefined ? (image_id ? String(image_id).trim() : '') : null,
        order_no !== undefined ? parseInt(order_no, 10) : null,
        is_active !== undefined ? Boolean(is_active) : null,
        id,
        auth.website.id,
      ]
    );

    if (updateResult.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'History record not found.' }, { status: 404 });
    }

    let updatedHistory = updateResult.rows[0];

    // STEP 2: IF NEW FILE PROVIDED, UPLOAD TO CLOUDINARY & UPDATE TABLE ROW
    if (imageFile) {
      try {
        const uploadRes = await uploadImage(imageFile, `school/${auth.website.id}/histories`);
        if (uploadRes?.secure_url) {
          if (oldImageId) {
            deleteImage(oldImageId).catch((err) =>
              console.warn('Could not clean up replaced history image on Cloudinary:', err.message)
            );
          }
          const updatePhotoRes = await queryDb(
            `UPDATE website_histories SET image = $1, image_id = $2 WHERE id = $3 AND website_id = $4 RETURNING *`,
            [uploadRes.secure_url, uploadRes.publicId, id, auth.website.id]
          );
          if (updatePhotoRes.rows[0]) {
            updatedHistory = updatePhotoRes.rows[0];
          }
        }
      } catch (uploadErr) {
        console.error('History image update Cloudinary error:', uploadErr);
      }
    } else if (image_id !== undefined && oldImageId && oldImageId !== image_id) {
      deleteImage(oldImageId).catch((err) =>
        console.warn('Could not clean up replaced history image on Cloudinary:', err.message)
      );
    }

    return NextResponse.json({
      success: true,
      message: 'History record updated successfully.',
      history: updatedHistory,
    });
  } catch (error) {
    console.error('Error updating history:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a history record
export async function DELETE(request, context) {
  try {
    const auth = await verifyStaffAccess(request, context);
    if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('id');
    const body = await request.json().catch(() => ({}));
    const id = queryId || body.id;

    if (!id) {
      return NextResponse.json({ success: false, error: 'History ID is required for deletion.' }, { status: 400 });
    }

    const deleteResult = await queryDb(
      `DELETE FROM website_histories WHERE id = $1 AND website_id = $2 RETURNING id, title, image_id`,
      [id, auth.website.id]
    );

    if (deleteResult.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'History record not found or already deleted.' }, { status: 404 });
    }

    const deletedRecord = deleteResult.rows[0];
    if (deletedRecord.image_id) {
      deleteImage(deletedRecord.image_id).catch((err) =>
        console.warn('Could not delete history image on Cloudinary:', err.message)
      );
    }

    return NextResponse.json({
      success: true,
      message: `History record "${deletedRecord.title}" deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting history:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
