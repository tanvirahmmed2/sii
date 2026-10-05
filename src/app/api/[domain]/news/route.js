import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator';
import { isAdmin, isRegister, getAdminUser } from 'src/lib/middleware/auth';
import { uploadImage } from 'src/lib/database/cloudinary';
import { recordActivityLog } from 'src/lib/database/logger';

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

// GET all news
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Tenant website not found' }, { status: 404 });
    }
    const websiteId = website.id;

    const result = await queryDb(
      'SELECT * FROM website_news WHERE website_id = $1 ORDER BY created_at DESC',
      [websiteId]
    ).catch(() =>
      queryDb('SELECT * FROM news WHERE website_id = $1 ORDER BY created_at DESC', [websiteId]).catch(() =>
        queryDb('SELECT * FROM news ORDER BY created_at DESC')
      )
    );

    const res_data_638 = { news: result.rows };
    return NextResponse.json({
      success: true,
      message: res_data_638?.message || 'Successfully fetched data',
      paylod: res_data_638,
      payload: res_data_638
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
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Tenant website not found' }, { status: 404 });
    }
    const websiteId = website.id;

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
    let finalSlug = slugify(slug || title);
    if (!finalSlug) {
      finalSlug = `news-${Date.now()}`;
    }
    const checkSlug = await queryDb(
      'SELECT id FROM website_news WHERE website_id = $1 AND slug = $2',
      [websiteId, finalSlug]
    ).catch(() => queryDb('SELECT id FROM news WHERE slug = $1', [finalSlug]));

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

    let result;
    try {
      result = await queryDb(
        `INSERT INTO website_news (website_id, title, slug, content, image, image_id) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [websiteId, title.trim(), finalSlug, content.trim(), imageUrl, imageId]
      );
    } catch {
      result = await queryDb(
        `INSERT INTO news (title, slug, content, image, image_id) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [title.trim(), finalSlug, content.trim(), imageUrl, imageId]
      );
    }

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
      message: res_data_2706?.message || 'Successfully fetched data',
      paylod: res_data_2706,
      payload: res_data_2706
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

