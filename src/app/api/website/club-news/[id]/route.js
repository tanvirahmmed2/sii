import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isRegister } from '@/lib/auth';
import { uploadImage, deleteImage } from '@/lib/cloudinary';

function generateSlug(text, id) {
  if (!text) return String(id || '');
  const clean = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean || String(id || '');
}

// GET single club news article by ID or slug
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const isNum = /^\d+$/.test(id);
    let result;

    if (isNum) {
      result = await query(`
        SELECT cn.*, c.name as club_name, c.slug as club_slug 
        FROM club_news cn
        JOIN clubs c ON cn.club_id = c.id
        WHERE cn.id = $1 OR LOWER(cn.slug) = LOWER($2)
      `, [parseInt(id, 10), id.toLowerCase()]);
    } else {
      const formattedTitle = id.replace(/-/g, ' ');
      result = await query(`
        SELECT cn.*, c.name as club_name, c.slug as club_slug 
        FROM club_news cn
        JOIN clubs c ON cn.club_id = c.id
        WHERE LOWER(cn.slug) = LOWER($1) OR LOWER(cn.title) = LOWER($2) OR LOWER(cn.title) LIKE $3
      `, [id.toLowerCase(), formattedTitle.toLowerCase(), `%${formattedTitle.toLowerCase()}%`]);
    }

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Club news article not found',
        error: 'Not Found',
        paylod: null,
        payload: null
      }, { status: 404 });
    }

    const row = result.rows[0];
    const clubNews = {
      ...row,
      slug: row.slug || generateSlug(row.title, row.id)
    };

    return NextResponse.json({
      success: true,
      message: 'Successfully fetched club news article',
      paylod: { clubNews },
      payload: { clubNews }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching single club news article:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      paylod: null
    }, { status: 500 });
  }
}

// PUT update club news
export async function PUT(request, { params }) {
  try {
    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Admins or Registrars only.' }, { status: 403 });
    }

    const { id } = await params;
    const { club_id, title, content, image } = await request.json();

    if (!club_id || !title || !content) {
      return NextResponse.json({ success: false, error: 'Club, title, and content are required.' }, { status: 400 });
    }

    const existingRes = await query('SELECT * FROM club_news WHERE id = $1', [parseInt(id, 10)]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Club news article not found.' }, { status: 404 });
    }

    const existing = existingRes.rows[0];
    let imageUrl = existing.image_url;
    let imageId = existing.image_id;

    if (image && image.startsWith('data:image')) {
      try {
        if (existing.image_id) {
          await deleteImage(existing.image_id);
        }
        const uploadResult = await uploadImage(image, 'club_news');
        imageUrl = uploadResult.url;
        imageId = uploadResult.publicId;
      } catch (uploadErr) {
        console.error('Image upload error:', uploadErr);
        return NextResponse.json({ success: false, error: 'Failed to upload image.' }, { status: 500 });
      }
    } else if (image !== undefined) {
      imageUrl = image;
    }

    const result = await query(
      `UPDATE club_news 
       SET club_id = $1, title = $2, content = $3, image = $4, image_url = $4, image_id = $5
       WHERE id = $6 
       RETURNING *`,
      [club_id, title.trim(), content.trim(), imageUrl || null, imageId || null, parseInt(id, 10)]
    );

    return NextResponse.json({
      success: true,
      message: 'Club news updated successfully.',
      paylod: { clubNews: result.rows[0] },
      payload: { clubNews: result.rows[0] }
    });
  } catch (error) {
    console.error('Error updating club news:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE club news
export async function DELETE(request, { params }) {
  try {
    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Admins or Registrars only.' }, { status: 403 });
    }

    const { id } = await params;
    const existingRes = await query('SELECT image_id FROM club_news WHERE id = $1', [parseInt(id, 10)]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Club news article not found.' }, { status: 404 });
    }

    if (existingRes.rows[0].image_id) {
      try {
        await deleteImage(existingRes.rows[0].image_id);
      } catch (e) {
        console.error('Failed to delete image from Cloudinary:', e);
      }
    }

    await query('DELETE FROM club_news WHERE id = $1', [parseInt(id, 10)]);

    return NextResponse.json({
      success: true,
      message: 'Club news deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting club news:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
