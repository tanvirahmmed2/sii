import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isRegister } from '@/lib/auth';
import { uploadImage } from '@/lib/cloudinary';

// GET all hostels
export async function GET() {
  try {
    const result = await query(
      'SELECT id, name, slug, description, total_room, location, gender, image, image_id, created_at FROM hostels ORDER BY name ASC'
    );
    const res_data = { hostels: result.rows };
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched hostels',
      payload: res_data,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching hostels:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve hostels.',
      error: error.message
    }, { status: 500 });
  }
}

// POST create a new hostel
export async function POST(request) {
  try {
    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Admins and Registrars only.',
        error: 'Unauthorized'
      }, { status: 403 });
    }

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

    // Check duplicate name or slug
    const check = await query('SELECT id FROM hostels WHERE name = $1 OR slug = $2', [name.trim(), finalSlug]);
    if (check.rows.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'A hostel with this name or URL slug already exists.',
        error: 'Conflict',
        paylod: null
      }, { status: 400 });
    }

    let imageUrl = null;
    let imageId = null;

    if (image && image.startsWith('data:image')) {
      try {
        const uploadResult = await uploadImage(image, 'hostels');
        imageUrl = uploadResult.url;
        imageId = uploadResult.publicId;
      } catch (uploadErr) {
        console.error('Cloudinary upload failure:', uploadErr);
        return NextResponse.json({
          success: false,
          message: 'Failed to upload hostel banner image.',
          error: 'Internal Server Error',
          paylod: null
        }, { status: 500 });
      }
    } else if (image) {
      imageUrl = image;
    }

    const result = await query(
      `INSERT INTO hostels (name, slug, description, total_room, location, gender, image, image_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id, name, slug, description, total_room, location, gender, image, image_id`,
      [
        name.trim(),
        finalSlug,
        description ? description.trim() : null,
        total_room ? parseInt(total_room, 10) : 0,
        location.trim(),
        gender,
        imageUrl,
        imageId
      ]
    );

    const res_data = { message: 'Hostel created successfully.', hostel: result.rows[0] };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating hostel:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create hostel. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
