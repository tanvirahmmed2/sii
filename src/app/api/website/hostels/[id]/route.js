import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { uploadImage, deleteImage } from '@/lib/cloudinary';

// GET a single hostel
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const result = await query(
      'SELECT id, name, slug, description, total_room, location, gender, image, image_id, created_at FROM hostels WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Hostel not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    const res_data = { hostel: result.rows[0] };
    return NextResponse.json({
      success: true,
      message: 'Hostel fetched successfully.',
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching hostel:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve hostel details.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// PUT update a hostel
export async function PUT(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;
    const { name, description, total_room, location, gender, image } = await request.json();

    if (!name || !location) {
      return NextResponse.json({
        success: false,
        message: 'Hostel name and location are required.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    if (!gender || !['Male', 'Female'].includes(gender)) {
      return NextResponse.json({
        success: false,
        message: "Gender is required and must be either 'Male' or 'Female'.",
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    const finalSlug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Check duplicate name or slug (excluding current ID)
    const duplicate = await query(
      'SELECT id FROM hostels WHERE (name = $1 OR slug = $2) AND id <> $3',
      [name.trim(), finalSlug, id]
    );

    if (duplicate.rows.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Another hostel with this name or URL slug already exists.',
        error: 'Conflict',
        paylod: null
      }, { status: 400 });
    }

    // Get current image details
    const existing = await query('SELECT image, image_id FROM hostels WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Hostel not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }
    const currentHostel = existing.rows[0];

    let imageUrl = currentHostel.image;
    let imageId = currentHostel.image_id;

    if (image && image.startsWith('data:image')) {
      try {
        const uploadResult = await uploadImage(image, 'hostels');
        imageUrl = uploadResult.url;
        imageId = uploadResult.publicId;

        if (currentHostel.image_id) {
          try {
            await deleteImage(currentHostel.image_id);
          } catch (delErr) {
            console.error('Failed to delete old hostel image:', delErr);
          }
        }
      } catch (uploadErr) {
        console.error('Cloudinary upload failure:', uploadErr);
        return NextResponse.json({
          success: false,
          message: 'Failed to upload new hostel image.',
          error: 'Internal Server Error',
          paylod: null
        }, { status: 500 });
      }
    } else if (image === null) {
      imageUrl = null;
      imageId = null;
      if (currentHostel.image_id) {
        try {
          await deleteImage(currentHostel.image_id);
        } catch (delErr) {
          console.error('Failed to delete old hostel image:', delErr);
        }
      }
    }

    const result = await query(
      `UPDATE hostels 
       SET name = $1, slug = $2, description = $3, total_room = $4, location = $5, gender = $6, image = $7, image_id = $8, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $9 
       RETURNING id, name, slug, description, total_room, location, gender, image, image_id`,
      [
        name.trim(),
        finalSlug,
        description ? description.trim() : null,
        total_room ? parseInt(total_room, 10) : 0,
        location.trim(),
        gender,
        imageUrl,
        imageId,
        id
      ]
    );

    const res_data = {
      message: 'Hostel details updated successfully.',
      hostel: result.rows[0]
    };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating hostel:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update hostel.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// DELETE a hostel
export async function DELETE(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;

    const existing = await query('SELECT image_id FROM hostels WHERE id = $1', [id]);
    const result = await query('DELETE FROM hostels WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Hostel not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    if (existing.rows.length > 0 && existing.rows[0].image_id) {
      try {
        await deleteImage(existing.rows[0].image_id);
      } catch (delErr) {
        console.error('Failed to delete hostel image from Cloudinary:', delErr);
      }
    }

    const res_data = { message: 'Hostel deleted successfully.' };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting hostel:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete hostel. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
