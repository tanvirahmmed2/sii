import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { uploadImage, deleteImage } from '@/lib/cloudinary';

// GET authority member by ID
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const result = await query(`
      SELECT a.*, d.title AS designation_title, d.slug AS designation, COALESCE(d.is_head, FALSE) AS is_head
      FROM authorities a
      JOIN authority_designations d ON a.designation_id = d.id
      WHERE a.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      const res_err_429 = { error: 'Authority member not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_429?.error || res_err_429?.message || 'An error occurred',
        error: res_err_429?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const authority = result.rows[0];

    // Fetch qualifications
    const qualsResult = await query(
      `SELECT * FROM authority_qualifications WHERE authority_id = $1 ORDER BY passing_year DESC`,
      [id]
    );
    authority.qualifications = qualsResult.rows;

    const res_data_567 = { authority };
    return NextResponse.json({
      success: true,
      message: res_data_567?.message || 'Successfully fetched data',
      paylod: res_data_567,
      payload: res_data_567
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching authority member details:', error);
    const res_err_1174 = { error: 'Failed to retrieve authority member. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_1174?.error || res_err_1174?.message || 'An error occurred',
        error: res_err_1174?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// PUT update authority member (Admin only)
export async function PUT(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_1706 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_1706?.error || res_err_1706?.message || 'An error occurred',
        error: res_err_1706?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;
    const { name, bio, designation, email, contact, image } = await request.json();

    if (!name || !designation) {
      const res_err_2186 = { error: 'Name and designation are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_2186?.error || res_err_2186?.message || 'An error occurred',
        error: res_err_2186?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Fetch existing member details to know the old image
    const existing = await query('SELECT image, image_id FROM authorities WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      const res_err_2717 = { error: 'Authority member not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_2717?.error || res_err_2717?.message || 'An error occurred',
        error: res_err_2717?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const oldImage = existing.rows[0];
    let imageUrl = oldImage.image;
    let imageId = oldImage.image_id;

    // If new image base64 is provided, upload and delete old
    if (image && image.startsWith('data:image')) {
      try {
        const uploadResult = await uploadImage(image, 'authorities');
        imageUrl = uploadResult.url;
        imageId = uploadResult.publicId;

        // Delete old image if it exists in Cloudinary
        if (oldImage.image_id) {
          await deleteImage(oldImage.image_id);
        }
      } catch (uploadErr) {
        console.error('Cloudinary replace failure:', uploadErr);
        const res_err_3674 = { error: 'Failed to upload new profile photo.' };
      return NextResponse.json({
        success: false,
        message: res_err_3674?.error || res_err_3674?.message || 'An error occurred',
        error: res_err_3674?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
      }
    } else if (image === null || image === '') {
      // Clear image
      imageUrl = null;
      imageId = null;
      if (oldImage.image_id) {
        await deleteImage(oldImage.image_id);
      }
    }

    let designationId = null;
    if (designation && !isNaN(designation)) {
      designationId = parseInt(designation, 10);
    } else if (designation) {
      const lookup = await query('SELECT id FROM authority_designations WHERE slug = $1', [designation.trim()]);
      if (lookup.rows.length > 0) {
        designationId = lookup.rows[0].id;
      }
    }

    if (!designationId) {
      return NextResponse.json({ success: false, error: 'Valid designation is required.' }, { status: 400 });
    }

    const result = await query(
      `UPDATE authorities 
       SET name = $1, bio = $2, designation_id = $3, email = $4, contact = $5, image = $6, image_id = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 
       RETURNING *`,
      [
        name.trim(),
        bio ? bio.trim() : null,
        designationId,
        email ? email.trim() : null,
        contact ? contact.trim() : null,
        imageUrl,
        imageId,
        id
      ]
    );

    const joinedRes = await query(`
      SELECT a.*, d.title AS designation_title, d.slug AS designation
      FROM authorities a
      JOIN authority_designations d ON a.designation_id = d.id
      WHERE a.id = $1
    `, [id]);

    const res_data_3338 = {
      message: 'Authority member updated successfully.',
      authority: joinedRes.rows[0]
    };
      return NextResponse.json({
        success: true,
        message: res_data_3338?.message || 'Successfully fecthed data',
        paylod: res_data_3338
      }, { status: 200 });
  } catch (error) {
    console.error('Error updating authority member:', error);
    if (error.code === '23505') {
      const res_err_5206 = { error: 'Email address already in use.' };
      return NextResponse.json({
        success: false,
        message: res_err_5206?.error || res_err_5206?.message || 'An error occurred',
        error: res_err_5206?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }
    const res_err_5535 = { error: 'Failed to update authority member. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_5535?.error || res_err_5535?.message || 'An error occurred',
        error: res_err_5535?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// DELETE authority member (Admin only)
export async function DELETE(request, { params }) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_6064 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_6064?.error || res_err_6064?.message || 'An error occurred',
        error: res_err_6064?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { id } = await params;

    // Fetch existing member details to know the old image
    const existing = await query('SELECT image_id FROM authorities WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      const res_err_6614 = { error: 'Authority member not found.' };
      return NextResponse.json({
        success: false,
        message: res_err_6614?.error || res_err_6614?.message || 'An error occurred',
        error: res_err_6614?.error || 'Internal Server Error',
        paylod: null
      }, { status: 404 });
    }

    const oldImage = existing.rows[0];

    // Delete database record first
    const result = await query('DELETE FROM authorities WHERE id = $1 RETURNING id', [id]);

    // Clean up photo on Cloudinary if present
    if (oldImage.image_id) {
      await deleteImage(oldImage.image_id);
    }

    const res_data_4964 = {
      message: 'Authority member deleted successfully.',
      id: result.rows[0].id
    };
      return NextResponse.json({
        success: true,
        message: res_data_4964?.message || 'Successfully fecthed data',
        paylod: res_data_4964
      }, { status: 200 });
  } catch (error) {
    console.error('Error deleting authority member:', error);
    const res_err_7720 = { error: 'Failed to delete authority member. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_7720?.error || res_err_7720?.message || 'An error occurred',
        error: res_err_7720?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
