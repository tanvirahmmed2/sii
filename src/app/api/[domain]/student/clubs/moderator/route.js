import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStudentSession } from 'src/lib/middleware/students.js';

export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const session = await getStudentSession(request);
    if (!session || !session.isActive || !session.isVerified) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Active verified student session required.' },
        { status: 401 }
      );
    }

    const studentId = session.id;

    // Check clubs where student is an active executive or moderator
    const clubsRes = await queryDb(
      `SELECT c.id, c.name, c.slug, c.description, c.category,
              m.role AS moderator_designation,
              m.joined_date
       FROM website_clubs c
       JOIN website_student_club_members m ON m.club_id = c.id AND m.student_id = $1
       WHERE c.website_id = $2 
         AND c.is_active = TRUE 
         AND m.status = 'active'
         AND (LOWER(m.role) IN ('moderator', 'president', 'vice_president', 'secretary', 'lead', 'admin'))
       ORDER BY c.name ASC`,
      [studentId, website.id]
    );

    const isClubModerator = clubsRes.rows.length > 0;
    const clubs = [];

    // For each club, fetch news articles
    for (const club of clubsRes.rows) {
      let news = [];
      try {
        const newsRes = await queryDb(
          `SELECT id, title, content, image_url, created_at
           FROM website_club_news
           WHERE club_id = $1 AND website_id = $2
           ORDER BY created_at DESC LIMIT 20`,
          [club.id, website.id]
        );
        news = newsRes.rows;
      } catch {}

      clubs.push({
        ...club,
        news,
      });
    }

    const payload = {
      isClubModerator,
      clubs,
    };

    return NextResponse.json({
      success: true,
      isClubModerator,
      clubs,
      payload,
      paylod: payload,
    });
  } catch (error) {
    console.error('Error in student clubs moderator API:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const session = await getStudentSession(request);
    if (!session || !session.isActive || !session.isVerified) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Active verified student session required.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { action = 'manage_news', club_id, news_id, title, content, image } = body;

    const parsedClubId = parseInt(club_id, 10);
    if (!parsedClubId || isNaN(parsedClubId)) {
      return NextResponse.json({ success: false, error: 'Valid Club ID is required.' }, { status: 400 });
    }

    // Verify student is moderator of this club
    const modCheck = await queryDb(
      `SELECT m.id, m.role
       FROM website_student_club_members m
       JOIN website_clubs c ON c.id = m.club_id
       WHERE m.club_id = $1 AND m.student_id = $2 AND c.website_id = $3
         AND m.status = 'active'
         AND (LOWER(m.role) IN ('moderator', 'president', 'vice_president', 'secretary', 'lead', 'admin'))
       LIMIT 1`,
      [parsedClubId, session.id, website.id]
    );

    if (modCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have moderator permissions for this club.' },
        { status: 403 }
      );
    }

    if (action === 'delete_news') {
      const parsedNewsId = parseInt(news_id, 10);
      if (!parsedNewsId) {
        return NextResponse.json({ success: false, error: 'Valid news ID required.' }, { status: 400 });
      }

      await queryDb(
        `DELETE FROM website_club_news WHERE id = $1 AND club_id = $2 AND website_id = $3`,
        [parsedNewsId, parsedClubId, website.id]
      );

      return NextResponse.json({ success: true, message: 'Club news post deleted successfully.' });
    }

    // manage_news
    if (!title || !content) {
      return NextResponse.json({ success: false, error: 'Title and content are required.' }, { status: 400 });
    }

    if (news_id) {
      const parsedNewsId = parseInt(news_id, 10);
      const updateRes = await queryDb(
        `UPDATE website_club_news
         SET title = $1, content = $2, image_url = COALESCE($3, image_url), updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 AND club_id = $5 AND website_id = $6
         RETURNING *`,
        [title.trim(), content.trim(), image || null, parsedNewsId, parsedClubId, website.id]
      );

      return NextResponse.json({
        success: true,
        message: 'Club news article updated successfully!',
        article: updateRes.rows[0],
      });
    }

    const insertRes = await queryDb(
      `INSERT INTO website_club_news (
         website_id, club_id, title, content, image_url
       ) VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [website.id, parsedClubId, title.trim(), content.trim(), image || null]
    );

    return NextResponse.json({
      success: true,
      message: 'Club news article published successfully!',
      article: insertRes.rows[0],
    });
  } catch (error) {
    console.error('Error saving club news by moderator:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
