import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, getTeacherUser, getStudentUser } from '@/lib/auth';
import { uploadImage, deleteImage } from '@/lib/cloudinary';

// GET single club details with restricted notice_info access
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const result = await query(
      'SELECT id, name, motto, slug, description, notice_info, image, created_at FROM clubs WHERE id::text = $1 OR slug = $1',
      [id]
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

    // Check notice authorization: Admin, Teacher in club_admin, Student in club_member
    let canViewNotice = false;

    if (await isAdmin()) {
      canViewNotice = true;
    } else {
      const teacher = await getTeacherUser();
      if (teacher) {
        const teacherCheck = await query(
          'SELECT id FROM club_admin WHERE club_id = $1 AND teacher_id = $2',
          [club.id, teacher.id]
        );
        if (teacherCheck.rows.length > 0) {
          canViewNotice = true;
        }
      }

      if (!canViewNotice) {
        const student = await getStudentUser();
        if (student) {
          const studentCheck = await query(
            'SELECT id FROM club_member WHERE club_id = $1 AND student_id = $2',
            [club.id, student.id]
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
      paylod: {
        club: sanitizedClub,
        canViewNotice
      }
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

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

// PUT update a club
export async function PUT(request, { params }) {
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

    const { id } = await params;
    const { name, motto, description, image } = await request.json();

    if (!name) {
      return NextResponse.json({
        success: false,
        message: 'Club name is required.',
        error: 'Validation Error',
        paylod: null
      }, { status: 400 });
    }

    const existing = await query('SELECT * FROM clubs WHERE id = $1', [id]);
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
      const checkSlug = await query('SELECT id FROM clubs WHERE slug = $1 AND id <> $2', [finalSlug, id]);
      if (checkSlug.rows.length > 0) {
        finalSlug = `${finalSlug}-${Date.now()}`;
      }
    }

    // Check duplicate name (excluding current ID)
    const duplicate = await query(
      'SELECT id FROM clubs WHERE LOWER(name) = LOWER($1) AND id <> $2',
      [name.trim(), id]
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
      `UPDATE clubs 
       SET name = $1, motto = $2, slug = $3, description = $4, image = $5, image_id = $6, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $7 
       RETURNING id, name, motto, slug, description, image, image_id`,
      [name.trim(), motto ? motto.trim() : null, finalSlug, description ? description.trim() : null, imageUrl, imageId, id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Club profile not found.',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Club details updated successfully.',
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
export async function DELETE(request, { params }) {
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

    const { id } = await params;
    const existing = await query('SELECT image_id FROM clubs WHERE id = $1', [id]);
    const result = await query('DELETE FROM clubs WHERE id = $1 RETURNING id', [id]);

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
