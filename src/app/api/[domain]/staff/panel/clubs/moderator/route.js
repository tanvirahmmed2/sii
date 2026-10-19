import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyClubStaffAccess } from 'src/lib/middleware/clubAuth.js';

// GET: Moderator assignments, available teachers, chat status, and club members
export async function GET(request, context) {
  try {
    const auth = await verifyClubStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('club_id');

    // 1. Fetch all clubs with moderator info and chat status
    const clubsRes = await queryDb(
      `SELECT c.id, c.website_id, c.name, c.category, c.logo_url, c.is_active,
              c.moderator_teacher_id,
              c.has_chat_box, c.chat_box_title, c.chat_box_status,
              t.name AS moderator_name,
              t.email AS moderator_email,
              t.number AS moderator_phone,
              t.photo_url AS moderator_photo,
              des.title AS moderator_designation,
              ch.id AS chat_id,
              ch.title AS chat_title,
              ch.is_active AS chat_is_active,
              ch.created_at AS chat_created_at,
              COALESCE((SELECT COUNT(*) FROM website_student_club_members scm WHERE scm.club_id = c.id AND scm.status = 'active'), 0)::int AS total_members,
              COALESCE((SELECT COUNT(*) FROM website_student_club_members scm WHERE scm.club_id = c.id AND scm.can_access_chat = true AND scm.status = 'active'), 0)::int AS chat_access_count
       FROM website_clubs c
       LEFT JOIN website_teachers t ON t.id = c.moderator_teacher_id
       LEFT JOIN website_designations des ON des.id = t.designation_id
       LEFT JOIN website_club_chats ch ON ch.club_id = c.id
       WHERE c.website_id = $1
       ORDER BY c.name ASC`,
      [website.id]
    );

    // 2. Fetch all teachers for dropdown
    const teachersRes = await queryDb(
      `SELECT t.id, t.name, t.email, t.number, t.photo_url, des.title AS designation
       FROM website_teachers t
       LEFT JOIN website_designations des ON des.id = t.designation_id
       WHERE t.website_id = $1 AND t.is_active = true
       ORDER BY t.name ASC`,
      [website.id]
    );

    // 3. Fetch students for quick-member assignment dropdown
    const studentsRes = await queryDb(
      `SELECT s.id, s.registration_no, s.roll_no,
              i.name, i.number, c.name AS class_name
       FROM website_students s
       LEFT JOIN website_student_info i ON i.student_id = s.id
       LEFT JOIN website_classes c ON c.id = s.class_id
       WHERE s.website_id = $1 AND s.is_active = true
       ORDER BY i.name ASC, s.registration_no ASC
       LIMIT 200`,
      [website.id]
    );

    let selectedClubMembers = [];
    let selectedClubChatMessages = [];

    if (clubId) {
      const parsedClubId = parseInt(clubId, 10);
      if (parsedClubId) {
        const membersRes = await queryDb(
          `SELECT scm.id, scm.club_id, scm.student_id, scm.role, scm.status,
                  scm.can_access_chat, scm.joined_date,
                  s.registration_no, s.roll_no,
                  i.name AS student_name, i.number AS student_phone, i.gender,
                  cl.name AS class_name
           FROM website_student_club_members scm
           JOIN website_students s ON s.id = scm.student_id
           LEFT JOIN website_student_info i ON i.student_id = s.id
           LEFT JOIN website_classes cl ON cl.id = s.class_id
           WHERE scm.website_id = $1 AND scm.club_id = $2
           ORDER BY scm.can_access_chat DESC, scm.role ASC, i.name ASC`,
          [website.id, parsedClubId]
        );
        selectedClubMembers = membersRes.rows;

        // Fetch recent chat messages for this club if chat box exists
        const msgsRes = await queryDb(
          `SELECT m.* 
           FROM website_club_chat_messages m
           WHERE m.website_id = $1 AND m.club_id = $2
           ORDER BY m.created_at ASC
           LIMIT 50`,
          [website.id, parsedClubId]
        );
        selectedClubChatMessages = msgsRes.rows;
      }
    }

    return NextResponse.json({
      success: true,
      clubs: clubsRes.rows,
      teachers: teachersRes.rows,
      students: studentsRes.rows,
      selectedClubMembers,
      selectedClubChatMessages,
    });
  } catch (error) {
    console.error('Error fetching moderator dashboard info:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Handle assign moderator, create chat box, toggle chat box, or add member with chat access
export async function POST(request, context) {
  try {
    const auth = await verifyClubStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'assign_moderator';

    // ---------------------------------------------------------
    // ACTION 1: Assign teacher as moderator to club
    // ---------------------------------------------------------
    if (action === 'assign_moderator') {
      const clubId = parseInt(body.club_id, 10);
      const teacherId = body.teacher_id ? parseInt(body.teacher_id, 10) : null;

      if (!clubId || isNaN(clubId)) {
        return NextResponse.json({ success: false, error: 'Valid Club ID is required.' }, { status: 400 });
      }

      // Verify club belongs to this website
      const clubCheck = await queryDb(
        `SELECT id, name, moderator_teacher_id FROM website_clubs WHERE id = $1 AND website_id = $2 LIMIT 1`,
        [clubId, website.id]
      );
      if (clubCheck.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Club not found.' }, { status: 404 });
      }

      // If teacherId provided, verify teacher belongs to website
      let teacherName = 'None';
      if (teacherId) {
        const teacherCheck = await queryDb(
          `SELECT id, name FROM website_teachers WHERE id = $1 AND website_id = $2 LIMIT 1`,
          [teacherId, website.id]
        );
        if (teacherCheck.rows.length === 0) {
          return NextResponse.json({ success: false, error: 'Teacher not found in this institution.' }, { status: 404 });
        }
        teacherName = teacherCheck.rows[0].name;
      }

      await queryDb(
        `UPDATE website_clubs 
         SET moderator_teacher_id = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 AND website_id = $3`,
        [teacherId, clubId, website.id]
      );

      // Also update chat room creator if chat exists
      if (teacherId) {
        await queryDb(
          `UPDATE website_club_chats 
           SET created_by_teacher_id = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE club_id = $2 AND website_id = $3`,
          [teacherId, clubId, website.id]
        );
      }

      return NextResponse.json({
        success: true,
        message: teacherId 
          ? `Teacher "${teacherName}" successfully assigned as Moderator for ${clubCheck.rows[0].name}.`
          : `Moderator unassigned from ${clubCheck.rows[0].name}.`,
      });
    }

    // ---------------------------------------------------------
    // ACTION 2: Create Chat Box for club
    // ---------------------------------------------------------
    if (action === 'create_chat_box') {
      const clubId = parseInt(body.club_id, 10);
      if (!clubId || isNaN(clubId)) {
        return NextResponse.json({ success: false, error: 'Valid Club ID is required.' }, { status: 400 });
      }

      const clubRes = await queryDb(
        `SELECT id, name, moderator_teacher_id FROM website_clubs WHERE id = $1 AND website_id = $2 LIMIT 1`,
        [clubId, website.id]
      );
      if (clubRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Club not found.' }, { status: 404 });
      }

      const club = clubRes.rows[0];
      const chatTitle = body.title?.trim() || `${club.name} Official Chat`;
      const description = body.description?.trim() || `Official collaboration and live chat room for ${club.name}`;
      const teacherId = club.moderator_teacher_id || null;

      // Upsert into website_club_chats
      const chatRes = await queryDb(
        `INSERT INTO website_club_chats (website_id, club_id, title, description, is_active, created_by_teacher_id)
         VALUES ($1, $2, $3, $4, TRUE, $5)
         ON CONFLICT (website_id, club_id) DO UPDATE
         SET title = EXCLUDED.title,
             description = EXCLUDED.description,
             is_active = TRUE,
             created_by_teacher_id = COALESCE(EXCLUDED.created_by_teacher_id, website_club_chats.created_by_teacher_id),
             updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [website.id, clubId, chatTitle, description, teacherId]
      );

      // Update club table flag
      await queryDb(
        `UPDATE website_clubs
         SET has_chat_box = TRUE, chat_box_title = $1, chat_box_status = 'active', updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND website_id = $3`,
        [chatTitle, clubId, website.id]
      );

      // Add a system welcome message
      await queryDb(
        `INSERT INTO website_club_chat_messages (
           website_id, club_id, chat_id, sender_type, sender_id, sender_name, message
         ) VALUES ($1, $2, $3, 'staff', 0, 'Club System', $4)`,
        [website.id, clubId, chatRes.rows[0].id, `Welcome to the ${club.name} official chat box! Active members with chat permissions can exchange messages here.`]
      );

      return NextResponse.json({
        success: true,
        message: `Chat box "${chatTitle}" created successfully for ${club.name}.`,
        chat: chatRes.rows[0],
      });
    }

    // ---------------------------------------------------------
    // ACTION 3: Toggle Chat Box Active / Inactive
    // ---------------------------------------------------------
    if (action === 'toggle_chat_box') {
      const clubId = parseInt(body.club_id, 10);
      const isActive = body.is_active === true || body.is_active === 'true' || body.is_active === 1;

      if (!clubId || isNaN(clubId)) {
        return NextResponse.json({ success: false, error: 'Valid Club ID is required.' }, { status: 400 });
      }

      await queryDb(
        `UPDATE website_club_chats 
         SET is_active = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE club_id = $2 AND website_id = $3`,
        [isActive, clubId, website.id]
      );

      await queryDb(
        `UPDATE website_clubs 
         SET chat_box_status = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 AND website_id = $3`,
        [isActive ? 'active' : 'inactive', clubId, website.id]
      );

      return NextResponse.json({
        success: true,
        message: `Chat box has been ${isActive ? 'activated' : 'paused'}.`,
      });
    }

    // ---------------------------------------------------------
    // ACTION 4: Add member with chat access
    // ---------------------------------------------------------
    if (action === 'add_member') {
      const clubId = parseInt(body.club_id, 10);
      const studentId = parseInt(body.student_id, 10);
      const role = body.role || 'member';
      const status = body.status || 'active';
      const canAccessChat = body.can_access_chat !== false && body.can_access_chat !== 'false';

      if (!clubId || !studentId) {
        return NextResponse.json({ success: false, error: 'Both Club ID and Student ID are required.' }, { status: 400 });
      }

      // Verify club and student belong to website
      const clubRes = await queryDb(
        `SELECT id, name FROM website_clubs WHERE id = $1 AND website_id = $2 LIMIT 1`,
        [clubId, website.id]
      );
      if (clubRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Club not found.' }, { status: 404 });
      }

      const studentRes = await queryDb(
        `SELECT s.id, i.name 
         FROM website_students s 
         LEFT JOIN website_student_info i ON i.student_id = s.id 
         WHERE s.id = $1 AND s.website_id = $2 LIMIT 1`,
        [studentId, website.id]
      );
      if (studentRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Student not found in this institution.' }, { status: 404 });
      }

      const studentName = studentRes.rows[0].name || `Student #${studentId}`;

      const insertRes = await queryDb(
        `INSERT INTO website_student_club_members (
           website_id, club_id, student_id, role, status, can_access_chat, joined_date
         ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
         ON CONFLICT (website_id, club_id, student_id) DO UPDATE
         SET role = EXCLUDED.role,
             status = EXCLUDED.status,
             can_access_chat = EXCLUDED.can_access_chat,
             updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [website.id, clubId, studentId, role, status, canAccessChat]
      );

      return NextResponse.json({
        success: true,
        message: `Student "${studentName}" added to ${clubRes.rows[0].name} ${canAccessChat ? 'with chat box access' : 'without chat box access'}.`,
        member: insertRes.rows[0],
      });
    }

    // ---------------------------------------------------------
    // ACTION 5: Toggle chat access for existing member
    // ---------------------------------------------------------
    if (action === 'toggle_member_chat') {
      const memberId = parseInt(body.member_id, 10);
      const canAccessChat = body.can_access_chat === true || body.can_access_chat === 'true';

      if (!memberId || isNaN(memberId)) {
        return NextResponse.json({ success: false, error: 'Member record ID required.' }, { status: 400 });
      }

      await queryDb(
        `UPDATE website_student_club_members
         SET can_access_chat = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND website_id = $3`,
        [canAccessChat, memberId, website.id]
      );

      return NextResponse.json({
        success: true,
        message: `Member chat access updated to: ${canAccessChat ? 'Granted' : 'Revoked'}.`,
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action specified.' }, { status: 400 });
  } catch (error) {
    console.error('Error handling moderator action:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
