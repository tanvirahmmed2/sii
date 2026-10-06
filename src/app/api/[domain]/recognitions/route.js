import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db';
import { isAdmin } from 'src/lib/middleware/developer';
import { uploadImage } from 'src/lib/database/cloudinary';
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

// GET all recognitions
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, message: 'Tenant website not found', paylod: { recognitions: [] } }, { status: 404 });
    }

    const result = await query(
      'SELECT * FROM website_recognitions WHERE website_id = $1 ORDER BY date DESC, created_at DESC',
      [website.id]
    );
    const res_data = { recognitions: result.rows };
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched recognitions',
      payload: res_data,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching recognitions:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve recognitions. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// POST create recognition (Admin only)
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, message: 'Tenant website not found', paylod: null }, { status: 404 });
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

    const { name, description, awarded_by, date, image } = await request.json();

    if (!name || !awarded_by || !date) {
      return NextResponse.json({
        success: false,
        message: 'Name, awarded by, and date are required.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    // Generate unique slug from name within this website
    let finalSlug = slugify(name);
    if (!finalSlug) finalSlug = `recognition-${Date.now()}`;
    const checkSlug = await query(
      'SELECT id FROM website_recognitions WHERE website_id = $1 AND slug = $2',
      [website.id, finalSlug]
    );
    if (checkSlug.rows.length > 0) {
      finalSlug = `${finalSlug}-${Date.now()}`;
    }

    let imageUrl = null;
    let imageId = null;

    if (image && image.startsWith('data:image')) {
      try {
        const uploadResult = await uploadImage(image, 'recognitions');
        imageUrl = uploadResult.url;
        imageId = uploadResult.publicId;
      } catch (uploadErr) {
        console.error('Cloudinary recognitions upload failed:', uploadErr);
        return NextResponse.json({
          success: false,
          message: 'Failed to upload image.',
          error: 'Internal Server Error',
          paylod: null
        }, { status: 500 });
      }
    } else if (image) {
      imageUrl = image;
    }

    const result = await query(
      `INSERT INTO website_recognitions (website_id, name, slug, description, awarded_by, date, image, image_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [website.id, name.trim(), finalSlug, description?.trim() || null, awarded_by.trim(), date, imageUrl, imageId]
    );

    const res_data = { message: 'Recognition created successfully.', recognition: result.rows[0] };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      payload: res_data,
      paylod: res_data
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating recognition:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create recognition. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
