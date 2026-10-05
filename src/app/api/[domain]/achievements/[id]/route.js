import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db';
import { isAdmin, isRegister } from 'src/lib/middleware/auth';
import { uploadImage, deleteImage } from 'src/lib/database/cloudinary';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';

// GET single achievement
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Tenant website not found' }, { status: 404 });
    }

    const params = await context?.params;
    const id = params?.id;
    const isNum = /^\d+$/.test(id);
    let result;
    if (isNum) {
      result = await query(
        'SELECT * FROM website_achievements WHERE website_id = $1 AND id = $2',
        [website.id, parseInt(id, 10)]
      );
    } else {
      const formattedTitle = id.replace(/-/g, ' ');
      result = await query(
        'SELECT * FROM website_achievements WHERE website_id = $1 AND (LOWER(title) LIKE $2 OR LOWER(title) = $3)',
        [website.id, `%${formattedTitle.toLowerCase()}%`, formattedTitle.toLowerCase()]
      );
    }

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Achievement not found' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      payload: { achievement: result.rows[0] },
      paylod: { achievement: result.rows[0] }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT update achievement
export async function PUT(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Tenant website not found' }, { status: 404 });
    }

    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Admins only.' }, { status: 403 });
    }

    const params = await context?.params;
    const id = params?.id;
    const { title, description, image } = await request.json();

    if (!title || !description) {
      return NextResponse.json({ success: false, error: 'Title and description are required.' }, { status: 400 });
    }

    const existingRes = await query(
      'SELECT * FROM website_achievements WHERE website_id = $1 AND id = $2',
      [website.id, parseInt(id, 10)]
    );
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
      `UPDATE website_achievements 
       SET title = $1, description = $2, image_url = $3, image_id = $4, updated_at = CURRENT_TIMESTAMP
       WHERE website_id = $5 AND id = $6 
       RETURNING *`,
      [title.trim(), description.trim(), imageUrl, imageId, website.id, parseInt(id, 10)]
    );

    return NextResponse.json({
      success: true,
      message: 'Achievement updated successfully.',
      payload: { achievement: result.rows[0] },
      paylod: { achievement: result.rows[0] }
    });
  } catch (error) {
    console.error('Error updating achievement:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE achievement
export async function DELETE(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Tenant website not found' }, { status: 404 });
    }

    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Admins only.' }, { status: 403 });
    }

    const params = await context?.params;
    const id = params?.id;
    const existingRes = await query(
      'SELECT image_id FROM website_achievements WHERE website_id = $1 AND id = $2',
      [website.id, parseInt(id, 10)]
    );
    const result = await query(
      'DELETE FROM website_achievements WHERE website_id = $1 AND id = $2 RETURNING *',
      [website.id, parseInt(id, 10)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Achievement not found.' }, { status: 404 });
    }

    if (existingRes.rows.length > 0 && existingRes.rows[0].image_id) {
      try {
        await deleteImage(existingRes.rows[0].image_id);
      } catch (err) {
        console.error('Error deleting image from Cloudinary:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Achievement deleted successfully.',
      payload: { achievement: result.rows[0] },
      paylod: { achievement: result.rows[0] }
    });
  } catch (error) {
    console.error('Error deleting achievement:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
