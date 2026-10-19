import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyClubStaffAccess } from 'src/lib/middleware/clubAuth.js';
import { uploadImage, deleteImage } from 'src/lib/database/cloudinary.js';

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || `club-${Date.now()}`;
}

async function parseClubRequest(request) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const data = {};
    for (const [key, value] of formData.entries()) {
      if (key === 'logo' || key === 'file' || key === 'image' || key === 'logoFile') {
        data.logoFile = value;
      } else {
        data[key] = value;
      }
    }
    return data;
  }
  return await request.json().catch(() => ({}));
}

// GET: List clubs with relations, metrics, and search
export async function GET(request, context) {
  try {
    const auth = await verifyClubStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    if (id) {
      const singleRes = await queryDb(
        `SELECT c.*,
                cat.name AS category_name,
                cat.slug AS category_slug,
                t.name AS moderator_teacher_name,
                t.email AS moderator_teacher_email,
                t.photo_url AS moderator_photo_url,
                t.number AS moderator_teacher_phone,
                ch.id AS chat_box_id,
                ch.is_active AS chat_box_active,
                ch.title AS chat_room_title,
                COALESCE((SELECT COUNT(*) FROM website_student_club_members scm WHERE scm.club_id = c.id AND scm.status = 'active'), 0)::int AS member_count,
                COALESCE((SELECT COUNT(*) FROM website_student_club_members scm WHERE scm.club_id = c.id AND scm.can_access_chat = true AND scm.status = 'active'), 0)::int AS chat_member_count,
                COALESCE((SELECT COUNT(*) FROM website_club_notices cn WHERE cn.club_id = c.id), 0)::int AS notices_count,
                COALESCE((SELECT COUNT(*) FROM website_club_news nw WHERE nw.club_id = c.id), 0)::int AS news_count
         FROM website_clubs c
         LEFT JOIN website_clubs_category cat ON cat.id = c.category_id
         LEFT JOIN website_teachers t ON t.id = c.moderator_teacher_id
         LEFT JOIN website_club_chats ch ON ch.club_id = c.id
         WHERE c.website_id = $1 AND c.id = $2
         LIMIT 1`,
        [website.id, id]
      );

      if (singleRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Club not found.' }, { status: 404 });
      }

      return NextResponse.json({ success: true, club: singleRes.rows[0] });
    }

    let queryStr = `
      SELECT c.*,
             cat.name AS category_name,
             cat.slug AS category_slug,
             t.name AS moderator_teacher_name,
             t.email AS moderator_teacher_email,
             t.photo_url AS moderator_photo_url,
             t.number AS moderator_teacher_phone,
             ch.id AS chat_box_id,
             ch.is_active AS chat_box_active,
             COALESCE((SELECT COUNT(*) FROM website_student_club_members scm WHERE scm.club_id = c.id AND scm.status = 'active'), 0)::int AS member_count,
             COALESCE((SELECT COUNT(*) FROM website_student_club_members scm WHERE scm.club_id = c.id AND scm.can_access_chat = true AND scm.status = 'active'), 0)::int AS chat_member_count,
             COALESCE((SELECT COUNT(*) FROM website_club_notices cn WHERE cn.club_id = c.id), 0)::int AS notices_count,
             COALESCE((SELECT COUNT(*) FROM website_club_news nw WHERE nw.club_id = c.id), 0)::int AS news_count
      FROM website_clubs c
      LEFT JOIN website_clubs_category cat ON cat.id = c.category_id
      LEFT JOIN website_teachers t ON t.id = c.moderator_teacher_id
      LEFT JOIN website_club_chats ch ON ch.club_id = c.id
      WHERE c.website_id = $1
    `;
    const params = [website.id];

    if (search) {
      params.push(`%${search}%`);
      queryStr += ` AND (c.name ILIKE $${params.length} OR c.description ILIKE $${params.length} OR c.category ILIKE $${params.length})`;
    }

    if (status === 'active') {
      params.push(true);
      queryStr += ` AND c.is_active = $${params.length}`;
    } else if (status === 'inactive') {
      params.push(false);
      queryStr += ` AND c.is_active = $${params.length}`;
    }

    if (category && category !== 'all') {
      params.push(category);
      queryStr += ` AND (c.category = $${params.length} OR cat.slug = $${params.length} OR c.category_id::text = $${params.length})`;
    }

    queryStr += ` ORDER BY c.name ASC, c.id DESC`;

    const result = await queryDb(queryStr, params);

    // Fetch categories and teachers for selection
    const categoriesRes = await queryDb(
      `SELECT id, name, slug FROM website_clubs_category WHERE website_id = $1 AND is_active = true ORDER BY name ASC`,
      [website.id]
    );

    const teachersRes = await queryDb(
      `SELECT id, name, email, number, photo_url FROM website_teachers WHERE website_id = $1 AND is_active = true ORDER BY name ASC`,
      [website.id]
    );

    return NextResponse.json({
      success: true,
      clubs: result.rows,
      categories: categoriesRes.rows,
      teachers: teachersRes.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching clubs in staff panel:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create a new club
export async function POST(request, context) {
  try {
    const auth = await verifyClubStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await parseClubRequest(request);

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Club name is required.' }, { status: 400 });
    }

    // Check unique name for website
    const existing = await queryDb(
      `SELECT id FROM website_clubs WHERE website_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
      [website.id, name]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ success: false, error: `A club named "${name}" already exists.` }, { status: 409 });
    }

    let logoUrl = body.logo_url || null;
    if (body.logoFile && typeof body.logoFile === 'object') {
      try {
        const uploadRes = await uploadImage(body.logoFile, 'clubs');
        logoUrl = uploadRes.secure_url || uploadRes.url;
      } catch (uploadErr) {
        console.error('Logo upload error:', uploadErr);
      }
    }

    const categoryId = body.category_id ? parseInt(body.category_id, 10) : null;
    let categoryName = body.category?.trim();
    if (categoryId && !categoryName) {
      const catRow = await queryDb(
        `SELECT name FROM website_clubs_category WHERE id = $1 AND website_id = $2 LIMIT 1`,
        [categoryId, website.id]
      );
      if (catRow.rows.length > 0) {
        categoryName = catRow.rows[0].name;
      }
    }
    categoryName = categoryName || 'Cultural';

    const moderatorTeacherId = body.moderator_teacher_id ? parseInt(body.moderator_teacher_id, 10) : null;
    const isActive = body.is_active === false || body.is_active === 'false' ? false : true;
    const description = body.description?.trim() || null;

    const insertRes = await queryDb(
      `INSERT INTO website_clubs (
        website_id, name, category, category_id, description, logo_url,
        moderator_teacher_id, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [website.id, name, categoryName, categoryId, description, logoUrl, moderatorTeacherId, isActive]
    );

    const newClub = insertRes.rows[0];

    // If chat box creation is requested upon club creation
    if (body.create_chat_box === true || body.create_chat_box === 'true') {
      await queryDb(
        `INSERT INTO website_club_chats (website_id, club_id, title, description, created_by_teacher_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (website_id, club_id) DO UPDATE
         SET is_active = TRUE, title = EXCLUDED.title`,
        [website.id, newClub.id, `${name} Chat Box`, `Official communication room for ${name}`, moderatorTeacherId]
      );
      await queryDb(
        `UPDATE website_clubs SET has_chat_box = TRUE, chat_box_title = $1 WHERE id = $2`,
        [`${name} Chat Box`, newClub.id]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Club registered successfully.',
      club: newClub,
    });
  } catch (error) {
    console.error('Error creating club:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update an existing club
export async function PUT(request, context) {
  try {
    const auth = await verifyClubStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await parseClubRequest(request);

    const clubId = parseInt(body.id, 10);
    if (!clubId || isNaN(clubId)) {
      return NextResponse.json({ success: false, error: 'Valid Club ID is required.' }, { status: 400 });
    }

    const checkRes = await queryDb(
      `SELECT * FROM website_clubs WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [clubId, website.id]
    );
    if (checkRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Club not found in this institution.' }, { status: 404 });
    }
    const currentClub = checkRes.rows[0];

    const name = body.name?.trim() || currentClub.name;

    // Check unique name if changed
    if (name.toLowerCase() !== currentClub.name.toLowerCase()) {
      const dupCheck = await queryDb(
        `SELECT id FROM website_clubs WHERE website_id = $1 AND LOWER(name) = LOWER($2) AND id != $3 LIMIT 1`,
        [website.id, name, clubId]
      );
      if (dupCheck.rows.length > 0) {
        return NextResponse.json({ success: false, error: `A club named "${name}" already exists.` }, { status: 409 });
      }
    }

    let logoUrl = currentClub.logo_url;
    if (body.logoFile && typeof body.logoFile === 'object') {
      try {
        const uploadRes = await uploadImage(body.logoFile, 'clubs');
        logoUrl = uploadRes.secure_url || uploadRes.url;
      } catch (uploadErr) {
        console.error('Logo upload error:', uploadErr);
      }
    } else if (body.logo_url !== undefined) {
      logoUrl = body.logo_url;
    }

    const categoryId = body.category_id !== undefined ? (body.category_id ? parseInt(body.category_id, 10) : null) : currentClub.category_id;
    let categoryName = body.category?.trim() || currentClub.category;
    if (categoryId && (!body.category || body.category === currentClub.category)) {
      const catRow = await queryDb(
        `SELECT name FROM website_clubs_category WHERE id = $1 AND website_id = $2 LIMIT 1`,
        [categoryId, website.id]
      );
      if (catRow.rows.length > 0) {
        categoryName = catRow.rows[0].name;
      }
    }

    const moderatorTeacherId = body.moderator_teacher_id !== undefined 
      ? (body.moderator_teacher_id ? parseInt(body.moderator_teacher_id, 10) : null) 
      : currentClub.moderator_teacher_id;
    
    const isActive = body.is_active !== undefined 
      ? (body.is_active === true || body.is_active === 'true' || body.is_active === 1) 
      : currentClub.is_active;

    const description = body.description !== undefined ? body.description?.trim() : currentClub.description;

    const updated = await queryDb(
      `UPDATE website_clubs
       SET name = $1,
           category = $2,
           category_id = $3,
           description = $4,
           logo_url = $5,
           moderator_teacher_id = $6,
           is_active = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND website_id = $9
       RETURNING *`,
      [name, categoryName, categoryId, description, logoUrl, moderatorTeacherId, isActive, clubId, website.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Club updated successfully.',
      club: updated.rows[0],
    });
  } catch (error) {
    console.error('Error updating club:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a club
export async function DELETE(request, context) {
  try {
    const auth = await verifyClubStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    const clubId = parseInt(id, 10);
    if (!clubId || isNaN(clubId)) {
      return NextResponse.json({ success: false, error: 'Valid Club ID is required.' }, { status: 400 });
    }

    const delRes = await queryDb(
      `DELETE FROM website_clubs WHERE id = $1 AND website_id = $2 RETURNING id, name`,
      [clubId, website.id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Club not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Club "${delRes.rows[0].name}" deleted successfully.`,
      club: delRes.rows[0],
    });
  } catch (error) {
    console.error('Error deleting club:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
