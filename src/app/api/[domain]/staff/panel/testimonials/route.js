import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyStudentStaffAccess } from 'src/lib/middleware/student-auth.js';

// GET: List issued testimonials with student and guardian JOIN metadata
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
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    const baseSelect = `
      SELECT tm.id, tm.website_id, tm.student_id, tm.testimonial_no,
             tm.certificate_number, tm.template_id, tm.certificate_type,
             tm.purpose, tm.examination_name, tm.session_name,
             tm.passing_year, tm.gpa, tm.conduct, tm.status,
             tm.issue_date, tm.issued_by_staff_id, tm.remarks, tm.custom_data,
             tm.created_at, tm.updated_at,
             s.registration_no, s.roll_no, s.student_unique_id, s.is_active AS student_is_active,
             COALESCE(i.name, 'Student Name') AS student_name,
             i.gender, i.blood_group,
             g.father_name, g.mother_name, g.guardian_name,
             c.name AS class_name,
             sec.name AS section_name,
             ses.name AS academic_session_name,
             st.name AS issued_by_staff_name,
             tpl.name AS template_name
      FROM website_student_testimonials tm
      JOIN website_students s ON tm.student_id = s.id
      LEFT JOIN website_student_info i ON s.id = i.student_id
      LEFT JOIN website_student_guardians g ON s.id = g.student_id
      LEFT JOIN website_classes c ON s.class_id = c.id
      LEFT JOIN website_sections sec ON s.section_id = sec.id
      LEFT JOIN website_sessions ses ON s.session_id = ses.id
      LEFT JOIN website_staffs st ON tm.issued_by_staff_id = st.id
      LEFT JOIN website_student_testimonial_templates tpl ON tm.template_id = tpl.id
    `;

    // Single testimonial fetch
    if (id) {
      const res = await queryDb(`${baseSelect} WHERE tm.website_id = $1 AND tm.id = $2 LIMIT 1`, [website.id, id]);
      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Testimonial not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, payload: { testimonial: res.rows[0] } });
    }

    // List with filters
    const conditions = ['tm.website_id = $1'];
    const values = [website.id];
    let pIdx = 2;

    if (studentId) {
      conditions.push(`tm.student_id = $${pIdx++}`);
      values.push(studentId);
    }
    if (status && status !== 'all') {
      conditions.push(`tm.status = $${pIdx++}`);
      values.push(status);
    }
    if (search) {
      conditions.push(`(
        s.registration_no ILIKE $${pIdx} OR
        s.roll_no ILIKE $${pIdx} OR
        i.name ILIKE $${pIdx} OR
        tm.testimonial_no ILIKE $${pIdx} OR
        tm.certificate_number ILIKE $${pIdx}
      )`);
      values.push(`%${search}%`);
      pIdx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [countRes, listRes] = await Promise.all([
      queryDb(
        `SELECT COUNT(*) AS total
         FROM website_student_testimonials tm
         JOIN website_students s ON tm.student_id = s.id
         LEFT JOIN website_student_info i ON s.id = i.student_id
         ${whereClause}`,
        values
      ),
      queryDb(
        `${baseSelect}
         ${whereClause}
         ORDER BY tm.id DESC
         LIMIT $${pIdx++} OFFSET $${pIdx++}`,
        [...values, limit, offset]
      ),
    ]);

    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    return NextResponse.json({
      success: true,
      payload: {
        testimonials: listRes.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error('Error fetching testimonials:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

// POST: Issue new student testimonial
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
      testimonial_no,
      template_id,
      certificate_type = 'Academic Testimonial',
      purpose = 'Higher Studies & Official Reference',
      examination_name = 'Secondary School Certificate (SSC)',
      session_name = '2024 - 2026',
      passing_year = new Date().getFullYear().toString(),
      gpa,
      conduct = 'praiseworthy, disciplined and exemplary',
      status = 'issued',
      remarks = '',
      issue_date = new Date().toISOString().split('T')[0],
      custom_data = {},
    } = body;

    if (!student_id) {
      return NextResponse.json({ success: false, error: 'Student is required.' }, { status: 400 });
    }

    const generatedTestimonialNo = testimonial_no?.trim() || `TEST-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const insertRes = await queryDb(
      `INSERT INTO website_student_testimonials (
          website_id, student_id, testimonial_no, certificate_number,
          template_id, certificate_type, purpose, examination_name,
          session_name, passing_year, gpa, conduct, status,
          issue_date, issued_by_staff_id, remarks, custom_data
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [
        website.id,
        student_id,
        generatedTestimonialNo,
        generatedTestimonialNo,
        template_id || null,
        certificate_type,
        purpose,
        examination_name,
        session_name,
        passing_year,
        gpa ? parseFloat(gpa) : null,
        conduct,
        status,
        issue_date,
        staffId,
        remarks,
        JSON.stringify(custom_data),
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Testimonial issued successfully.',
      payload: { testimonial: insertRes.rows[0] },
    });
  } catch (err) {
    console.error('Error issuing testimonial:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

// PUT: Update testimonial particulars or status
export async function PUT(request, context) {
  try {
    const auth = await verifyStudentStaffAccess(request, context, 'update');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json();
    const { id, status, conduct, examination_name, session_name, passing_year, gpa, remarks } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Testimonial id is required.' }, { status: 400 });
    }

    const updateRes = await queryDb(
      `UPDATE website_student_testimonials
       SET status = COALESCE($1, status),
           conduct = COALESCE($2, conduct),
           examination_name = COALESCE($3, examination_name),
           session_name = COALESCE($4, session_name),
           passing_year = COALESCE($5, passing_year),
           gpa = COALESCE($6, gpa),
           remarks = COALESCE($7, remarks),
           updated_at = CURRENT_TIMESTAMP
       WHERE website_id = $8 AND id = $9
       RETURNING *`,
      [status || null, conduct || null, examination_name || null, session_name || null, passing_year || null, gpa ? parseFloat(gpa) : null, remarks || null, website.id, id]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Testimonial not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Testimonial updated successfully.',
      payload: { testimonial: updateRes.rows[0] },
    });
  } catch (err) {
    console.error('Error updating testimonial:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

// DELETE: Delete testimonial
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
      return NextResponse.json({ success: false, error: 'Testimonial id is required.' }, { status: 400 });
    }

    const deleteRes = await queryDb(
      `DELETE FROM website_student_testimonials WHERE website_id = $1 AND id = $2 RETURNING id`,
      [website.id, id]
    );

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Testimonial not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Testimonial deleted successfully.' });
  } catch (err) {
    console.error('Error deleting testimonial:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
