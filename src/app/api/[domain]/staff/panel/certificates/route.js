import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyStudentStaffAccess } from 'src/lib/middleware/student-auth.js';

// GET: List issued certificates with student JOIN metadata
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
    const certificateType = searchParams.get('type') || searchParams.get('certificate_type');
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    const baseSelect = `
      SELECT cert.id, cert.website_id, cert.student_id, cert.certificate_no,
             cert.template_id, cert.certificate_type, cert.award_title,
             cert.achievement_description, cert.event_date, cert.issue_date,
             cert.status, cert.issued_by_staff_id, cert.custom_data,
             cert.created_at, cert.updated_at,
             s.registration_no, s.roll_no, s.student_unique_id, s.is_active AS student_is_active,
             COALESCE(s.name, i.data->>'name', 'Student Name') AS student_name,
             COALESCE(s.gender, i.data->>'gender') AS gender,
             COALESCE(s.blood_group, i.data->>'blood_group') AS blood_group,
             c.name AS class_name,
             sec.name AS section_name,
             ses.name AS session_name,
             st.name AS issued_by_staff_name,
             tpl.name AS template_name
      FROM website_student_certificates cert
      JOIN website_students s ON cert.student_id = s.id
      LEFT JOIN website_student_info i ON s.id = i.student_id
      LEFT JOIN website_classes c ON s.class_id = c.id
      LEFT JOIN website_sections sec ON s.section_id = sec.id
      LEFT JOIN website_sessions ses ON s.session_id = ses.id
      LEFT JOIN website_staffs st ON cert.issued_by_staff_id = st.id
      LEFT JOIN website_student_certificate_templates tpl ON cert.template_id = tpl.id
    `;

    // Single certificate fetch
    if (id) {
      const res = await queryDb(`${baseSelect} WHERE cert.website_id = $1 AND cert.id = $2 LIMIT 1`, [website.id, id]);
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Certificate not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, payload: { certificate: res.rows[0] } });
    }

    // List with filters
    const conditions = ['cert.website_id = $1'];
    const values = [website.id];
    let pIdx = 2;

    if (studentId) {
      conditions.push(`cert.student_id = $${pIdx++}`);
      values.push(studentId);
    }
    if (certificateType && certificateType !== 'all') {
      conditions.push(`cert.certificate_type = $${pIdx++}`);
      values.push(certificateType);
    }
    if (status && status !== 'all') {
      conditions.push(`cert.status = $${pIdx++}`);
      values.push(status);
    }
    if (search) {
      conditions.push(`(
        s.registration_no ILIKE $${pIdx} OR
        s.roll_no ILIKE $${pIdx} OR
        COALESCE(s.name, i.data->>'name', '') ILIKE $${pIdx} OR
        cert.certificate_no ILIKE $${pIdx} OR
        cert.award_title ILIKE $${pIdx}
      )`);
      values.push(`%${search}%`);
      pIdx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [countRes, listRes] = await Promise.all([
      queryDb(
        `SELECT COUNT(*) AS total
         FROM website_student_certificates cert
         JOIN website_students s ON cert.student_id = s.id
         LEFT JOIN website_student_info i ON s.id = i.student_id
         ${whereClause}`,
        values
      ),
      queryDb(
        `${baseSelect}
         ${whereClause}
         ORDER BY cert.id DESC
         LIMIT $${pIdx++} OFFSET $${pIdx++}`,
        [...values, limit, offset]
      ),
    ]);

    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    return NextResponse.json({
      success: true,
      payload: {
        certificates: listRes.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error('Error fetching certificates:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

// POST: Issue new student certificate
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
      certificate_no,
      template_id,
      certificate_type = 'Academic Excellence',
      award_title = 'Certificate of Academic Excellence',
      achievement_description = '',
      event_date = new Date().toISOString().split('T')[0],
      issue_date = new Date().toISOString().split('T')[0],
      status = 'issued',
      custom_data = {},
    } = body;

    if (!student_id) {
      return NextResponse.json({ success: false, error: 'Student is required.' }, { status: 400 });
    }
    if (!award_title?.trim()) {
      return NextResponse.json({ success: false, error: 'Award title is required.' }, { status: 400 });
    }

    const generatedCertNo = certificate_no?.trim() || `CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const insertRes = await queryDb(
      `INSERT INTO website_student_certificates (
          website_id, student_id, certificate_no, template_id,
          certificate_type, award_title, achievement_description,
          event_date, issue_date, status, issued_by_staff_id, custom_data
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (website_id, certificate_no)
       DO UPDATE SET
          template_id = EXCLUDED.template_id,
          certificate_type = EXCLUDED.certificate_type,
          award_title = EXCLUDED.award_title,
          achievement_description = EXCLUDED.achievement_description,
          event_date = EXCLUDED.event_date,
          issue_date = EXCLUDED.issue_date,
          status = EXCLUDED.status,
          issued_by_staff_id = EXCLUDED.issued_by_staff_id,
          custom_data = EXCLUDED.custom_data,
          updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        website.id,
        student_id,
        generatedCertNo,
        template_id || null,
        certificate_type,
        award_title,
        achievement_description,
        event_date,
        issue_date,
        status,
        staffId,
        JSON.stringify(custom_data),
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Certificate issued successfully.',
      payload: { certificate: insertRes.rows[0] },
    });
  } catch (err) {
    console.error('Error issuing certificate:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

// PUT: Update certificate status or details
export async function PUT(request, context) {
  try {
    const auth = await verifyStudentStaffAccess(request, context, 'update');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json();
    const { id, status, award_title, achievement_description, certificate_type, event_date } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Certificate id is required.' }, { status: 400 });
    }

    const updateRes = await queryDb(
      `UPDATE website_student_certificates
       SET status = COALESCE($1, status),
           award_title = COALESCE($2, award_title),
           achievement_description = COALESCE($3, achievement_description),
           certificate_type = COALESCE($4, certificate_type),
           event_date = COALESCE($5, event_date),
           updated_at = CURRENT_TIMESTAMP
       WHERE website_id = $6 AND id = $7
       RETURNING *`,
      [status || null, award_title || null, achievement_description || null, certificate_type || null, event_date || null, website.id, id]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Certificate not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Certificate updated successfully.',
      payload: { certificate: updateRes.rows[0] },
    });
  } catch (err) {
    console.error('Error updating certificate:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

// DELETE: Revoke/delete certificate
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
      return NextResponse.json({ success: false, error: 'Certificate id is required.' }, { status: 400 });
    }

    const deleteRes = await queryDb(
      `DELETE FROM website_student_certificates WHERE website_id = $1 AND id = $2 RETURNING id`,
      [website.id, id]
    );

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Certificate not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Certificate record deleted successfully.' });
  } catch (err) {
    console.error('Error deleting certificate:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
