import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db';
import { isAdmin } from 'src/lib/middleware/auth';
import { uploadImage, deleteImage } from 'src/lib/database/cloudinary';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

// GET single recognition by ID
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Tenant website not found' }, { status: 404 });
    }

    const params = await context?.params;
    const id = params?.id;
    const result = await query(
      'SELECT * FROM website_recognitions WHERE website_id = $1 AND id = $2',
      [website.id, id]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Recognition not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched recognition',
      payload: { recognition: result.rows[0] },
      paylod: { recognition: result.rows[0] }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching recognition:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve recognition. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// PUT update recognition (Admin only)
export async function PUT(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Tenant website not found' }, { status: 404 });
    }

    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 403 });
    }

    const params = await context?.params;
    const id = params?.id;

    const existing = await query(
      'SELECT * FROM website_recognitions WHERE website_id = $1 AND id = $2',
      [website.id, id]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Recognition not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }
    const current = existing.rows[0];

    const { name, description, awarded_by, date, image } = await request.json();

    if (!name || !awarded_by || !date) {
      return NextResponse.json({
        success: false,
        message: 'Name, awarded by, and date are required.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    // Regenerate slug if name changed
    let newSlug = current.slug;
    if (name.trim() !== current.name) {
      let candidate = slugify(name);
      if (!candidate) candidate = `recognition-${Date.now()}`;
      const checkSlug = await query(
        'SELECT id FROM website_recognitions WHERE website_id = $1 AND slug = $2 AND id != $3',
        [website.id, candidate, id]
      );
      if (checkSlug.rows.length > 0) {
        candidate = `${candidate}-${Date.now()}`;
      }
      newSlug = candidate;
    }

    let imageUrl = current.image;
    let imageId = current.image_id;

    if (image && image.startsWith('data:image')) {
      try {
        const uploadResult = await uploadImage(image, 'recognitions');
        imageUrl = uploadResult.url;
        imageId = uploadResult.publicId;

        if (current.image_id) {
          try {
            await deleteImage(current.image_id);
          } catch (delErr) {
            console.error('Failed to delete old recognition image:', delErr);
          }
        }
      } catch (uploadErr) {
        console.error('Cloudinary recognitions upload failed:', uploadErr);
        return NextResponse.json({
          success: false,
          message: 'Failed to upload image.',
          error: 'Internal Server Error',
          paylod: null
        }, { status: 500 });
      }
    } else if (image === null) {
      imageUrl = null;
      imageId = null;
      if (current.image_id) {
        try {
          await deleteImage(current.image_id);
        } catch (delErr) {
          console.error('Failed to delete old recognition image:', delErr);
        }
      }
    }

    const result = await query(
      `UPDATE website_recognitions
       SET name = $1, slug = $2, description = $3, awarded_by = $4, date = $5, image = $6, image_id = $7, updated_at = CURRENT_TIMESTAMP
       WHERE website_id = $8 AND id = $9
       RETURNING *`,
      [name.trim(), newSlug, description?.trim() || null, awarded_by.trim(), date, imageUrl, imageId, website.id, id]
    );

    return NextResponse.json({
      success: true,
      message: 'Recognition updated successfully.',
      payload: { recognition: result.rows[0] },
      paylod: { recognition: result.rows[0] }
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating recognition:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update recognition.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// DELETE recognition (Admin only)
export async function DELETE(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Tenant website not found' }, { status: 404 });
    }

    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 403 });
    }

    const params = await context?.params;
    const id = params?.id;
    const existing = await query(
      'SELECT image_id FROM website_recognitions WHERE website_id = $1 AND id = $2',
      [website.id, id]
    );
    const result = await query(
      'DELETE FROM website_recognitions WHERE website_id = $1 AND id = $2 RETURNING *',
      [website.id, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Recognition not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    if (existing.rows[0]?.image_id) {
      try {
        await deleteImage(existing.rows[0].image_id);
      } catch (delErr) {
        console.error('Failed to delete recognition image:', delErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Recognition deleted successfully.',
      payload: { recognition: result.rows[0] },
      paylod: { recognition: result.rows[0] }
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting recognition:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete recognition.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
