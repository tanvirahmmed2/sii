import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isRegister, getAdminUser } from '@/lib/auth';
import { uploadImage } from '@/lib/cloudinary';
import { recordActivityLog } from '@/lib/logger';

function generateSlug(text, id) {
  if (!text) return String(id || '');
  const clean = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean || String(id || '');
}

// GET all club news
export async function GET() {
  try {
    const result = await query(`
      SELECT cn.*, c.name as club_name 
      FROM club_news cn
      JOIN clubs c ON cn.club_id = c.id
      ORDER BY cn.created_at DESC
    `);

    const clubNews = result.rows.map(row => ({
      ...row,
      slug: row.slug || generateSlug(row.title, row.id)
    }));

    const res_data_456 = { clubNews };
    return NextResponse.json({
      success: true,
      message: 'Successfully fetched data',
      paylod: res_data_456,
      payload: res_data_456
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching club news:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve club news.',
      error: error.message,
      paylod: null
    }, { status: 500 });
  }
}

// POST create club news (Admin only)
export async function POST(request) {
  try {
    const authenticated = (await isAdmin()) || (await isRegister());
    if (!authenticated) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized. Admins only.',
        paylod: null
      }, { status: 403 });
    }

    const { club_id, title, content, image } = await request.json();

    if (!club_id || !title || !content) {
      return NextResponse.json({
        success: false,
        error: 'Club, title, and content are required.',
        paylod: null
      }, { status: 400 });
    }

    let imageUrl = null;
    let imageId = null;

    if (image && image.startsWith('data:image')) {
      try {
        const uploadResult = await uploadImage(image, 'club_news');
        imageUrl = uploadResult.url;
        imageId = uploadResult.publicId;
      } catch (uploadErr) {
        console.error('Cloudinary club news upload failed:', uploadErr);
        return NextResponse.json({
          success: false,
          error: 'Failed to upload cover image.',
          paylod: null
        }, { status: 500 });
      }
    } else if (image) {
      imageUrl = image;
    }

    const slug = generateSlug(title);

    const result = await query(
      `INSERT INTO club_news (club_id, title, content, image_url, image_id, slug) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [club_id, title.trim(), content.trim(), imageUrl, imageId, slug]
    );

    const newsItem = {
      ...result.rows[0],
      slug: result.rows[0].slug || slug
    };

    const sessionAdmin = await getAdminUser();

    // Log Activity
    await recordActivityLog({
      userId: sessionAdmin?.id || null,
      userType: 'admin',
      userName: sessionAdmin?.name || 'Administrator',
      action: 'CREATE_CLUB_NEWS',
      entityType: 'club_news',
      entityId: newsItem.id,
      details: `Published club news: ${newsItem.title}`
    });

    const res_data_2207 = { message: 'Club news created successfully.', clubNews: newsItem };
    return NextResponse.json({
      success: true,
      message: 'Club news created successfully.',
      paylod: res_data_2207,
      payload: res_data_2207
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating club news:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create club news.',
      paylod: null
    }, { status: 500 });
  }
}
