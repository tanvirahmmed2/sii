import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTeacherUser } from '@/lib/auth';
import { uploadImage } from '@/lib/cloudinary';

// GET clubs assigned to teacher as club admin
export async function GET() {
  try {
    const teacher = await getTeacherUser();
    if (!teacher) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Teachers only.',
        error: 'Unauthorized',
        paylod: null
      }, { status: 401 });
    }    // Check club assignments in club_admin
    const assignedClubsRes = await query(
      `SELECT c.id, c.name, c.slug, c.motto, c.description, c.notice_info, c.image, c.image_id, ca.designation as admin_designation
       FROM club_admin ca
       JOIN clubs c ON ca.club_id = c.id
       WHERE ca.teacher_id = $1
       ORDER BY c.name ASC`,
      [teacher.id]
    );

    if (assignedClubsRes.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Teacher is not assigned to any club as admin',
        paylod: {
          isClubAdmin: false,
          clubs: [],
          students: []
        }
      }, { status: 200 });
    }

    const clubs = assignedClubsRes.rows;
    const clubIds = clubs.map(c => c.id);

    // Fetch members and moderators from club_member
    const membersRes = await query(
      `SELECT cm.id, cm.club_id, cm.student_id, cm.role, cm.designation, cm.created_at,
              s.name as student_name, s.registration_number, s.email as student_email
       FROM club_member cm
       JOIN students s ON cm.student_id = s.id
       WHERE cm.club_id = ANY($1::bigint[])
       ORDER BY CASE WHEN cm.role = 'moderator' THEN 1 ELSE 2 END, s.name ASC`,
      [clubIds]
    );

    const newsRes = await query(
      `SELECT * FROM club_news
       WHERE club_id = ANY($1::bigint[])
       ORDER BY created_at DESC`,
      [clubIds]
    );

    const studentsRes = await query(
      `SELECT id, name, registration_number, email FROM students WHERE is_active = true ORDER BY name ASC`
    );

    const clubsWithDetails = clubs.map(club => ({
      ...club,
      members: membersRes.rows.filter(m => String(m.club_id) === String(club.id)),
      news: newsRes.rows.filter(n => String(n.club_id) === String(club.id))
    }));

    return NextResponse.json({
      success: true,
      message: 'Club admin data fetched successfully',
      paylod: {
        isClubAdmin: true,
        clubs: clubsWithDetails,
        students: studentsRes.rows
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching teacher club admin details:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve club details.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}

// POST actions for Club Admin
export async function POST(request) {
  try {
    const teacher = await getTeacherUser();
    if (!teacher) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized. Teachers only.',
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

    // Validate that this teacher is indeed a club admin for this club
    const adminCheck = await query(
      `SELECT id FROM club_admin WHERE club_id = $1 AND teacher_id = $2`,
      [club_id, teacher.id]
    );

    if (adminCheck.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Forbidden. You are not a club admin for this club.',
        error: 'Forbidden',
        paylod: null
      }, { status: 403 });
    }

    // 1. ADD MEMBER / MODERATOR
    if (action === 'add_member') {
      const { student_id, role, designation } = body;
      if (!student_id) {
        return NextResponse.json({
          success: false,
          message: 'student_id is required.',
          error: 'Validation Error',
          paylod: null
        }, { status: 400 });
      }

      const assignedRole = role === 'moderator' ? 'moderator' : 'member';

      // Verify student existence
      const stCheck = await query(`SELECT id FROM students WHERE id = $1`, [student_id]);
      if (stCheck.rows.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'Student not found.',
          error: 'Not Found',
          paylod: null
        }, { status: 404 });
      }

      await query(
        `INSERT INTO club_member (club_id, student_id, role, designation)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (club_id, student_id) 
         DO UPDATE SET role = EXCLUDED.role, designation = EXCLUDED.designation, updated_at = CURRENT_TIMESTAMP`,
        [club_id, student_id, assignedRole, designation ? designation.trim() : (assignedRole === 'moderator' ? 'Moderator' : 'Member')]
      );

      return NextResponse.json({
        success: true,
        message: `Student added to club as ${assignedRole}.`
      }, { status: 200 });
    }

    // 2. UPDATE MEMBER ROLE / DESIGNATION
    if (action === 'update_member_role') {
      const { student_id, role, designation } = body;
      if (!student_id || !role) {
        return NextResponse.json({
          success: false,
          message: 'student_id and role are required.',
          error: 'Validation Error',
          paylod: null
        }, { status: 400 });
      }

      const assignedRole = role === 'moderator' ? 'moderator' : 'member';

      await query(
        `UPDATE club_member
         SET role = $1, designation = $2, updated_at = CURRENT_TIMESTAMP
         WHERE club_id = $3 AND student_id = $4`,
        [assignedRole, designation ? designation.trim() : (assignedRole === 'moderator' ? 'Moderator' : 'Member'), club_id, student_id]
      );

      return NextResponse.json({
        success: true,
        message: `Student role updated to ${assignedRole}.`
      }, { status: 200 });
    }

    // 3. REMOVE MEMBER
    if (action === 'remove_member') {
      const { student_id } = body;
      if (!student_id) {
        return NextResponse.json({
          success: false,
          message: 'student_id is required.',
          error: 'Validation Error',
          paylod: null
        }, { status: 400 });
      }

      await query(
        `DELETE FROM club_member WHERE club_id = $1 AND student_id = $2`,
        [club_id, student_id]
      );

      return NextResponse.json({
        success: true,
        message: 'Student removed from club.'
      }, { status: 200 });
    }

    // 4. UPDATE NOTICE INFORMATION
    if (action === 'update_notice') {
      const { notice_info } = body;
      await query(
        `UPDATE clubs SET notice_info = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [notice_info ? notice_info.trim() : '', club_id]
      );

      return NextResponse.json({
        success: true,
        message: 'Club notice information updated successfully.'
      }, { status: 200 });
    }

    // 5. MANAGE NEWS (Create / Update)
    if (action === 'manage_news') {
      const { news_id, title, content, image } = body;

      if (!title || !content) {
        return NextResponse.json({
          success: false,
          message: 'Title and content are required for news.',
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
          message: 'Club news updated successfully.',
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
          message: 'Club news published successfully.',
          paylod: { news: newNews.rows[0] }
        }, { status: 201 });
      }
    }

    // 6. DELETE NEWS
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
      message: 'Unknown action specified.',
      error: 'Invalid Action',
      paylod: null
    }, { status: 400 });

  } catch (error) {
    console.error('Error processing teacher club management action:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to complete request.',
      error: 'Internal Server Error',
      paylod: null
    }, { status: 500 });
  }
}
