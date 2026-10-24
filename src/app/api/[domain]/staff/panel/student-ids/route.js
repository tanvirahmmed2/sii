import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyStudentStaffAccess } from 'src/lib/middleware/student-auth.js';

// GET: List issued student ID cards with rich student JOIN metadata
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
    const sectionId = searchParams.get('section_id');
    const sessionId = searchParams.get('session_id');
    const status = searchParams.get('status') || searchParams.get('card_status');
    const search = searchParams.get('search')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    const baseSelect = `
      SELECT sid.id, sid.website_id, sid.student_id, sid.card_number,
             sid.template_id, sid.session_id, sid.class_id, sid.section_id,
             sid.issue_date, sid.expiry_date, sid.valid_upto, sid.barcode_data,
             sid.card_status, sid.issued_by_staff_id, sid.custom_data,
             sid.created_at, sid.updated_at,
             s.registration_no, s.roll_no, s.student_unique_id, s.is_active AS student_is_active,
             COALESCE(s.name, i.data->>'name', 'Student Name') AS student_name,
             COALESCE(s.gender, i.data->>'gender') AS gender,
             COALESCE(s.blood_group, i.data->>'blood_group') AS blood_group,
             COALESCE(s.number, i.data->>'number') AS student_phone,
             COALESCE(s.email, i.data->>'email') AS student_email,
             COALESCE(g.data->>'guardian_phone', g.data->>'father_phone', s.number) AS emergency_contact,
             g.data->>'father_name' AS father_name, g.data->>'mother_name' AS mother_name,
             c.name AS class_name, c.code AS class_code,
             sec.name AS section_name,
             ses.name AS session_name,
             pic.image_url AS student_photo_url,
             st.name AS issued_by_staff_name,
             tpl.name AS template_name
      FROM website_student_ids sid
      JOIN website_students s ON sid.student_id = s.id
      LEFT JOIN website_student_info i ON s.id = i.student_id
      LEFT JOIN website_student_guardians g ON s.id = g.student_id
      LEFT JOIN website_classes c ON sid.class_id = c.id OR (sid.class_id IS NULL AND s.class_id = c.id)
      LEFT JOIN website_sections sec ON sid.section_id = sec.id OR (sid.section_id IS NULL AND s.section_id = sec.id)
      LEFT JOIN website_sessions ses ON sid.session_id = ses.id OR (sid.session_id IS NULL AND s.session_id = ses.id)
      LEFT JOIN website_student_pictures pic ON pic.student_id = s.id AND pic.is_primary = TRUE
      LEFT JOIN website_staffs st ON sid.issued_by_staff_id = st.id
      LEFT JOIN website_student_id_templates tpl ON sid.template_id = tpl.id
    `;

    // Single card fetch
    if (id) {
      const res = await queryDb(`${baseSelect} WHERE sid.website_id = $1 AND sid.id = $2 LIMIT 1`, [website.id, id]);
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Issued ID Card not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, payload: { id_card: res.rows[0] } });
    }

    // List with filters
    const conditions = ['sid.website_id = $1'];
    const values = [website.id];
    let pIdx = 2;

    if (studentId) {
      conditions.push(`sid.student_id = $${pIdx++}`);
      values.push(studentId);
    }
    if (classId) {
      conditions.push(`(sid.class_id = $${pIdx} OR (sid.class_id IS NULL AND s.class_id = $${pIdx}))`);
      values.push(classId);
      pIdx++;
    }
    if (sectionId) {
      conditions.push(`(sid.section_id = $${pIdx} OR (sid.section_id IS NULL AND s.section_id = $${pIdx}))`);
      values.push(sectionId);
      pIdx++;
    }
    if (sessionId) {
      conditions.push(`(sid.session_id = $${pIdx} OR (sid.session_id IS NULL AND s.session_id = $${pIdx}))`);
      values.push(sessionId);
      pIdx++;
    }
    if (status && status !== 'all') {
      conditions.push(`sid.card_status = $${pIdx++}`);
      values.push(status);
    }
    if (search) {
      conditions.push(`(
        s.registration_no ILIKE $${pIdx} OR
        s.roll_no ILIKE $${pIdx} OR
        COALESCE(s.name, i.data->>'name', '') ILIKE $${pIdx} OR
        sid.card_number ILIKE $${pIdx}
      )`);
      values.push(`%${search}%`);
      pIdx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [countRes, listRes] = await Promise.all([
      queryDb(
        `SELECT COUNT(*) AS total
         FROM website_student_ids sid
         JOIN website_students s ON sid.student_id = s.id
         LEFT JOIN website_student_info i ON s.id = i.student_id
         ${whereClause}`,
        values
      ),
      queryDb(
        `${baseSelect}
         ${whereClause}
         ORDER BY sid.id DESC
         LIMIT $${pIdx++} OFFSET $${pIdx++}`,
        [...values, limit, offset]
      ),
    ]);

    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    return NextResponse.json({
      success: true,
      payload: {
        id_cards: listRes.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error('Error fetching issued student ID cards:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

// POST: Issue new student ID card(s)
export async function POST(request, context) {
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
      student_ids,
      template_id,
      valid_upto = 'Dec 2027',
      expiry_date,
      issue_date = new Date().toISOString().split('T')[0],
      card_status = 'active',
      custom_data = {},
    } = body;

    const targetStudentIds = Array.isArray(student_ids) && student_ids.length > 0
      ? student_ids
      : (student_id ? [student_id] : []);

    if (targetStudentIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Please select at least one student.' }, { status: 400 });
    }

    // Fetch students metadata
    const studentsRes = await queryDb(
      `SELECT s.id, s.registration_no, s.roll_no, s.student_unique_id,
              s.class_id, s.section_id, s.session_id,
              COALESCE(s.name, i.data->>'name') AS name,
              COALESCE(s.blood_group, i.data->>'blood_group') AS blood_group
       FROM website_students s
       LEFT JOIN website_student_info i ON s.id = i.student_id
       WHERE s.website_id = $1 AND s.id = ANY($2::bigint[])`,
      [website.id, targetStudentIds]
    );

    if (studentsRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'No matching students found.' }, { status: 404 });
    }

    const defaultExpiry = expiry_date || (() => {
      const exp = new Date();
      exp.setFullYear(exp.getFullYear() + 1);
      return exp.toISOString().split('T')[0];
    })();

    const issuedCards = [];

    for (const stu of studentsRes.rows) {
      const cardNumber = `ID-${stu.registration_no || stu.student_unique_id || stu.id}`;
      const barcodeData = stu.student_unique_id || stu.registration_no || cardNumber;

      // Upsert into website_student_ids
      const insertRes = await queryDb(
        `INSERT INTO website_student_ids (
            website_id, student_id, card_number, template_id,
            session_id, class_id, section_id,
            issue_date, expiry_date, valid_upto, barcode_data,
            card_status, issued_by_staff_id, custom_data
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (website_id, card_number)
         DO UPDATE SET
            template_id = EXCLUDED.template_id,
            session_id = EXCLUDED.session_id,
            class_id = EXCLUDED.class_id,
            section_id = EXCLUDED.section_id,
            issue_date = EXCLUDED.issue_date,
            expiry_date = EXCLUDED.expiry_date,
            valid_upto = EXCLUDED.valid_upto,
            barcode_data = EXCLUDED.barcode_data,
            card_status = EXCLUDED.card_status,
            issued_by_staff_id = EXCLUDED.issued_by_staff_id,
            custom_data = EXCLUDED.custom_data,
            updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [
          website.id,
          stu.id,
          cardNumber,
          template_id || null,
          stu.session_id || null,
          stu.class_id || null,
          stu.section_id || null,
          issue_date,
          defaultExpiry,
          valid_upto,
          barcodeData,
          card_status,
          staffId,
          JSON.stringify(custom_data),
        ]
      );

      issuedCards.push(insertRes.rows[0]);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully issued ${issuedCards.length} Student ID Card(s).`,
      payload: { id_cards: issuedCards },
    });
  } catch (err) {
    console.error('Error issuing student ID cards:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

// PUT: Update card status or particulars
export async function PUT(request, context) {
  try {
    const auth = await verifyStudentStaffAccess(request, context, 'update');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json();
    const { id, card_status, valid_upto, expiry_date, card_number } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID card id is required.' }, { status: 400 });
    }

    const updateRes = await queryDb(
      `UPDATE website_student_ids
       SET card_status = COALESCE($1, card_status),
           valid_upto = COALESCE($2, valid_upto),
           expiry_date = COALESCE($3, expiry_date),
           card_number = COALESCE($4, card_number),
           updated_at = CURRENT_TIMESTAMP
       WHERE website_id = $5 AND id = $6
       RETURNING *`,
      [card_status || null, valid_upto || null, expiry_date || null, card_number || null, website.id, id]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Card record not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'ID Card updated successfully.',
      payload: { id_card: updateRes.rows[0] },
    });
  } catch (err) {
    console.error('Error updating student ID card:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

// DELETE: Revoke/delete an issued ID card
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
      return NextResponse.json({ success: false, error: 'ID card id is required.' }, { status: 400 });
    }

    const deleteRes = await queryDb(
      `DELETE FROM website_student_ids WHERE website_id = $1 AND id = $2 RETURNING id`,
      [website.id, id]
    );

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Card record not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'ID Card record deleted successfully.' });
  } catch (err) {
    console.error('Error deleting student ID card:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
