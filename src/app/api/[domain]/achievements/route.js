import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db';
import { isAdmin, isRegister } from 'src/lib/middleware/developer';
import { uploadImage } from 'src/lib/database/cloudinary';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';

// GET all achievements
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, message: 'Tenant website not found', paylod: { achievements: [] } }, { status: 404 });
    }

    const result = await query(
      'SELECT * FROM website_achievements WHERE website_id = $1 ORDER BY created_at DESC',
      [website.id]
    );
    const res_data = { achievements: result.rows };
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched achievements',
      payload: res_data,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve achievements. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// POST create achievement (Admin only)
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, message: 'Tenant website not found', paylod: null }, { status: 404 });
    }

    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 403 });
    }

    const { title, description, image } = await request.json();

    if (!title || !description) {
      return NextResponse.json({
        success: false,
        message: 'Title and description are required.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    let imageUrl = null;
    let imageId = null;

    if (image && image.startsWith('data:image')) {
      try {
        const uploadResult = await uploadImage(image, 'achievements');
        imageUrl = uploadResult.url;
        imageId = uploadResult.publicId;
      } catch (uploadErr) {
        console.error('Cloudinary achievements upload failed:', uploadErr);
        return NextResponse.json({
          success: false,
          message: 'Failed to upload cover image.',
          error: 'Internal Server Error',
          paylod: null
        }, { status: 500 });
      }
    } else if (image) {
      imageUrl = image;
    }

    const result = await query(
      `INSERT INTO website_achievements (website_id, title, description, image_url, image_id) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [website.id, title.trim(), description.trim(), imageUrl, imageId]
    );

    const res_data = { message: 'Achievement created successfully.', achievement: result.rows[0] };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      payload: res_data,
      paylod: res_data
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating achievement:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create achievement. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
