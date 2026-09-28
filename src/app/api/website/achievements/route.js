import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isRegister } from '@/lib/auth';
import { uploadImage } from '@/lib/cloudinary';

// GET all achievements
export async function GET() {
  try {
    const result = await query('SELECT * FROM achievements ORDER BY created_at DESC');
    const res_data_367 = { achievements: result.rows };
      return NextResponse.json({
        success: true,
        message: res_data_367?.message || 'Successfully fecthed data',
        paylod: res_data_367
      }, { status: 200 });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    const res_err_734 = { error: 'Failed to retrieve achievements. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_734?.error || res_err_734?.message || 'An error occurred',
        error: res_err_734?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}


// POST create achievement (Admin only)
export async function POST(request) {
  try {
    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      const res_err_1244 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_1244?.error || res_err_1244?.message || 'An error occurred',
        error: res_err_1244?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { title, description, image } = await request.json();

    if (!title || !description) {
      const res_err_1672 = { error: 'Title and description are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_1672?.error || res_err_1672?.message || 'An error occurred',
        error: res_err_1672?.error || 'Internal Server Error',
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
        const res_err_2378 = { error: 'Failed to upload cover image.' };
      return NextResponse.json({
        success: false,
        message: res_err_2378?.error || res_err_2378?.message || 'An error occurred',
        error: res_err_2378?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
      }
    } else if (image) {
      imageUrl = image;
    }

    const result = await query(
      `INSERT INTO achievements (title, description, image_url, image_id) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [title.trim(), description.trim(), imageUrl, imageId]
    );

    const res_data_2110 = { message: 'Achievement created successfully.', achievement: result.rows[0] };
      return NextResponse.json({
        success: true,
        message: res_data_2110?.message || 'Successfully fecthed data',
        paylod: res_data_2110
      }, { status: 201 });
  } catch (error) {
    console.error('Error creating achievement:', error);
    const res_err_3454 = { error: 'Failed to create achievement. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_3454?.error || res_err_3454?.message || 'An error occurred',
        error: res_err_3454?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
