import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isRegister } from '@/lib/auth';
import { uploadImage, deleteImage } from '@/lib/cloudinary';

// GET single achievement
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const isNum = /^\d+$/.test(id);
    let result;
    if (isNum) {
      result = await query('SELECT * FROM achievements WHERE id = $1', [parseInt(id, 10)]);
    } else {
      // Clean up slug hyphens for title comparison
      const formattedTitle = id.replace(/-/g, ' ');
      result = await query('SELECT * FROM achievements WHERE LOWER(title) LIKE $1 OR LOWER(title) = $2', [
        `%${formattedTitle.toLowerCase()}%`,
        formattedTitle.toLowerCase()
      ]);
    }

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Achievement not found' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      paylod: { achievement: result.rows[0] }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT update achievement
export async function PUT(request, { params }) {
  try {
    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Admins only.' }, { status: 403 });
    }

    const { id } = await params;
    const { title, description, image } = await request.json();

    if (!title || !description) {
      return NextResponse.json({ success: false, error: 'Title and description are required.' }, { status: 400 });
    }

    const existingRes = await query('SELECT * FROM achievements WHERE id = $1', [parseInt(id, 10)]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Achievement not found.' }, { status: 404 });
    }

    const existing = existingRes.rows[0];
    let imageUrl = existing.image_url;
    let imageId = existing.image_id;

    if (image && image.startsWith('data:image')) {
      try {
        if (existing.image_id) {
          await deleteImage(existing.image_id);
        }
        const uploadResult = await uploadImage(image, 'achievements');
        imageUrl = uploadResult.url;
        imageId = uploadResult.publicId;
      } catch (uploadErr) {
        console.error('Image upload error:', uploadErr);
        return NextResponse.json({ success: false, error: 'Failed to upload image.' }, { status: 500 });
      }
    } else if (image !== undefined) {
      imageUrl = image;
    }

    const result = await query(
      `UPDATE achievements 
       SET title = $1, description = $2, image_url = $3, image_id = $4
       WHERE id = $5 
       RETURNING *`,
      [title.trim(), description.trim(), imageUrl, imageId, parseInt(id, 10)]
    );

    return NextResponse.json({
      success: true,
      message: 'Achievement updated successfully.',
      paylod: { achievement: result.rows[0] }
    });
  } catch (error) {
    console.error('Error updating achievement:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE achievement
export async function DELETE(request, { params }) {
  try {
    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Admins only.' }, { status: 403 });
    }

    const { id } = await params;
    const existingRes = await query('SELECT image_id FROM achievements WHERE id = $1', [parseInt(id, 10)]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Achievement not found.' }, { status: 404 });
    }

    if (existingRes.rows[0].image_id) {
      try {
        await deleteImage(existingRes.rows[0].image_id);
      } catch (e) {
        console.error('Failed to delete image from Cloudinary:', e);
      }
    }

    await query('DELETE FROM achievements WHERE id = $1', [parseInt(id, 10)]);

    return NextResponse.json({
      success: true,
      message: 'Achievement deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting achievement:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
