import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db';
import { isAdmin, getAdminUser } from 'src/lib/middleware/developer';
import { uploadImage } from 'src/lib/database/cloudinary';
import { recordActivityLog } from 'src/lib/database/logger';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

// GET all clubs
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, message: 'Tenant website not found', paylod: { clubs: [] } }, { status: 404 });
    }

    const result = await query(
      'SELECT id, website_id, name, motto, slug, description, image, image_id, created_at FROM website_clubs WHERE website_id = $1 ORDER BY name ASC',
      [website.id]
    );
    const res_data = { clubs: result.rows };
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched clubs',
      payload: res_data,
      paylod: res_data
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching clubs:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve clubs.',
      error: 'Internal Server Error',
      paylod: null,
      payload: null
    }, { status: 500 });
  }
}

// POST create a new club
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

    const { name, motto, description, image } = await request.json();

    if (!name) {
      return NextResponse.json({
        success: false,
        message: 'Club name is required.',
        error: 'Validation Error',
        paylod: null
      }, { status: 400 });
    }

    // Auto-generate unique slug from club name
    let finalSlug = slugify(name);
    if (!finalSlug) {
      finalSlug = `club-${Date.now()}`;
    }

    // Check uniqueness of name/slug within this website
    const checkName = await query(
      'SELECT id FROM website_clubs WHERE website_id = $1 AND LOWER(name) = LOWER($2)',
      [website.id, name.trim()]
    );
    if (checkName.rows.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'A club with this name already exists.',
        error: 'Duplicate Error',
        paylod: null
      }, { status: 400 });
    }

    const checkSlug = await query(
      'SELECT id FROM website_clubs WHERE website_id = $1 AND slug = $2',
      [website.id, finalSlug]
    );
    if (checkSlug.rows.length > 0) {
      finalSlug = `${finalSlug}-${Date.now()}`;
    }

    let imageUrl = null;
    let imageId = null;

    if (image && image.startsWith('data:image')) {
      try {
        const uploadResult = await uploadImage(image, 'clubs');
        imageUrl = uploadResult.url;
        imageId = uploadResult.publicId;
      } catch (uploadErr) {
        console.error('Cloudinary upload failure:', uploadErr);
        return NextResponse.json({
          success: false,
          message: 'Failed to upload club image.',
          error: 'Cloudinary Error',
          paylod: null
        }, { status: 500 });
      }
    } else if (image) {
      imageUrl = image;
    }

    const result = await query(
      `INSERT INTO website_clubs (website_id, name, motto, slug, description, image, image_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, website_id, name, motto, slug, description, image, image_id`,
      [website.id, name.trim(), motto ? motto.trim() : null, finalSlug, description ? description.trim() : null, imageUrl, imageId]
    );

    const createdClub = result.rows[0];
    const sessionAdmin = await getAdminUser();

    // Log Activity
    try {
      await recordActivityLog({
        userId: sessionAdmin?.id || null,
        userType: 'admin',
        userName: sessionAdmin?.name || 'Administrator',
        action: 'CREATE_CLUB',
        entityType: 'club',
        entityId: createdClub.id,
        details: `Created new club: ${createdClub.name}`
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Club created successfully.',
      payload: { club: createdClub },
      paylod: { club: createdClub }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating club:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create club.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
