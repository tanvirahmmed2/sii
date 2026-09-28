import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, getAdminUser } from '@/lib/auth';
import { uploadImage } from '@/lib/cloudinary';
import { recordActivityLog } from '@/lib/logger';

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
export async function GET() {
  try {
    const result = await query(
      'SELECT id, name, motto, slug, description, image, image_id, created_at FROM clubs ORDER BY name ASC'
    );
    const res_data_348 = { clubs: result.rows };
    return NextResponse.json({
      success: true,
      message: res_data_348?.message || 'Successfully fetched data',
      paylod: res_data_348
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching clubs:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve clubs.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// POST create a new club
export async function POST(request) {
  try {
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

    // Check uniqueness of name/slug and make slug unique if needed
    const checkName = await query('SELECT id FROM clubs WHERE LOWER(name) = LOWER($1)', [name.trim()]);
    if (checkName.rows.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'A club with this name already exists.',
        error: 'Duplicate Error',
        paylod: null
      }, { status: 400 });
    }

    const checkSlug = await query('SELECT id FROM clubs WHERE slug = $1', [finalSlug]);
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
      `INSERT INTO clubs (name, motto, slug, description, image, image_id) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, name, motto, slug, description, image, image_id`,
      [name.trim(), motto ? motto.trim() : null, finalSlug, description ? description.trim() : null, imageUrl, imageId]
    );

    const createdClub = result.rows[0];
    const sessionAdmin = await getAdminUser();

    // Log Activity
    await recordActivityLog({
      userId: sessionAdmin?.id || null,
      userType: 'admin',
      userName: sessionAdmin?.name || 'Administrator',
      action: 'CREATE_CLUB',
      entityType: 'club',
      entityId: createdClub.id,
      details: `Created new club: ${createdClub.name}`
    });

    return NextResponse.json({
      success: true,
      message: 'Club created successfully.',
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
