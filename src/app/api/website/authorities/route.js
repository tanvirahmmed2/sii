import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { uploadImage } from '@/lib/cloudinary';

// GET all authorities (supports ?role=... or ?designation=... or ?slug=...)
export async function GET(request) {
  try {
    let queryText = `
      SELECT a.*, d.title AS designation_title, d.slug AS designation, COALESCE(d.is_head, FALSE) AS is_head
      FROM authorities a
      JOIN authority_designations d ON a.designation_id = d.id
    `;
    const queryParams = [];

    if (request && request.url) {
      const { searchParams } = new URL(request.url);
      const role = searchParams.get('role') || searchParams.get('designation') || searchParams.get('slug');
      if (role) {
        queryText += ` WHERE LOWER(d.slug) = LOWER($1) OR LOWER(d.title) = LOWER($1)`;
        queryParams.push(role.trim());
      }
    }

    queryText += ` ORDER BY a.id ASC`;

    const result = await query(queryText, queryParams);

    // Fetch qualifications for returned authorities if any exist
    const authorities = result.rows;
    if (authorities.length > 0) {
      const authIds = authorities.map(a => a.id);
      const qualsResult = await query(
        `SELECT * FROM authority_qualifications WHERE authority_id = ANY($1) ORDER BY passing_year DESC`,
        [authIds]
      );
      const qualsMap = {};
      qualsResult.rows.forEach(q => {
        if (!qualsMap[q.authority_id]) qualsMap[q.authority_id] = [];
        qualsMap[q.authority_id].push(q);
      });
      authorities.forEach(a => {
        a.qualifications = qualsMap[a.id] || [];
      });
    }

    const res_data_356 = { authorities };
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched data',
      paylod: res_data_356,
      payload: res_data_356
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching authorities:', error);
    const res_err_721 = { error: 'Failed to retrieve authorities. Internal server error.' };
    return NextResponse.json({
      success: false,
      message: res_err_721?.error || res_err_721?.message || 'An error occurred',
      error: res_err_721?.error || 'Internal Server Error',
      paylod: null,
      payload: null
    }, { status: 500 });
  }
}

// POST create authority member (Admin only)
export async function POST(request) {
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      const res_err_1234 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_1234?.error || res_err_1234?.message || 'An error occurred',
        error: res_err_1234?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { name, bio, designation, email, contact, image } = await request.json();

    if (!name || !designation) {
      const res_err_1681 = { error: 'Name and designation are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_1681?.error || res_err_1681?.message || 'An error occurred',
        error: res_err_1681?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
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

    let imageUrl = null;
    let imageId = null;

    // Handle Cloudinary upload if base64 image data is provided
    if (image && image.startsWith('data:image')) {
      try {
        const uploadResult = await uploadImage(image, 'authorities');
        imageUrl = uploadResult.url;
        imageId = uploadResult.publicId;
      } catch (uploadErr) {
        console.error('Cloudinary upload failure:', uploadErr);
        const res_err_2438 = { error: 'Failed to upload profile photo.' };
      return NextResponse.json({
        success: false,
        message: res_err_2438?.error || res_err_2438?.message || 'An error occurred',
        error: res_err_2438?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
      }
    } else if (image) {
      // If it's already an external URL
      imageUrl = image;
    }

    const result = await query(
      `INSERT INTO authorities (name, bio, designation_id, email, contact, image, image_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        name.trim(),
        bio ? bio.trim() : null,
        designationId,
        email ? email.trim() : null,
        contact ? contact.trim() : null,
        imageUrl,
        imageId
      ]
    );

    const createdId = result.rows[0].id;
    const joinedRes = await query(`
      SELECT a.*, d.title AS designation_title, d.slug AS designation
      FROM authorities a
      JOIN authority_designations d ON a.designation_id = d.id
      WHERE a.id = $1
    `, [createdId]);

    const res_data_2390 = { message: 'Authority member created successfully.', authority: joinedRes.rows[0] };
      return NextResponse.json({
        success: true,
        message: res_data_2390?.message || 'Successfully fecthed data',
        paylod: res_data_2390
      }, { status: 201 });
  } catch (error) {
    console.error('Error creating authority member:', error);
    if (error.code === '23505') {
      const res_err_3778 = { error: 'Email address already registered.' };
      return NextResponse.json({
        success: false,
        message: res_err_3778?.error || res_err_3778?.message || 'An error occurred',
        error: res_err_3778?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }
    const res_err_4111 = { error: 'Failed to create authority member. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_4111?.error || res_err_4111?.message || 'An error occurred',
        error: res_err_4111?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
