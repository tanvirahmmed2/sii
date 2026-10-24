import { NextResponse } from 'next/server';
import { queryDb, pool } from 'src/lib/database/db.js';
import { verifyStudentStaffAccess } from 'src/lib/middleware/student-auth.js';

// GET: Fetch student exit and transfer records with student JOIN metadata
export async function GET(request, context) {
  try {
    const auth = await verifyStudentStaffAccess(request, context, 'view');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);

    const id = searchParams.get('id');
    const studentId = searchParams.get('student_id');
    const exitType = searchParams.get('exit_type'); // 'graduated', 'transferred', 'dropped_out', 'rusticated', 'all'
    const classId = searchParams.get('class_id');
    const sessionId = searchParams.get('session_id');
    const search = searchParams.get('search')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    const baseSelect = `
      SELECT e.id, e.website_id, e.student_id, e.exit_type, e.exit_date,
             e.reason, e.destination_institution, e.destination_address,
             e.last_class_id, e.last_section_id, e.last_session_id, e.tc_id,
             e.financial_clearance, e.library_clearance, e.hall_clearance,
             e.clearance_notes, e.recorded_by_staff_id,
             e.created_at, e.updated_at,
             s.registration_no, s.roll_no, s.student_unique_id, s.is_active AS student_is_active,
             COALESCE(s.name, i.data->>'name', 'Student Name') AS student_name,
             COALESCE(s.gender, i.data->>'gender') AS gender,
             COALESCE(s.blood_group, i.data->>'blood_group') AS blood_group,
             COALESCE(s.number, i.data->>'number') AS student_phone,
             g.data->>'father_name' AS father_name, g.data->>'guardian_phone' AS guardian_phone,
             c.name AS class_name,
             sec.name AS section_name,
             ses.name AS session_name,
             st.name AS recorded_by_staff_name,
             tc.tc_number
      FROM website_student_exits e
      JOIN website_students s ON e.student_id = s.id
      LEFT JOIN website_student_info i ON s.id = i.student_id
      LEFT JOIN website_student_guardians g ON s.id = g.student_id
      LEFT JOIN website_classes c ON e.last_class_id = c.id OR (e.last_class_id IS NULL AND s.class_id = c.id)
      LEFT JOIN website_sections sec ON e.last_section_id = sec.id OR (e.last_section_id IS NULL AND s.section_id = sec.id)
      LEFT JOIN website_sessions ses ON e.last_session_id = ses.id OR (e.last_session_id IS NULL AND s.session_id = ses.id)
      LEFT JOIN website_staffs st ON e.recorded_by_staff_id = st.id
      LEFT JOIN website_student_tcs tc ON e.tc_id = tc.id
    `;

    // Single exit dossier fetch
    if (id) {
      const res = await queryDb(`${baseSelect} WHERE e.website_id = $1 AND e.id = $2 LIMIT 1`, [website.id, id]);
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Student exit record not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, payload: { exit: res.rows[0] } });
    }

    // List with filters
    const conditions = ['e.website_id = $1'];
    const values = [website.id];
    let pIdx = 2;

    if (studentId) {
      conditions.push(`e.student_id = $${pIdx++}`);
      values.push(studentId);
    }
    if (exitType && exitType !== 'all') {
      conditions.push(`e.exit_type = $${pIdx++}`);
      values.push(exitType);
    }
    if (classId) {
      conditions.push(`(e.last_class_id = $${pIdx} OR (e.last_class_id IS NULL AND s.class_id = $${pIdx}))`);
      values.push(classId);
      pIdx++;
    }
    if (sessionId) {
      conditions.push(`(e.last_session_id = $${pIdx} OR (e.last_session_id IS NULL AND s.session_id = $${pIdx}))`);
      values.push(sessionId);
      pIdx++;
    }
    if (search) {
      conditions.push(`(
        s.registration_no ILIKE $${pIdx} OR
        s.roll_no ILIKE $${pIdx} OR
        COALESCE(s.name, i.data->>'name', '') ILIKE $${pIdx} OR
        e.destination_institution ILIKE $${pIdx} OR
        e.reason ILIKE $${pIdx}
      )`);
      values.push(`%${search}%`);
      pIdx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [countRes, listRes] = await Promise.all([
      queryDb(
        `SELECT COUNT(*) AS total
         FROM website_student_exits e
         JOIN website_students s ON e.student_id = s.id
         LEFT JOIN website_student_info i ON s.id = i.student_id
         ${whereClause}`,
        values
      ),
      queryDb(
        `${baseSelect}
         ${whereClause}
         ORDER BY e.exit_date DESC, e.id DESC
         LIMIT $${pIdx++} OFFSET $${pIdx++}`,
        [...values, limit, offset]
      ),
    ]);

    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    return NextResponse.json({
      success: true,
      payload: {
        exits: listRes.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error('Error fetching student exits:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

// POST: Record student exit (graduation, transfer, drop out, rustication)
export async function POST(request, context) {
  const client = await pool.connect();
  try {
    const auth = await verifyStudentStaffAccess(request, context, 'create');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website, staffSession } = auth;
    const body = await request.json();
    const staffId = staffSession?.id || staffSession?.staff?.id || null;

    const {
      student_id,
      exit_type, // 'graduated', 'transferred', 'dropped_out', 'rusticated'
      exit_date = new Date().toISOString().split('T')[0],
      reason = '',
      destination_institution = '',
      destination_address = '',
      last_class_id,
      last_section_id,
      last_session_id,
      tc_id,
      financial_clearance = true,
      library_clearance = true,
      hall_clearance = true,
      clearance_notes = '',
    } = body;

    const validExitTypes = ['graduated', 'transferred', 'dropped_out', 'rusticated'];
    if (!validExitTypes.includes(exit_type)) {
      return NextResponse.json({
        success: false,
        error: `Invalid exit type. Must be one of: ${validExitTypes.join(', ')}`,
      }, { status: 400 });
    }

    if (!student_id) {
      return NextResponse.json({ success: false, error: 'Student is required.' }, { status: 400 });
    }

    // Verify student exists
    const stuRes = await client.query(
      `SELECT s.id, s.class_id, s.section_id, s.session_id, COALESCE(s.name, i.data->>'name') AS name
       FROM website_students s
       LEFT JOIN website_student_info i ON s.id = i.student_id
       WHERE s.website_id = $1 AND s.id = $2
       LIMIT 1`,
      [website.id, student_id]
    );

    if (stuRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student record not found.' }, { status: 404 });
    }

    const student = stuRes.rows[0];

    await client.query('BEGIN');

    // 1. Insert exit record
    const insertRes = await client.query(
      `INSERT INTO website_student_exits (
          website_id, student_id, exit_type, exit_date,
          reason, destination_institution, destination_address,
          last_class_id, last_section_id, last_session_id, tc_id,
          financial_clearance, library_clearance, hall_clearance,
          clearance_notes, recorded_by_staff_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        website.id,
        student_id,
        exit_type,
        exit_date,
        reason,
        destination_institution,
        destination_address,
        last_class_id || student.class_id || null,
        last_section_id || student.section_id || null,
        last_session_id || student.session_id || null,
        tc_id || null,
        Boolean(financial_clearance),
        Boolean(library_clearance),
        Boolean(hall_clearance),
        clearance_notes,
        staffId,
      ]
    );

    // 2. Mark student as inactive (departed)
    await client.query(
      `UPDATE website_students
       SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE website_id = $1 AND id = $2`,
      [website.id, student_id]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: `Student departure marked as '${exit_type}' successfully.`,
      payload: { exit: insertRes.rows[0] },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error recording student exit:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  } finally {
    client.release();
  }
}

// PUT: Update exit details or clearance notes
export async function PUT(request, context) {
  try {
    const auth = await verifyStudentStaffAccess(request, context, 'update');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json();
    const {
      id,
      exit_type,
      exit_date,
      reason,
      destination_institution,
      destination_address,
      financial_clearance,
      library_clearance,
      hall_clearance,
      clearance_notes,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Exit record id is required.' }, { status: 400 });
    }

    const updateRes = await queryDb(
      `UPDATE website_student_exits
       SET exit_type = COALESCE($1, exit_type),
           exit_date = COALESCE($2, exit_date),
           reason = COALESCE($3, reason),
           destination_institution = COALESCE($4, destination_institution),
           destination_address = COALESCE($5, destination_address),
           financial_clearance = COALESCE($6, financial_clearance),
           library_clearance = COALESCE($7, library_clearance),
           hall_clearance = COALESCE($8, hall_clearance),
           clearance_notes = COALESCE($9, clearance_notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE website_id = $10 AND id = $11
       RETURNING *`,
      [
        exit_type || null,
        exit_date || null,
        reason || null,
        destination_institution || null,
        destination_address || null,
        typeof financial_clearance === 'boolean' ? financial_clearance : null,
        typeof library_clearance === 'boolean' ? library_clearance : null,
        typeof hall_clearance === 'boolean' ? hall_clearance : null,
        clearance_notes || null,
        website.id,
        id,
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Exit record not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Student exit record updated successfully.',
      payload: { exit: updateRes.rows[0] },
    });
  } catch (err) {
    console.error('Error updating student exit record:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

// DELETE: Re-admit / reactivate student and cancel exit record
export async function DELETE(request, context) {
  const client = await pool.connect();
  try {
    const auth = await verifyStudentStaffAccess(request, context, 'delete');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Exit record id is required.' }, { status: 400 });
    }

    await client.query('BEGIN');

    const exitRes = await client.query(
      `DELETE FROM website_student_exits WHERE website_id = $1 AND id = $2 RETURNING student_id`,
      [website.id, id]
    );

    if (exitRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: 'Exit record not found.' }, { status: 404 });
    }

    const studentId = exitRes.rows[0].student_id;

    // Reactivate student account
    await client.query(
      `UPDATE website_students SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE website_id = $1 AND id = $2`,
      [website.id, studentId]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: 'Exit record cancelled and student reactivated successfully.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting student exit record:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
