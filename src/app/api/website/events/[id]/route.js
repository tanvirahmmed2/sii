import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isRegister } from '@/lib/auth';
import { uploadImage, deleteImage } from '@/lib/cloudinary';

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

// GET single event (by ID or slug)
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const isNum = !isNaN(parseInt(id, 10)) && String(parseInt(id, 10)) === String(id).trim();

    let result;
    if (isNum) {
      result = await query(
        `SELECT * FROM events 
         WHERE id = $1 
            OR slug = $2 
            OR LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(title, '[^a-zA-Z0-9]+', '-', 'g'))) = LOWER($2)`,
        [parseInt(id, 10), id]
      );
    } else {
      result = await query(
        `SELECT * FROM events 
         WHERE slug = $1 
            OR CAST(id AS TEXT) = $1 
            OR LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(title, '[^a-zA-Z0-9]+', '-', 'g'))) = LOWER($1)`,
        [id]
      );
    }

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Event not found',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    const ev = result.rows[0];
    const generatedSlug = slugify(ev.title) || String(ev.id);
    if (!ev.slug) {
      ev.slug = generatedSlug;
      await query('UPDATE events SET slug = $1 WHERE id = $2 AND (slug IS NULL OR slug = \'\')', [generatedSlug, ev.id]).catch(err => console.error('Error updating event slug:', err));
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully fetched event',
      paylod: { event: ev },
      payload: { event: ev }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// PUT update event (Admin or Registrar)
export async function PUT(request, { params }) {
  try {
    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      const res_err_289 = { error: 'Unauthorized. Admins or Registrars only.' };
      return NextResponse.json({
        success: false,
        message: res_err_289?.error || res_err_289?.message || 'An error occurred',
        error: res_err_289?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;
    const { title, description, event_date, location, image, image_id } = await request.json();

    if (!title || !description || !event_date || !location) {
      const res_err_789 = { error: 'Required fields (title, description, event_date, location) must be provided.' };
      return NextResponse.json({
        success: false,
        message: res_err_789?.error || res_err_789?.message || 'An error occurred',
        error: res_err_789?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Fetch existing event to check image details
    const existing = await query('SELECT image, image_id FROM events WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Event not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    const currentEvent = existing.rows[0];
    let imageUrl = currentEvent.image;
    let imageId = currentEvent.image_id;

    if (image && image.startsWith('data:image')) {
      try {
        if (currentEvent.image_id) {
          await deleteImage(currentEvent.image_id).catch(err => console.error('Cloudinary cleanup error:', err));
        }
        const uploadResult = await uploadImage(image, 'events');
        imageUrl = uploadResult.url;
        imageId = uploadResult.publicId;
      } catch (uploadErr) {
        console.error('Cloudinary event update upload failed:', uploadErr);
        return NextResponse.json({
          success: false,
          message: 'Failed to upload new event poster image.',
          error: 'Upload Failed',
          paylod: null
        }, { status: 500 });
      }
    } else if (image !== undefined) {
      imageUrl = image;
      imageId = image_id !== undefined ? image_id : currentEvent.image_id;
    }

    const result = await query(
      `UPDATE events 
       SET title = $1, description = $2, event_date = $3, location = $4, image = $5, image_id = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 
       RETURNING *`,
      [title.trim(), description.trim(), event_date, location.trim(), imageUrl, imageId, id]
    );

    const res_data_1145 = {
      message: 'Event updated successfully.',
      event: result.rows[0],
    };
    return NextResponse.json({
      success: true,
      message: res_data_1145?.message || 'Successfully updated event',
      paylod: res_data_1145
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating event:', error);
    const res_err_2252 = { error: 'Failed to update event. Internal server error.' };
    return NextResponse.json({
      success: false,
      message: res_err_2252?.error || res_err_2252?.message || 'An error occurred',
      error: res_err_2252?.error || 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// DELETE event (Admin or Registrar)
export async function DELETE(request, { params }) {
  try {
    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      const res_err_2759 = { error: 'Unauthorized. Admins or Registrars only.' };
      return NextResponse.json({
        success: false,
        message: res_err_2759?.error || res_err_2759?.message || 'An error occurred',
        error: res_err_2759?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;

    const existing = await query('SELECT image_id FROM events WHERE id = $1', [id]);
    if (existing.rows.length > 0 && existing.rows[0].image_id) {
      await deleteImage(existing.rows[0].image_id).catch(err => console.error('Cloudinary cleanup error on delete:', err));
    }

    const result = await query('DELETE FROM events WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      const res_err_3246 = { error: 'Event not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_3246?.error || res_err_3246?.message || 'An error occurred',
        error: res_err_3246?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const res_data_2221 = {
      message: 'Event deleted successfully.',
      id: result.rows[0].id,
    };
    return NextResponse.json({
      success: true,
      message: res_data_2221?.message || 'Successfully deleted event',
      paylod: res_data_2221
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting event:', error);
    const res_err_4024 = { error: 'Failed to delete event. Internal server error.' };
    return NextResponse.json({
      success: false,
      message: res_err_4024?.error || res_err_4024?.message || 'An error occurred',
      error: res_err_4024?.error || 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
