import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyClubStaffAccess } from 'src/lib/middleware/clubAuth.js';

// GET: List club members with student details, metadata, and candidate search
export async function GET(request, context) {
  try {
    const auth = await verifyClubStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);

    const action = searchParams.get('action');
    const studentDept = searchParams.get('student_dept');
    const studentClass = searchParams.get('student_class');
    const studentRegNo = searchParams.get('student_reg_no')?.trim();
    const candidateQuery = searchParams.get('candidate_query')?.trim();
    const targetClubId = searchParams.get('target_club_id');

    // Dedicated Candidate Students Search Sub-Action
    if (action === 'search_candidates') {
      let candQuery = `
        SELECT s.id,
               s.registration_no,
               s.roll_no,
               s.department_id,
               s.class_id,
               COALESCE(i.name, 'Student #' || s.id) AS name,
               i.number AS phone,
               d.name AS department_name,
               cl.name AS class_name,
               EXISTS(
                 SELECT 1 
                 FROM website_student_club_members scm 
                 WHERE scm.website_id = $1 
                   AND scm.student_id = s.id 
                   AND scm.club_id = $2
               ) AS is_already_member
        FROM website_students s
        LEFT JOIN website_student_info i ON i.student_id = s.id
        LEFT JOIN website_departments d ON d.id = s.department_id
        LEFT JOIN website_classes cl ON cl.id = s.class_id
        WHERE s.website_id = $1
      `;
      const candParams = [website.id, targetClubId ? parseInt(targetClubId, 10) : 0];

      if (studentDept && studentDept !== 'all') {
        candParams.push(parseInt(studentDept, 10));
        candQuery += ` AND s.department_id = $${candParams.length}`;
      }

      if (studentClass && studentClass !== 'all') {
        candParams.push(parseInt(studentClass, 10));
        candQuery += ` AND s.class_id = $${candParams.length}`;
      }

      if (studentRegNo) {
        candParams.push(`%${studentRegNo}%`);
        candQuery += ` AND s.registration_no ILIKE $${candParams.length}`;
      }

      if (candidateQuery) {
        candParams.push(`%${candidateQuery}%`);
        candQuery += ` AND (i.name ILIKE $${candParams.length} OR s.registration_no ILIKE $${candParams.length} OR s.roll_no ILIKE $${candParams.length})`;
      }

      candQuery += ` ORDER BY s.registration_no ASC, i.name ASC LIMIT 150`;

      const candRes = await queryDb(candQuery, candParams);
      return NextResponse.json({
        success: true,
        candidate_students: candRes.rows,
        total: candRes.rowCount,
      });
    }

    // Default: Fetch full member ledger + dropdowns & initial candidates
    const clubId = searchParams.get('club_id');
    const search = searchParams.get('search')?.trim() || '';
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const chatOnly = searchParams.get('chat_only') === 'true';

    let queryStr = `
      SELECT scm.id,
             scm.website_id,
             scm.club_id,
             scm.student_id,
             scm.role,
             scm.status,
             scm.can_access_chat,
             scm.joined_date,
             scm.created_at,
             c.name AS club_name,
             c.category AS club_category,
             c.has_chat_box,
             s.registration_no,
             s.roll_no,
             COALESCE(i.name, 'Student #' || s.id) AS student_name,
             i.number AS student_phone,
             i.gender AS student_gender,
             d.name AS department_name,
             cl.name AS class_name,
             sec.name AS section_name
      FROM website_student_club_members scm
      JOIN website_clubs c ON c.id = scm.club_id
      JOIN website_students s ON s.id = scm.student_id
      LEFT JOIN website_student_info i ON i.student_id = s.id
      LEFT JOIN website_departments d ON d.id = s.department_id
      LEFT JOIN website_classes cl ON cl.id = s.class_id
      LEFT JOIN website_sections sec ON sec.id = s.section_id
      WHERE scm.website_id = $1
    `;
    const params = [website.id];

    if (clubId && clubId !== 'all') {
      params.push(parseInt(clubId, 10));
      queryStr += ` AND scm.club_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      queryStr += ` AND (i.name ILIKE $${params.length} OR s.registration_no ILIKE $${params.length} OR c.name ILIKE $${params.length})`;
    }

    if (role && role !== 'all') {
      params.push(role);
      queryStr += ` AND scm.role = $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      queryStr += ` AND scm.status = $${params.length}`;
    }

    if (chatOnly) {
      queryStr += ` AND scm.can_access_chat = true`;
    }

    queryStr += ` ORDER BY c.name ASC, scm.can_access_chat DESC, scm.role ASC, i.name ASC`;

    const result = await queryDb(queryStr, params);

    // Fetch clubs list for dropdown
    const clubsRes = await queryDb(
      `SELECT id, name, category, has_chat_box FROM website_clubs WHERE website_id = $1 AND is_active = true ORDER BY name ASC`,
      [website.id]
    );

    // Fetch departments for candidate filtering
    const deptsRes = await queryDb(
      `SELECT id, name FROM website_departments WHERE website_id = $1 AND is_active = true ORDER BY name ASC`,
      [website.id]
    );

    // Fetch classes for candidate filtering
    const classesRes = await queryDb(
      `SELECT id, name, department_id FROM website_classes WHERE website_id = $1 ORDER BY name ASC`,
      [website.id]
    );

    // Initial pool of candidate students
    const initialCandidatesRes = await queryDb(
      `SELECT s.id,
              s.registration_no,
              s.roll_no,
              s.department_id,
              s.class_id,
              COALESCE(i.name, 'Student #' || s.id) AS name,
              i.number AS phone,
              d.name AS department_name,
              cl.name AS class_name
       FROM website_students s
       LEFT JOIN website_student_info i ON i.student_id = s.id
       LEFT JOIN website_departments d ON d.id = s.department_id
       LEFT JOIN website_classes cl ON cl.id = s.class_id
       WHERE s.website_id = $1
       ORDER BY s.registration_no ASC, i.name ASC 
       LIMIT 100`,
      [website.id]
    );

    return NextResponse.json({
      success: true,
      members: result.rows,
      clubs: clubsRes.rows,
      departments: deptsRes.rows,
      classes: classesRes.rows,
      candidate_students: initialCandidatesRes.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching club members:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Add single or multiple students as club members
export async function POST(request, context) {
  try {
    const auth = await verifyClubStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json().catch(() => ({}));

    const clubId = parseInt(body.club_id, 10);
    const role = body.role || 'member';
    const status = body.status || 'active';
    const canAccessChat = body.can_access_chat !== false && body.can_access_chat !== 'false';
    const joinedDate = body.joined_date || new Date().toISOString().split('T')[0];

    if (!clubId || isNaN(clubId)) {
      return NextResponse.json({ success: false, error: 'A target Club must be selected.' }, { status: 400 });
    }

    // Verify club
    const clubCheck = await queryDb(
      `SELECT id, name FROM website_clubs WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [clubId, website.id]
    );
    if (clubCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Selected club not found.' }, { status: 404 });
    }

    // Determine student IDs: supports both array `student_ids` and single `student_id`
    let studentIds = [];
    if (Array.isArray(body.student_ids)) {
      studentIds = body.student_ids
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id) && id > 0);
    } else if (body.student_id) {
      const sid = parseInt(body.student_id, 10);
      if (!isNaN(sid) && sid > 0) studentIds.push(sid);
    }

    if (studentIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Please select at least one student to enroll.' }, { status: 400 });
    }

    let enrolledCount = 0;
    for (const sid of studentIds) {
      await queryDb(
        `INSERT INTO website_student_club_members (
           website_id, club_id, student_id, role, status, can_access_chat, joined_date
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (website_id, club_id, student_id) DO UPDATE
         SET role = EXCLUDED.role,
             status = EXCLUDED.status,
             can_access_chat = EXCLUDED.can_access_chat,
             joined_date = EXCLUDED.joined_date,
             updated_at = CURRENT_TIMESTAMP`,
        [website.id, clubId, sid, role, status, canAccessChat, joinedDate]
      );
      enrolledCount++;
    }

    return NextResponse.json({
      success: true,
      count: enrolledCount,
      message: `Successfully enrolled ${enrolledCount} student${enrolledCount > 1 ? 's' : ''} into "${clubCheck.rows[0].name}".`,
    });
  } catch (error) {
    console.error('Error adding club member(s):', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update member role, status, or chat access
export async function PUT(request, context) {
  try {
    const auth = await verifyClubStaffAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json().catch(() => ({}));

    const memberId = parseInt(body.id, 10);
    if (!memberId || isNaN(memberId)) {
      return NextResponse.json({ success: false, error: 'Valid Member Record ID required.' }, { status: 400 });
    }

    const checkRes = await queryDb(
      `SELECT * FROM website_student_club_members WHERE id = $1 AND website_id = $2 LIMIT 1`,
      [memberId, website.id]
    );
    if (checkRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Member record not found.' }, { status: 404 });
    }

    const current = checkRes.rows[0];
    const role = body.role || current.role;
    const status = body.status || current.status;
    const canAccessChat = body.can_access_chat !== undefined 
      ? (body.can_access_chat === true || body.can_access_chat === 'true' || body.can_access_chat === 1)
      : current.can_access_chat;

    const updated = await queryDb(
      `UPDATE website_student_club_members
       SET role = $1, status = $2, can_access_chat = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND website_id = $5
       RETURNING *`,
      [role, status, canAccessChat, memberId, website.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Member details updated successfully.',
      member: updated.rows[0],
    });
  } catch (error) {
    console.error('Error updating club member:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove member from club
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

    const memberId = parseInt(id, 10);
    if (!memberId || isNaN(memberId)) {
      return NextResponse.json({ success: false, error: 'Valid Member Record ID required.' }, { status: 400 });
    }

    const delRes = await queryDb(
      `DELETE FROM website_student_club_members WHERE id = $1 AND website_id = $2 RETURNING id`,
      [memberId, website.id]
    );

    if (delRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Member record not found or already removed.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Member removed from club successfully.',
    });
  } catch (error) {
    console.error('Error deleting club member:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
