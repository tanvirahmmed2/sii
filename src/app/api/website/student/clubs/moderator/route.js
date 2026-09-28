import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getStudentUser } from '@/lib/auth';
import { uploadImage } from '@/lib/cloudinary';

// GET clubs assigned to student as club moderator in club_member
export async function GET() {
  try {
    const student = await getStudentUser();
    if (!student) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Students only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 401 });
    }

    const assignedClubsRes = await query(
      `SELECT c.id, c.name, c.slug, c.motto, c.description, c.notice_info, c.image, c.image_id, cm.designation as moderator_designation
       FROM club_member cm
       JOIN clubs c ON cm.club_id = c.id
       WHERE cm.student_id = $1 AND cm.role = 'moderator'
       ORDER BY c.name ASC`,
      [student.id]
    );

    if (assignedClubsRes.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Student is not assigned to any club as moderator',
        paylod: {
          isClubModerator: false,
          clubs: []
        }
      }, { status: 200 });
    }

    const clubs = assignedClubsRes.rows;
    const clubIds = clubs.map(c => c.id);

    const newsRes = await query(
      `SELECT * FROM club_news
       WHERE club_id = ANY($1::bigint[])
       ORDER BY created_at DESC`,
      [clubIds]
    );

    const clubsWithDetails = clubs.map(club => ({
      ...club,
      news: newsRes.rows.filter(n => String(n.club_id) === String(club.id))
    }));

    return NextResponse.json({
      success: true,
      message: 'Club moderator data fetched successfully',
      paylod: {
        isClubModerator: true,
        clubs: clubsWithDetails
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student club moderator details:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve moderator details.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// POST actions for Club Moderator (Manage Club News ONLY)
export async function POST(request) {
  try {
    const student = await getStudentUser();
    if (!student) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Students only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 401 });
    }

    const body = await request.json();
    const { action, club_id } = body;

    if (!club_id || !action) {
      return NextResponse.json({
        success: false,
        message: 'club_id and action are required.',
        error: 'Validation Error',
        paylod: null
      }, { status: 400 });
    }

    // Validate that student is in club_member with role = 'moderator'
    const modCheck = await query(
      `SELECT id FROM club_member WHERE club_id = $1 AND student_id = $2 AND role = 'moderator'`,
      [club_id, student.id]
    );

    if (modCheck.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Forbidden. You are not a moderator for this club.',
        error: 'Forbidden',
        paylod: null
      }, { status: 403 });
    }

    if (action === 'manage_news') {
      const { news_id, title, content, image } = body;

      if (!title || !content) {
        return NextResponse.json({
          success: false,
          message: 'Title and content are required.',
          error: 'Validation Error',
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
          console.error('Image upload failure:', uploadErr);
          return NextResponse.json({
            success: false,
            message: 'Failed to upload cover image.',
            error: 'Upload Failure',
            paylod: null
          }, { status: 500 });
        }
      } else if (image) {
        imageUrl = image;
      }

      if (news_id) {
        const updateQuery = imageUrl 
          ? `UPDATE club_news SET title = $1, content = $2, image_url = $3, image_id = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 AND club_id = $6 RETURNING *`
          : `UPDATE club_news SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND club_id = $4 RETURNING *`;
        
        const params = imageUrl 
          ? [title.trim(), content.trim(), imageUrl, imageId, news_id, club_id]
          : [title.trim(), content.trim(), news_id, club_id];

        const updatedNews = await query(updateQuery, params);

        return NextResponse.json({
          success: true,
          message: 'Club news updated successfully by moderator.',
          paylod: { news: updatedNews.rows[0] }
        }, { status: 200 });
      } else {
        const newNews = await query(
          `INSERT INTO club_news (club_id, title, content, image_url, image_id)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [club_id, title.trim(), content.trim(), imageUrl, imageId]
        );

        return NextResponse.json({
          success: true,
          message: 'Club news published successfully by moderator.',
          paylod: { news: newNews.rows[0] }
        }, { status: 201 });
      }
    }

    if (action === 'delete_news') {
      const { news_id } = body;
      if (!news_id) {
        return NextResponse.json({
          success: false,
          message: 'news_id is required.',
          error: 'Validation Error',
          paylod: null
        }, { status: 400 });
      }

      await query(`DELETE FROM club_news WHERE id = $1 AND club_id = $2`, [news_id, club_id]);

      return NextResponse.json({
        success: true,
        message: 'Club news deleted successfully.'
      }, { status: 200 });
    }

    return NextResponse.json({
      success: false,
      message: 'Club moderators can only update club news.',
      error: 'Forbidden Action',
      paylod: null
    }, { status: 403 });

  } catch (error) {
    console.error('Error processing student moderator action:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to complete request.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
