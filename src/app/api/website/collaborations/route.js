import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { uploadImage } from '@/lib/cloudinary';

// GET all collaborations
export async function GET() {
  try {
    const result = await query('SELECT * FROM collaborations ORDER BY created_at DESC');
    const res_data = { collaborations: result.rows };
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched data',
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching collaborations:', error);
    const res_err = { error: 'Failed to retrieve collaborations. Internal server error.' };
    return NextResponse.json({
      success: false,
      message: res_err.error,
      error: res_err.error,
      paylod: null
    }, { status: 500 });
  }
}

// POST create collaboration (Admin only)
export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err.error,
        error: res_err.error,
        paylod: null
      }, { status: 403 });
    }

    const { institution_name, logo, logo_id, description } = await request.json();

    if (!institution_name) {
      const res_err = { error: 'Institution name is required.' };
      return NextResponse.json({
        success: false,
        message: res_err.error,
        error: res_err.error,
        paylod: null
      }, { status: 400 });
    }

    let logoUrl = null;
    let logoId = null;

    if (logo && logo.startsWith('data:image')) {
      try {
        const uploadResult = await uploadImage(logo, 'collaborations');
        logoUrl = uploadResult.url;
        logoId = uploadResult.publicId;
      } catch (uploadErr) {
        console.error('Cloudinary collaborations upload failed:', uploadErr);
        const res_err = { error: 'Failed to upload logo image.' };
        return NextResponse.json({
          success: false,
          message: res_err.error,
          error: res_err.error,
          paylod: null
        }, { status: 500 });
      }
    } else if (logo) {
      logoUrl = logo;
      logoId = logo_id || null;
    }

    const result = await query(
      `INSERT INTO collaborations (institution_name, logo, logo_id, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [institution_name.trim(), logoUrl, logoId, description?.trim() || null]
    );

    const res_data = { message: 'Collaboration created successfully.', collaboration: result.rows[0] };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating collaboration:', error);
    const res_err = { error: 'Failed to create collaboration. Internal server error.' };
    return NextResponse.json({
      success: false,
      message: res_err.error,
      error: res_err.error,
      paylod: null
    }, { status: 500 });
  }
}
