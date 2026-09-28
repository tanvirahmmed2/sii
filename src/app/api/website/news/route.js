import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isRegister, getAdminUser } from '@/lib/auth';
import { uploadImage } from '@/lib/cloudinary';
import { recordActivityLog } from '@/lib/logger';

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-');        // Replace multiple - with single -
}

// GET all news
export async function GET() {
  try {
    const result = await query('SELECT * FROM news ORDER BY created_at DESC');
    const res_data_638 = { news: result.rows };
      return NextResponse.json({
        success: true,
        message: res_data_638?.message || 'Successfully fecthed data',
        paylod: res_data_638
      }, { status: 200 });
  } catch (error) {
    console.error('Error fetching news:', error);
    const res_err_989 = { error: 'Failed to retrieve news. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_989?.error || res_err_989?.message || 'An error occurred',
        error: res_err_989?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}

// POST create news (Admin only)
export async function POST(request) {
  try {
    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      const res_err_1483 = { error: 'Unauthorized. Admins only.' };
      return NextResponse.json({
        success: false,
        message: res_err_1483?.error || res_err_1483?.message || 'An error occurred',
        error: res_err_1483?.error || 'Internal Server Error',
        paylod: null
      }, { status: 403 });
    }

    const { title, content, image, image_id, slug } = await request.json();

    if (!title || !content) {
      const res_err_1919 = { error: 'Title and content are required.' };
      return NextResponse.json({
        success: false,
        message: res_err_1919?.error || res_err_1919?.message || 'An error occurred',
        error: res_err_1919?.error || 'Internal Server Error',
        paylod: null
      }, { status: 400 });
    }

    // Generate unique slug automatically from title
    let finalSlug = slugify(title);
    if (!finalSlug) {
      finalSlug = `news-${Date.now()}`;
    }
    const checkSlug = await query('SELECT id FROM news WHERE slug = $1', [finalSlug]);
    if (checkSlug.rows.length > 0) {
      finalSlug = `${finalSlug}-${Date.now()}`;
    }

    let imageUrl = null;
    let imageId = null;

    if (image && image.startsWith('data:image')) {
      try {
        const uploadResult = await uploadImage(image, 'news');
        imageUrl = uploadResult.url;
        imageId = uploadResult.publicId;
      } catch (uploadErr) {
        console.error('Cloudinary news upload failed:', uploadErr);
        const res_err_2939 = { error: 'Failed to upload cover image.' };
      return NextResponse.json({
        success: false,
        message: res_err_2939?.error || res_err_2939?.message || 'An error occurred',
        error: res_err_2939?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
      }
    } else if (image) {
      imageUrl = image;
      imageId = image_id || null;
    }

    const result = await query(
      `INSERT INTO news (title, slug, content, image, image_id) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [title.trim(), finalSlug, content.trim(), imageUrl, imageId]
    );

    const createdNews = result.rows[0];
    const sessionAdmin = await getAdminUser();

    // Log Activity
    await recordActivityLog({
      userId: sessionAdmin?.id || null,
      userType: 'admin',
      userName: sessionAdmin?.name || 'Administrator',
      action: 'CREATE_NEWS',
      entityType: 'news',
      entityId: createdNews.id,
      details: `Published news article: ${createdNews.title}`
    });

    const res_data_2706 = { message: 'News article created successfully.', news: createdNews };

      return NextResponse.json({
        success: true,
        message: res_data_2706?.message || 'Successfully fecthed data',
        paylod: res_data_2706
      }, { status: 201 });
  } catch (error) {
    console.error('Error creating news:', error);
    const res_err_4037 = { error: 'Failed to create news article. Internal server error.' };
      return NextResponse.json({
        success: false,
        message: res_err_4037?.error || res_err_4037?.message || 'An error occurred',
        error: res_err_4037?.error || 'Internal Server Error',
        paylod: null
      }, { status: 500 });
  }
}
