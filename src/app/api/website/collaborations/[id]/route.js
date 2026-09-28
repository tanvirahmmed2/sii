import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { uploadImage, deleteImage } from '@/lib/cloudinary';

// GET single collaboration by ID
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const result = await query('SELECT * FROM collaborations WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      const res_err = { error: 'Collaboration not found.' };
      return NextResponse.json({
        success: false,
        message: res_err.error,
        error: res_err.error,
        paylod: null
      }, { status: 404 });
    }
    const res_data = { collaboration: result.rows[0] };
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched data',
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching collaboration:', error);
    const res_err = { error: 'Failed to retrieve collaboration. Internal server error.' };
    return NextResponse.json({
      success: false,
      message: res_err.error,
      error: res_err.error,
      paylod: null
    }, { status: 500 });
  }
}

// PUT update collaboration (Admin only)
export async function PUT(request, { params }) {
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

    const { id } = await params;

    const existing = await query('SELECT * FROM collaborations WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      const res_err = { error: 'Collaboration not found.' };
      return NextResponse.json({
        success: false,
        message: res_err.error,
        error: res_err.error,
        paylod: null
      }, { status: 404 });
    }
    const current = existing.rows[0];

    const { institution_name, logo, description } = await request.json();

    if (!institution_name) {
      const res_err = { error: 'Institution name is required.' };
      return NextResponse.json({
        success: false,
        message: res_err.error,
        error: res_err.error,
        paylod: null
      }, { status: 400 });
    }

    let logoUrl = current.logo;
    let logoId = current.logo_id;

    if (logo && logo.startsWith('data:image')) {
      // Delete old logo from Cloudinary if exists
      if (current.logo_id) {
        try { await deleteImage(current.logo_id); } catch (_) {}
      }
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
    }

    const result = await query(
      `UPDATE collaborations
       SET institution_name = $1, logo = $2, logo_id = $3, description = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [institution_name.trim(), logoUrl, logoId, description?.trim() || null, id]
    );

    const res_data = {
      message: 'Collaboration updated successfully.',
      collaboration: result.rows[0],
    };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating collaboration:', error);
    const res_err = { error: 'Failed to update collaboration. Internal server error.' };
    return NextResponse.json({
      success: false,
      message: res_err.error,
      error: res_err.error,
      paylod: null
    }, { status: 500 });
  }
}

// DELETE collaboration (Admin only)
export async function DELETE(request, { params }) {
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

    const { id } = await params;

    const existing = await query('SELECT * FROM collaborations WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      const res_err = { error: 'Collaboration not found.' };
      return NextResponse.json({
        success: false,
        message: res_err.error,
        error: res_err.error,
        paylod: null
      }, { status: 404 });
    }

    const collaboration = existing.rows[0];

    if (collaboration.logo_id) {
      try {
        await deleteImage(collaboration.logo_id);
      } catch (err) {
        console.error('Cloudinary delete error (non-fatal):', err);
      }
    }

    await query('DELETE FROM collaborations WHERE id = $1', [id]);

    const res_data = { message: 'Collaboration deleted successfully.' };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting collaboration:', error);
    const res_err = { error: 'Failed to delete collaboration. Internal server error.' };
    return NextResponse.json({
      success: false,
      message: res_err.error,
      error: res_err.error,
      paylod: null
    }, { status: 500 });
  }
}
