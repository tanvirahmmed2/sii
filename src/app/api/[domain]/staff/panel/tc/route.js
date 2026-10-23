import { NextResponse } from 'next/server';
import { queryDb, pool } from 'src/lib/database/db.js';
import { verifyStudentStaffAccess } from 'src/lib/middleware/student-auth.js';

// GET: List issued Transfer Certificates with joined student metadata
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
    const classId = searchParams.get('class_id');
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    const baseSelect = `
      SELECT tc.id, tc.website_id, tc.student_id, tc.tc_number,
             tc.template_id, tc.admission_date, tc.leaving_date,
             tc.last_class_id, tc.last_class_passed, tc.promoted_class,
             tc.reason_for_leaving, tc.destination_school, tc.dues_status,
             tc.conduct, tc.remarks, tc.status, tc.issued_by_staff_id,
             tc.issue_date, tc.custom_data, tc.created_at, tc.updated_at,
             s.registration_no, s.roll_no, s.student_unique_id, s.is_active AS student_is_active,
             COALESCE(s.name, i.data->>'name', 'Student Name') AS student_name,
             COALESCE(s.gender, i.data->>'gender') AS gender,
             COALESCE(s.blood_group, i.data->>'blood_group') AS blood_group,
             COALESCE(s.number, i.data->>'number') AS student_phone,
             g.data->>'father_name' AS father_name, g.data->>'mother_name' AS mother_name, g.data->>'guardian_name' AS guardian_name,
             c.name AS class_name,
             sec.name AS section_name,
             ses.name AS session_name,
             st.name AS issued_by_staff_name,
             tpl.name AS template_name
      FROM website_student_tcs tc
      JOIN website_students s ON tc.student_id = s.id
      LEFT JOIN website_student_info i ON s.id = i.student_id
      LEFT JOIN website_student_guardians g ON s.id = g.student_id
      LEFT JOIN website_classes c ON tc.last_class_id = c.id OR (tc.last_class_id IS NULL AND s.class_id = c.id)
      LEFT JOIN website_sections sec ON s.section_id = sec.id
      LEFT JOIN website_sessions ses ON s.session_id = ses.id
      LEFT JOIN website_staffs st ON tc.issued_by_staff_id = st.id
      LEFT JOIN website_student_tc_templates tpl ON tc.template_id = tpl.id
    `;

    // Single TC fetch
    if (id) {
      const res = await queryDb(`${baseSelect} WHERE tc.website_id = $1 AND tc.id = $2 LIMIT 1`, [website.id, id]);
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Transfer Certificate not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, payload: { tc: res.rows[0] } });
    }

    // List with filters
    const conditions = ['tc.website_id = $1'];
    const values = [website.id];
    let pIdx = 2;

    if (studentId) {
      conditions.push(`tc.student_id = $${pIdx++}`);
      values.push(studentId);
    }
    if (classId) {
      conditions.push(`(tc.last_class_id = $${pIdx} OR (tc.last_class_id IS NULL AND s.class_id = $${pIdx}))`);
      values.push(classId);
      pIdx++;
    }
    if (status && status !== 'all') {
      conditions.push(`tc.status = $${pIdx++}`);
      values.push(status);
    }
    if (search) {
      conditions.push(`(
        s.registration_no ILIKE $${pIdx} OR
        s.roll_no ILIKE $${pIdx} OR
        i.name ILIKE $${pIdx} OR
        tc.tc_number ILIKE $${pIdx} OR
        tc.destination_school ILIKE $${pIdx}
      )`);
      values.push(`%${search}%`);
      pIdx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [countRes, listRes] = await Promise.all([
      queryDb(
        `SELECT COUNT(*) AS total
         FROM website_student_tcs tc
         JOIN website_students s ON tc.student_id = s.id
         LEFT JOIN website_student_info i ON s.id = i.student_id
         ${whereClause}`,
        values
      ),
      queryDb(
        `${baseSelect}
         ${whereClause}
         ORDER BY tc.id DESC
         LIMIT $${pIdx++} OFFSET $${pIdx++}`,
        [...values, limit, offset]
      ),
    ]);

    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    return NextResponse.json({
      success: true,
      payload: {
        tcs: listRes.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error('Error fetching transfer certificates:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

// POST: Issue new Transfer Certificate & record exit
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
      tc_number,
      template_id,
      admission_date,
      leaving_date = new Date().toISOString().split('T')[0],
      last_class_id,
      last_class_passed,
      promoted_class = 'Promoted to Next Grade',
      reason_for_leaving,
      destination_school = '',
      dues_status = 'Cleared',
      conduct = 'Good',
      remarks = '',
      status = 'issued',
      custom_data = {},
    } = body;

    if (!student_id) {
      return NextResponse.json({ success: false, error: 'Student is required.' }, { status: 400 });
    }
    if (!reason_for_leaving?.trim()) {
      return NextResponse.json({ success: false, error: 'Reason for leaving is required.' }, { status: 400 });
    }

    // Verify student exists and belongs to tenant
    const stuRes = await client.query(
      `SELECT s.id, s.class_id, s.section_id, s.session_id, s.registration_no,
              i.admission_date AS stu_admission_date, c.name AS class_name
       FROM website_students s
       LEFT JOIN website_student_info i ON s.id = i.student_id
       LEFT JOIN website_classes c ON s.class_id = c.id
       WHERE s.website_id = $1 AND s.id = $2
       LIMIT 1`,
      [website.id, student_id]
    );

    if (stuRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student record not found.' }, { status: 404 });
    }

    const student = stuRes.rows[0];
    const generatedTcNo = tc_number?.trim() || `TC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    await client.query('BEGIN');

    // 1. Insert into website_student_tcs
    const tcRes = await client.query(
      `INSERT INTO website_student_tcs (
          website_id, student_id, tc_number, template_id,
          admission_date, leaving_date, last_class_id,
          last_class_passed, promoted_class, reason_for_leaving,
          destination_school, dues_status, conduct, remarks,
          status, issued_by_staff_id, issue_date, custom_data
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_DATE, $17)
       ON CONFLICT (website_id, tc_number)
       DO UPDATE SET
          admission_date = EXCLUDED.admission_date,
          leaving_date = EXCLUDED.leaving_date,
          last_class_id = EXCLUDED.last_class_id,
          last_class_passed = EXCLUDED.last_class_passed,
          promoted_class = EXCLUDED.promoted_class,
          reason_for_leaving = EXCLUDED.reason_for_leaving,
          destination_school = EXCLUDED.destination_school,
          dues_status = EXCLUDED.dues_status,
          conduct = EXCLUDED.conduct,
          remarks = EXCLUDED.remarks,
          status = EXCLUDED.status,
          issued_by_staff_id = EXCLUDED.issued_by_staff_id,
          custom_data = EXCLUDED.custom_data,
          updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        website.id,
        student_id,
        generatedTcNo,
        template_id || null,
        admission_date || student.stu_admission_date || null,
        leaving_date,
        last_class_id || student.class_id || null,
        last_class_passed || student.class_name || 'N/A',
        promoted_class,
        reason_for_leaving,
        destination_school,
        dues_status,
        conduct,
        remarks,
        status,
        staffId,
        JSON.stringify(custom_data),
      ]
    );

    const tc = tcRes.rows[0];

    // 2. Automatically record in website_student_exits
    await client.query(
      `INSERT INTO website_student_exits (
          website_id, student_id, exit_type, exit_date,
          reason, destination_institution,
          last_class_id, last_section_id, last_session_id,
          tc_id, financial_clearance, library_clearance, hall_clearance,
          clearance_notes, recorded_by_staff_id
       )
       VALUES ($1, $2, 'transferred', $3, $4, $5, $6, $7, $8, $9, TRUE, TRUE, TRUE, $10, $11)`,
      [
        website.id,
        student_id,
        leaving_date,
        reason_for_leaving,
        destination_school,
        student.class_id || null,
        student.section_id || null,
        student.session_id || null,
        tc.id,
        `TC Issued #${generatedTcNo}. ${remarks}`,
        staffId,
      ]
    );

    // 3. Mark student as inactive (departed)
    await client.query(
      `UPDATE website_students
       SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE website_id = $1 AND id = $2`,
      [website.id, student_id]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: 'Transfer Certificate issued successfully and exit recorded.',
      payload: { tc },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error issuing Transfer Certificate:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  } finally {
    client.release();
  }
}

// PUT: Update TC details or status
export async function PUT(request, context) {
  try {
    const auth = await verifyStudentStaffAccess(request, context, 'update');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json();
    const { id, status, conduct, dues_status, reason_for_leaving, destination_school, remarks } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'TC id is required.' }, { status: 400 });
    }

    const updateRes = await queryDb(
      `UPDATE website_student_tcs
       SET status = COALESCE($1, status),
           conduct = COALESCE($2, conduct),
           dues_status = COALESCE($3, dues_status),
           reason_for_leaving = COALESCE($4, reason_for_leaving),
           destination_school = COALESCE($5, destination_school),
           remarks = COALESCE($6, remarks),
           updated_at = CURRENT_TIMESTAMP
       WHERE website_id = $7 AND id = $8
       RETURNING *`,
      [status || null, conduct || null, dues_status || null, reason_for_leaving || null, destination_school || null, remarks || null, website.id, id]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Transfer certificate not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Transfer Certificate updated successfully.',
      payload: { tc: updateRes.rows[0] },
    });
  } catch (err) {
    console.error('Error updating TC:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

// DELETE: Cancel/delete a transfer certificate
export async function DELETE(request, context) {
  try {
    const auth = await verifyStudentStaffAccess(request, context, 'delete');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'TC id is required.' }, { status: 400 });
    }

    const deleteRes = await queryDb(
      `DELETE FROM website_student_tcs WHERE website_id = $1 AND id = $2 RETURNING id, student_id`,
      [website.id, id]
    );

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Transfer certificate not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Transfer certificate record deleted successfully.' });
  } catch (err) {
    console.error('Error deleting TC:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
