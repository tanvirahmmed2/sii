import { NextResponse } from 'next/server';
import { query } from 'src/lib/database/db';
import { isAdmin, getTeacherUser, getStudentUser } from 'src/lib/middleware/auth';
import { uploadImage, deleteImage } from 'src/lib/database/cloudinary';
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

// GET single club details with notice_info
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, message: 'Tenant website not found', paylod: null }, { status: 404 });
    }

    const params = await context?.params;
    const id = params?.id;

    const result = await query(
      `SELECT id, website_id, name, motto, slug, description, notice_info, image, created_at 
       FROM website_clubs 
       WHERE website_id = $1 AND (id::text = $2 OR slug = $2)`,
      [website.id, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Club not found',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    const club = result.rows[0];

    // Check notice authorization: Admin, Teacher in website_club_admin, Student in website_club_members
    let canViewNotice = false;

    if (await isAdmin()) {
      canViewNotice = true;
    } else {
      const teacher = await getTeacherUser();
      if (teacher) {
        const teacherCheck = await query(
          'SELECT id FROM website_club_admin WHERE website_id = $1 AND club_id = $2 AND teacher_id = $3',
          [website.id, club.id, teacher.id]
        );
        if (teacherCheck.rows.length > 0) {
          canViewNotice = true;
        }
      }

      if (!canViewNotice) {
        const student = await getStudentUser();
        if (student) {
          const studentCheck = await query(
            'SELECT id FROM website_club_members WHERE website_id = $1 AND club_id = $2 AND student_id = $3',
            [website.id, club.id, student.id]
          );
          if (studentCheck.rows.length > 0) {
            canViewNotice = true;
          }
        }
      }
    }

    const sanitizedClub = {
      ...club,
      notice_info: canViewNotice ? club.notice_info : null
    };

    return NextResponse.json({
      success: true,
      message: 'Club details retrieved',
      payload: { club: sanitizedClub, canViewNotice },
      paylod: { club: sanitizedClub, canViewNotice }
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching club details:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve club.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// PUT update a club
export async function PUT(request, context) {
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

    const params = await context?.params;
    const id = params?.id;
    const { name, motto, description, image } = await request.json();

    if (!name) {
      return NextResponse.json({
        success: false,
        message: 'Club name is required.',
        error: 'Validation Error',
        paylod: null
      }, { status: 400 });
    }

    const existing = await query(
      'SELECT * FROM website_clubs WHERE website_id = $1 AND (id::text = $2 OR slug = $2)',
      [website.id, id]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Club profile not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }
    const currentClub = existing.rows[0];

    // Auto-generate slug from name if updated or keep existing slug
    let finalSlug = currentClub.slug;
    if (name.trim() !== currentClub.name) {
      finalSlug = slugify(name);
      if (!finalSlug) finalSlug = `club-${Date.now()}`;
      const checkSlug = await query(
        'SELECT id FROM website_clubs WHERE website_id = $1 AND slug = $2 AND id <> $3',
        [website.id, finalSlug, currentClub.id]
      );
      if (checkSlug.rows.length > 0) {
        finalSlug = `${finalSlug}-${Date.now()}`;
      }
    }

    // Check duplicate name within this website
    const duplicate = await query(
      'SELECT id FROM website_clubs WHERE website_id = $1 AND LOWER(name) = LOWER($2) AND id <> $3',
      [website.id, name.trim(), currentClub.id]
    );

    if (duplicate.rows.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Another club with this name already exists.',
        error: 'Duplicate Error',
        paylod: null
      }, { status: 400 });
    }

    let imageUrl = currentClub.image;
    let imageId = currentClub.image_id;

    if (image && image.startsWith('data:image')) {
      try {
        const uploadResult = await uploadImage(image, 'clubs');
        imageUrl = uploadResult.url;
        imageId = uploadResult.publicId;

        if (currentClub.image_id) {
          try {
            await deleteImage(currentClub.image_id);
          } catch (delErr) {
            console.error('Failed to delete old club image:', delErr);
          }
        }
      } catch (uploadErr) {
        console.error('Cloudinary upload failure:', uploadErr);
        return NextResponse.json({
          success: false,
          message: 'Failed to upload club image.',
          error: 'Cloudinary Error',
          paylod: null
        }, { status: 500 });
      }
    } else if (image === null) {
      imageUrl = null;
      imageId = null;
      if (currentClub.image_id) {
        try {
          await deleteImage(currentClub.image_id);
        } catch (delErr) {
          console.error('Failed to delete old club image:', delErr);
        }
      }
    }

    const result = await query(
      `UPDATE website_clubs 
       SET name = $1, motto = $2, slug = $3, description = $4, image = $5, image_id = $6, updated_at = CURRENT_TIMESTAMP 
       WHERE website_id = $7 AND id = $8 
       RETURNING id, website_id, name, motto, slug, description, image, image_id`,
      [name.trim(), motto ? motto.trim() : null, finalSlug, description ? description.trim() : null, imageUrl, imageId, website.id, currentClub.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Club details updated successfully.',
      payload: { club: result.rows[0] },
      paylod: { club: result.rows[0] }
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating club:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update club.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// DELETE a club
export async function DELETE(request, context) {
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

    const params = await context?.params;
    const id = params?.id;
    const existing = await query(
      'SELECT image_id FROM website_clubs WHERE website_id = $1 AND (id::text = $2 OR slug = $2)',
      [website.id, id]
    );
    const result = await query(
      'DELETE FROM website_clubs WHERE website_id = $1 AND (id::text = $2 OR slug = $2) RETURNING id',
      [website.id, id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Club not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    if (existing.rows.length > 0 && existing.rows[0].image_id) {
      try {
        await deleteImage(existing.rows[0].image_id);
      } catch (delErr) {
        console.error('Failed to delete club image from Cloudinary:', delErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Club deleted successfully.',
      payload: { message: 'Club deleted successfully.' },
      paylod: { message: 'Club deleted successfully.' }
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting club:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete club.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
