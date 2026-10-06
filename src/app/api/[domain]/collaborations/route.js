import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db';
import { isAdmin } from 'src/lib/middleware/developer';
import { uploadImage, deleteImage } from 'src/lib/database/cloudinary';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';

// GET all collaborations
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, message: 'Tenant website not found', paylod: { collaborations: [] } }, { status: 404 });
    }

    const result = await query(
      'SELECT * FROM website_collaborations WHERE website_id = $1 ORDER BY created_at DESC',
      [website.id]
    );
    const res_data = { collaborations: result.rows };
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched collaborations',
      payload: res_data,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching collaborations:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve collaborations.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// POST create collaboration (Admin only)
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

    const { institution_name, logo, logo_id, description } = await request.json();

    if (!institution_name) {
      return NextResponse.json({
        success: false,
        message: 'Institution name is required.',
        error: 'Bad Request',
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
        return NextResponse.json({
          success: false,
          message: 'Failed to upload logo image.',
          error: 'Internal Server Error',
          paylod: null
        }, { status: 500 });
      }
    } else if (logo) {
      logoUrl = logo;
      logoId = logo_id || null;
    }

    const result = await query(
      `INSERT INTO website_collaborations (website_id, institution_name, logo, logo_id, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [website.id, institution_name.trim(), logoUrl, logoId, description?.trim() || null]
    );

    const res_data = { message: 'Collaboration created successfully.', collaboration: result.rows[0] };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      payload: res_data,
      paylod: res_data
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating collaboration:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create collaboration.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// DELETE collaboration (Admin only)
export async function DELETE(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, message: 'Tenant website not found', paylod: null }, { status: 404 });
    }

    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Admins only.' }, { status: 403 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'ID required' }, { status: 400 });
    }

    const existing = await query(
      'SELECT logo_id FROM website_collaborations WHERE website_id = $1 AND id = $2',
      [website.id, id]
    );
    await query(
      'DELETE FROM website_collaborations WHERE website_id = $1 AND id = $2',
      [website.id, id]
    );

    if (existing.rows[0]?.logo_id) {
      try {
        await deleteImage(existing.rows[0].logo_id);
      } catch {}
    }

    return NextResponse.json({ success: true, message: 'Collaboration deleted successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
