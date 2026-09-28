import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { uploadImage } from '@/lib/cloudinary';

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
export async function GET() {
  try {
    const result = await query('SELECT * FROM recognitions ORDER BY date DESC, created_at DESC');
    const res_data_552 = { recognitions: result.rows };
      return NextResponse.json({
        success: true,
        message: res_data_552?.message || 'Successfully fecthed data',
        paylod: res_data_552
      }, { status: 200 });
  } catch (error) {
    console.error('Error fetching recognitions:', error);
    const res_err_919 = { error: 'Failed to retrieve recognitions. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_919?.error || res_err_919?.message || 'An error occurred',
        error: res_err_919?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// POST create recognition (Admin only)
export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_1428 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_1428?.error || res_err_1428?.message || 'An error occurred',
        error: res_err_1428?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { name, description, awarded_by, date, image } = await request.json();

    if (!name || !awarded_by || !date) {
      const res_err_1880 = { error: 'Name, awarded by, and date are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_1880?.error || res_err_1880?.message || 'An error occurred',
        error: res_err_1880?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Generate unique slug from name
    let finalSlug = slugify(name);
    if (!finalSlug) finalSlug = `recognition-${Date.now()}`;
    const checkSlug = await query('SELECT id FROM recognitions WHERE slug = $1', [finalSlug]);
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
        const res_err_2912 = { error: 'Failed to upload image.' };
      return NextResponse.json({
        success: false,
        message: res_err_2912?.error || res_err_2912?.message || 'An error occurred',
        error: res_err_2912?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
      }
    } else if (image) {
      imageUrl = image;
    }

    const result = await query(
      `INSERT INTO recognitions (name, slug, description, awarded_by, date, image, image_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name.trim(), finalSlug, description?.trim() || null, awarded_by.trim(), date, imageUrl, imageId]
    );

    const res_data_2711 = { message: 'Recognition created successfully.', recognition: result.rows[0] };
      return NextResponse.json({
        success: true,
        message: res_data_2711?.message || 'Successfully fecthed data',
        paylod: res_data_2711
      }, { status: 201 });
  } catch (error) {
    console.error('Error creating recognition:', error);
    const res_err_4055 = { error: 'Failed to create recognition. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_4055?.error || res_err_4055?.message || 'An error occurred',
        error: res_err_4055?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
