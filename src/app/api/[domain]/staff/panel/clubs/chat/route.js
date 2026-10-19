import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyClubStaffAccess } from 'src/lib/middleware/clubAuth.js';

// GET: Fetch club chat box details, participants, and messages
export async function GET(request, context) {
  try {
    const auth = await verifyClubStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const clubId = parseInt(searchParams.get('club_id'), 10);

    if (!clubId || isNaN(clubId)) {
      return NextResponse.json({ success: false, error: 'Valid Club ID is required.' }, { status: 400 });
    }

    // 1. Fetch club and chat room details
    const clubRes = await queryDb(
      `SELECT c.id, c.name, c.logo_url, c.moderator_teacher_id, c.has_chat_box, c.chat_box_title, c.chat_box_status,
              t.name AS moderator_name, t.photo_url AS moderator_photo,
              ch.id AS chat_room_id, ch.title AS chat_title, ch.description AS chat_description, ch.is_active AS chat_is_active
       FROM website_clubs c
       LEFT JOIN website_teachers t ON t.id = c.moderator_teacher_id
       LEFT JOIN website_club_chats ch ON ch.club_id = c.id
       WHERE c.id = $1 AND c.website_id = $2
       LIMIT 1`,
      [clubId, website.id]
    );

    if (clubRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Club not found.' }, { status: 404 });
    }

    const club = clubRes.rows[0];

    // 2. Fetch messages
    const msgsRes = await queryDb(
      `SELECT id, club_id, chat_id, sender_type, sender_id, sender_name, sender_photo, message, attachment_url, created_at
       FROM website_club_chat_messages
       WHERE club_id = $1 AND website_id = $2
       ORDER BY created_at ASC
       LIMIT 100`,
      [clubId, website.id]
    );

    // 3. Fetch eligible chat members (can_access_chat = true)
    const membersRes = await queryDb(
      `SELECT scm.id, scm.student_id, scm.role, scm.can_access_chat,
              s.registration_no, s.roll_no,
              i.name AS student_name, i.gender,
              cl.name AS class_name
       FROM website_student_club_members scm
       JOIN website_students s ON s.id = scm.student_id
       LEFT JOIN website_student_info i ON i.student_id = s.id
       LEFT JOIN website_classes cl ON cl.id = s.class_id
       WHERE scm.club_id = $1 AND scm.website_id = $2 AND scm.status = 'active'
       ORDER BY scm.can_access_chat DESC, i.name ASC`,
      [clubId, website.id]
    );

    return NextResponse.json({
      success: true,
      club,
      chat: club.chat_room_id ? {
        id: club.chat_room_id,
        title: club.chat_title || club.chat_box_title,
        description: club.chat_description,
        is_active: club.chat_is_active,
      } : null,
      messages: msgsRes.rows,
      members: membersRes.rows,
    });
  } catch (error) {
    console.error('Error fetching club chat:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Send a message in the club chat box
export async function POST(request, context) {
  try {
    const auth = await verifyClubStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website, user } = auth;
    const body = await request.json().catch(() => ({}));

    const clubId = parseInt(body.club_id, 10);
    const message = body.message?.trim();

    if (!clubId || !message) {
      return NextResponse.json({ success: false, error: 'Club ID and Message text are required.' }, { status: 400 });
    }

    // Verify club and chat room
    const clubRes = await queryDb(
      `SELECT c.id, c.name, ch.id AS chat_id, ch.is_active
       FROM website_clubs c
       LEFT JOIN website_club_chats ch ON ch.club_id = c.id
       WHERE c.id = $1 AND c.website_id = $2
       LIMIT 1`,
      [clubId, website.id]
    );

    if (clubRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Club not found.' }, { status: 404 });
    }

    let chatId = clubRes.rows[0].chat_id;
    if (!chatId) {
      // Auto-initialize chat room if not yet created
      const initRes = await queryDb(
        `INSERT INTO website_club_chats (website_id, club_id, title, is_active)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (website_id, club_id) DO UPDATE SET is_active = TRUE
         RETURNING id`,
        [website.id, clubId, `${clubRes.rows[0].name} Chat Box`]
      );
      chatId = initRes.rows[0].id;
      await queryDb(
        `UPDATE website_clubs SET has_chat_box = TRUE, chat_box_title = $1 WHERE id = $2`,
        [`${clubRes.rows[0].name} Chat Box`, clubId]
      );
    }

    const senderName = body.sender_name || user?.name || user?.staff?.name || user?.officer?.name || 'Staff Moderator';
    const senderType = body.sender_type || (user?.type === 'teacher' ? 'teacher' : 'staff');
    const senderId = user?.id || user?.staff_id || user?.officer_id || 0;
    const senderPhoto = body.sender_photo || user?.image || user?.photo_url || null;
    const attachmentUrl = body.attachment_url || null;

    const insertRes = await queryDb(
      `INSERT INTO website_club_chat_messages (
         website_id, club_id, chat_id, sender_type, sender_id, sender_name, sender_photo, message, attachment_url
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [website.id, clubId, chatId, senderType, senderId, senderName, senderPhoto, message, attachmentUrl]
    );

    return NextResponse.json({
      success: true,
      message: 'Message delivered.',
      chat_message: insertRes.rows[0],
    });
  } catch (error) {
    console.error('Error posting club chat message:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
