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

    if (session.website_id && String(session.website_id) !== String(website.id)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Access denied to foreign institution resources.' },
        { status: 403 }
      );
    }

    const studentId = session.id;

    // Fetch clubs and student membership
    let clubs = [];
    try {
      const clubsRes = await queryDb(
        `SELECT c.*,
                t.name AS moderator_name,
                m.role AS my_role,
                m.status AS my_membership_status,
                m.joined_date AS my_joined_date,
                (SELECT COUNT(*)::int FROM website_student_club_members scm WHERE scm.club_id = c.id AND scm.status = 'active') AS total_members
         FROM website_clubs c
         LEFT JOIN website_teachers t ON t.id = c.moderator_teacher_id
         LEFT JOIN website_student_club_members m ON m.club_id = c.id AND m.student_id = $1
         WHERE c.website_id = $2 AND c.is_active = TRUE
         ORDER BY c.name ASC`,
        [studentId, website.id]
      );
      clubs = clubsRes.rows;
    } catch {}

    const myClubs = clubs.filter(c => c.my_membership_status === 'active');
    const isClubMember = myClubs.length > 0;

    const payload = {
      clubs,
      myClubs,
      isClubMember
    };

    return NextResponse.json({
      success: true,
      clubs,
      myClubs,
      isClubMember,
      payload,
      paylod: payload
    });
  } catch (error) {
    console.error('Error fetching clubs:', error);
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

    if (session.website_id && String(session.website_id) !== String(website.id)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Access denied to foreign institution resources.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { club_id } = body;

    const parsedClubId = parseInt(club_id, 10);
    if (!parsedClubId || isNaN(parsedClubId)) {
      return NextResponse.json({ success: false, error: 'Valid Club ID is required.' }, { status: 400 });
    }

    // Verify club exists in this institution
    const clubCheck = await queryDb(
      `SELECT id FROM website_clubs WHERE id = $1 AND website_id = $2 AND is_active = TRUE LIMIT 1`,
      [parsedClubId, website.id]
    );
    if (clubCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Club not found or inactive in this institution.' }, { status: 404 });
    }

    const memberRes = await queryDb(
      `INSERT INTO website_student_club_members (
         website_id, club_id, student_id, role, status, joined_date
       ) VALUES ($1, $2, $3, 'member', 'active', CURRENT_DATE)
       ON CONFLICT (website_id, club_id, student_id) DO UPDATE
       SET status = 'active', updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [website.id, parsedClubId, session.id]
    );

    return NextResponse.json({
      success: true,
      message: 'You have joined the club successfully!',
      membership: memberRes.rows[0]
    });
  } catch (error) {
    console.error('Error joining club:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
