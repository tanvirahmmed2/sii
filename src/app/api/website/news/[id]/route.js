import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isRegister } from '@/lib/auth';
import { uploadImage, deleteImage } from '@/lib/cloudinary';

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

// GET single news article by ID or slug
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const isNum = /^\d+$/.test(id);
    let result;
    if (isNum) {
      result = await query('SELECT * FROM news WHERE id = $1 OR slug = $2', [parseInt(id, 10), id]);
    } else {
      result = await query('SELECT * FROM news WHERE slug = $1', [id]);
    }

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'News article not found',
        error: 'Not Found',
        paylod: null
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully fetched news article',
      paylod: { news: result.rows[0] }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching single news article:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      paylod: null
    }, { status: 500 });
  }
}

// PUT update news (Admin only)
export async function PUT(request, { params }) {
  try {
    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Admins only.' }, { status: 403 });
    }

    const { id } = await params;
    const { title, content, image } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ success: false, error: 'Title and content are required.' }, { status: 400 });
    }

    const existingRes = await query('SELECT * FROM news WHERE id = $1', [parseInt(id, 10)]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'News article not found.' }, { status: 404 });
    }

    const existing = existingRes.rows[0];
    let imageUrl = existing.image;
    let imageId = existing.image_id;

    if (image && image.startsWith('data:image')) {
      try {
        if (existing.image_id) {
          await deleteImage(existing.image_id);
        }
        const uploadResult = await uploadImage(image, 'news');
        imageUrl = uploadResult.url;
        imageId = uploadResult.publicId;
      } catch (uploadErr) {
        console.error('Cloudinary news upload failed:', uploadErr);
        return NextResponse.json({ success: false, error: 'Failed to upload cover image.' }, { status: 500 });
      }
    } else if (image !== undefined) {
      imageUrl = image;
    }

    // Dynamic slug update if title changed
    let finalSlug = existing.slug;
    if (title.trim() !== existing.title) {
      finalSlug = slugify(title);
      if (!finalSlug) finalSlug = `news-${Date.now()}`;
      const checkSlug = await query('SELECT id FROM news WHERE slug = $1 AND id <> $2', [finalSlug, parseInt(id, 10)]);
      if (checkSlug.rows.length > 0) {
        finalSlug = `${finalSlug}-${Date.now()}`;
      }
    }

    const result = await query(
      `UPDATE news 
       SET title = $1, slug = $2, content = $3, image = $4, image_id = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 
       RETURNING *`,
      [title.trim(), finalSlug, content.trim(), imageUrl, imageId, parseInt(id, 10)]
    );

    return NextResponse.json({
      success: true,
      message: 'News article updated successfully.',
      paylod: { news: result.rows[0] }
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating news:', error);
    return NextResponse.json({ success: false, error: 'Failed to update news article.' }, { status: 500 });
  }
}

// DELETE news (Admin only)
export async function DELETE(request, { params }) {
  try {
    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Admins only.' }, { status: 403 });
    }

    const { id } = await params;
    const existingRes = await query('SELECT image_id FROM news WHERE id = $1', [parseInt(id, 10)]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'News article not found.' }, { status: 404 });
    }

    if (existingRes.rows[0].image_id) {
      try {
        await deleteImage(existingRes.rows[0].image_id);
      } catch (e) {
        console.error('Cloudinary delete error:', e);
      }
    }

    await query('DELETE FROM news WHERE id = $1', [parseInt(id, 10)]);

    return NextResponse.json({
      success: true,
      message: 'News article deleted successfully.'
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting news:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete news article.' }, { status: 500 });
  }
}
