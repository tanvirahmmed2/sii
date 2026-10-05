import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db';
import { isAdmin } from 'src/lib/middleware/auth';
import { uploadImage } from 'src/lib/database/cloudinary';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';

// GET all authorities (supports ?role=... or ?designation=... or ?slug=...)
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, message: 'Tenant website not found', paylod: { authorities: [] } }, { status: 404 });
    }

    let queryText = `
      SELECT a.*, d.title AS designation_title, d.slug AS designation, COALESCE(d.is_head, FALSE) AS is_head
      FROM website_authorities a
      JOIN website_authority_designations d ON a.designation_id = d.id
      WHERE a.website_id = $1
    `;
    const queryParams = [website.id];

    if (request && request.url) {
      const { searchParams } = new URL(request.url);
      const role = searchParams.get('role') || searchParams.get('designation') || searchParams.get('slug');
      if (role) {
        queryText += ` AND (LOWER(d.slug) = LOWER($2) OR LOWER(d.title) = LOWER($2))`;
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
        `SELECT * FROM website_authority_qualifications WHERE website_id = $1 AND authority_id = ANY($2) ORDER BY passing_year DESC`,
        [website.id, authIds]
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

    const res_data = { authorities };
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched authorities',
      payload: res_data,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching authorities:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve authorities. Internal server error.',
      error: 'Internal Server Error',
      paylod: null,
      payload: null
    }, { status: 500 });
  }
}

// POST create authority member (Admin only)
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

    const { name, bio, designation, email, contact, image } = await request.json();

    if (!name || !designation) {
      return NextResponse.json({
        success: false,
        message: 'Name and designation are required.',
        error: 'Bad Request',
        paylod: null
      }, { status: 400 });
    }

    let designationId = null;
    if (designation && !isNaN(designation)) {
      designationId = parseInt(designation, 10);
    } else if (designation) {
      const lookup = await query(
        'SELECT id FROM website_authority_designations WHERE website_id = $1 AND slug = $2',
        [website.id, designation.trim()]
      );
      if (lookup.rows.length > 0) {
        designationId = lookup.rows[0].id;
      }
    }

    if (!designationId) {
      return NextResponse.json({ success: false, error: 'Valid designation is required.' }, { status: 400 });
    }

    let imageUrl = null;
    let imageId = null;

    if (image && image.startsWith('data:image')) {
      try {
        const uploadResult = await uploadImage(image, 'authorities');
        imageUrl = uploadResult.url;
        imageId = uploadResult.publicId;
      } catch (uploadErr) {
        console.error('Cloudinary upload failure:', uploadErr);
        return NextResponse.json({
          success: false,
          message: 'Failed to upload profile photo.',
          error: 'Internal Server Error',
          paylod: null
        }, { status: 500 });
      }
    } else if (image) {
      imageUrl = image;
    }

    const result = await query(
      `INSERT INTO website_authorities (website_id, name, bio, designation_id, email, contact, image, image_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        website.id,
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
      FROM website_authorities a
      JOIN website_authority_designations d ON a.designation_id = d.id
      WHERE a.website_id = $1 AND a.id = $2
    `, [website.id, createdId]);

    const res_data = { message: 'Authority member created successfully.', authority: joinedRes.rows[0] };
    return NextResponse.json({
      success: true,
      message: res_data.message,
      payload: res_data,
      paylod: res_data
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating authority member:', error);
    if (error.code === '23505') {
      return NextResponse.json({
        success: false,
        message: 'Email address already registered.',
        error: 'Conflict',
        paylod: null
      }, { status: 400 });
    }
    return NextResponse.json({
      success: false,
      message: 'Failed to create authority member. Internal server error.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
