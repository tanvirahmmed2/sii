import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { uploadImage, deleteImage } from '@/lib/cloudinary';

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

// GET single recognition by ID (used internally)
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const result = await query('SELECT * FROM recognitions WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      const res_err_623 = { error: 'Recognition not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_623?.error || res_err_623?.message || 'An error occurred',
        error: res_err_623?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }
    const res_data_755 = { recognition: result.rows[0] };
      return NextResponse.json({
        success: true,
        message: res_data_755?.message || 'Successfully fecthed data',
        paylod: res_data_755
      }, { status: 200 });
  } catch (error) {
    console.error('Error fetching recognition:', error);
    const res_err_1351 = { error: 'Failed to retrieve recognition. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_1351?.error || res_err_1351?.message || 'An error occurred',
        error: res_err_1351?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// PUT update recognition (Admin only)
export async function PUT(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_1873 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_1873?.error || res_err_1873?.message || 'An error occurred',
        error: res_err_1873?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;

    const existing = await query('SELECT * FROM recognitions WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      const res_err_2358 = { error: 'Recognition not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_2358?.error || res_err_2358?.message || 'An error occurred',
        error: res_err_2358?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }
    const current = existing.rows[0];

    const { name, description, awarded_by, date, image } = await request.json();

    if (!name || !awarded_by || !date) {
      const res_err_2844 = { error: 'Name, awarded by, and date are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_2844?.error || res_err_2844?.message || 'An error occurred',
        error: res_err_2844?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Regenerate slug if name changed
    let newSlug = current.slug;
    if (name.trim() !== current.name) {
      let candidate = slugify(name);
      if (!candidate) candidate = `recognition-${Date.now()}`;
      const checkSlug = await query(
        'SELECT id FROM recognitions WHERE slug = $1 AND id != $2',
        [candidate, id]
      );
      if (checkSlug.rows.length > 0) {
        candidate = `${candidate}-${Date.now()}`;
      }
      newSlug = candidate;
    }

    let imageUrl = current.image;
    let imageId = current.image_id;

    if (image && image.startsWith('data:image')) {
      // Delete old image from Cloudinary if exists
      if (current.image_id) {
        try { await deleteImage(current.image_id); } catch (_) {}
      }
      try {
        const uploadResult = await uploadImage(image, 'recognitions');
        imageUrl = uploadResult.url;
        imageId = uploadResult.publicId;
      } catch (uploadErr) {
        console.error('Cloudinary recognitions upload failed:', uploadErr);
        const res_err_4212 = { error: 'Failed to upload image.' };
      return NextResponse.json({
        success: false,
        message: res_err_4212?.error || res_err_4212?.message || 'An error occurred',
        error: res_err_4212?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
      }
    }

    const result = await query(
      `UPDATE recognitions
       SET name = $1, slug = $2, description = $3, awarded_by = $4, date = $5,
           image = $6, image_id = $7
       WHERE id = $8
       RETURNING *`,
      [name.trim(), newSlug, description?.trim() || null, awarded_by.trim(), date, imageUrl, imageId, id]
    );

    const res_data_3529 = {
      message: 'Recognition updated successfully.',
      recognition: result.rows[0],
    };
      return NextResponse.json({
        success: true,
        message: res_data_3529?.message || 'Successfully fecthed data',
        paylod: res_data_3529
      }, { status: 200 });
  } catch (error) {
    console.error('Error updating recognition:', error);
    const res_err_5354 = { error: 'Failed to update recognition. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_5354?.error || res_err_5354?.message || 'An error occurred',
        error: res_err_5354?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// DELETE recognition (Admin only)
export async function DELETE(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_5873 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_5873?.error || res_err_5873?.message || 'An error occurred',
        error: res_err_5873?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;

    const existing = await query('SELECT * FROM recognitions WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      const res_err_6358 = { error: 'Recognition not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_6358?.error || res_err_6358?.message || 'An error occurred',
        error: res_err_6358?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const recognition = existing.rows[0];

    if (recognition.image_id) {
      try {
        await deleteImage(recognition.image_id);
      } catch (err) {
        console.error('Cloudinary delete error (non-fatal):', err);
      }
    }

    await query('DELETE FROM recognitions WHERE id = $1', [id]);

    const res_data_4946 = { message: 'Recognition deleted successfully.' };
      return NextResponse.json({
        success: true,
        message: res_data_4946?.message || 'Successfully fecthed data',
        paylod: res_data_4946
      }, { status: 200 });
  } catch (error) {
    console.error('Error deleting recognition:', error);
    const res_err_7421 = { error: 'Failed to delete recognition. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_7421?.error || res_err_7421?.message || 'An error occurred',
        error: res_err_7421?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
