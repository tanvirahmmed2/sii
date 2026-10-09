import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from 'src/lib/database/db.js';
import { verifyStudentStaffAccess } from 'src/lib/middleware/student-auth.js';
import { hashPassword } from 'src/lib/middleware/students.js';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo.js';
import { buildStudentSetupUrl } from 'src/lib/student/urls.js';

// GET: Fetch students with academic metadata, filters, stats, and search
export async function GET(request, context) {
  try {
    const auth = await verifyStudentStaffAccess(request, context, 'view');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);

    const id = searchParams.get('id');
    const classId = searchParams.get('class_id');
    const sectionId = searchParams.get('section_id');
    const sessionId = searchParams.get('session_id');
    const status = searchParams.get('status'); // 'all', 'pending_setup', 'submitted', 'verified', 'rejected'
    const search = searchParams.get('search')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    // Single student detail fetch
    if (id) {
      const singleRes = await queryDb(
        `SELECT s.id, s.website_id, s.registration_no, s.roll_no, s.student_unique_id,
                s.class_id, s.section_id, s.session_id, s.is_active,
                s.created_at, s.updated_at,
                i.name, i.email, i.number, i.gender, i.blood_group,
                i.date_of_birth, i.religion, i.admission_date,
                i.is_registered, i.is_verified, i.verification_status,
                i.verification_token, i.verification_notes, i.rejection_reason, i.verified_at,
                c.name AS class_name, c.code AS class_code,
                sec.name AS section_name,
                ses.name AS session_name,
                st.name AS verified_by_staff_name
         FROM website_students s
         LEFT JOIN website_student_info i ON s.id = i.student_id
         LEFT JOIN website_classes c ON s.class_id = c.id
         LEFT JOIN website_sections sec ON s.section_id = sec.id
         LEFT JOIN website_sessions ses ON s.session_id = ses.id
         LEFT JOIN website_staffs st ON i.verified_by_staff_id = st.id
         WHERE s.website_id = $1 AND s.id = $2
         LIMIT 1`,
        [website.id, id]
      );

      if (singleRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Student record not found.' }, { status: 404 });
      }

      const student = singleRes.rows[0];
      const [addrRes, guardRes, picsRes, sigRes] = await Promise.all([
        queryDb(`SELECT * FROM website_student_addresses WHERE student_id = $1 LIMIT 1`, [student.id]),
        queryDb(`SELECT * FROM website_student_guardians WHERE student_id = $1 LIMIT 1`, [student.id]),
        queryDb(`SELECT * FROM website_student_pictures WHERE student_id = $1 ORDER BY is_primary DESC, id DESC`, [student.id]),
        queryDb(`SELECT * FROM website_student_signatures WHERE student_id = $1 LIMIT 1`, [student.id]),
      ]);

      return NextResponse.json({
        success: true,
        payload: {
          student,
          address: addrRes.rows[0] || null,
          guardian: guardRes.rows[0] || null,
          pictures: picsRes.rows,
          signature: sigRes.rows[0] || null,
        },
      });
    }

    // List query with filters
    const conditions = ['s.website_id = $1'];
    const values = [website.id];
    let pIdx = 2;

    if (classId) {
      conditions.push(`s.class_id = $${pIdx++}`);
      values.push(classId);
    }

    if (sectionId) {
      conditions.push(`s.section_id = $${pIdx++}`);
      values.push(sectionId);
    }

    if (sessionId) {
      conditions.push(`s.session_id = $${pIdx++}`);
      values.push(sessionId);
    }

    if (status && status !== 'all') {
      conditions.push(`i.verification_status = $${pIdx++}`);
      values.push(status);
    }

    if (search) {
      conditions.push(
        `(i.name ILIKE $${pIdx} OR i.email ILIKE $${pIdx} OR s.registration_no ILIKE $${pIdx} OR s.student_unique_id ILIKE $${pIdx} OR s.roll_no ILIKE $${pIdx} OR i.number ILIKE $${pIdx})`
      );
      values.push(`%${search}%`);
      pIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await queryDb(
      `SELECT COUNT(*)::int AS total FROM website_students s LEFT JOIN website_student_info i ON s.id = i.student_id WHERE ${whereClause}`,
      values
    );
    const totalCount = countRes.rows[0]?.total || 0;

    // Fetch roster
    const rosterQuery = `
      SELECT s.id, s.website_id, s.registration_no, s.roll_no, s.student_unique_id,
             s.class_id, s.section_id, s.session_id, s.is_active,
             s.created_at, s.updated_at,
             i.name, i.email, i.number, i.gender, i.blood_group, i.date_of_birth,
             i.admission_date, i.is_registered, i.is_verified,
             i.verification_status, i.verification_token, i.verification_notes,
             c.name AS class_name, c.code AS class_code,
             sec.name AS section_name,
             ses.name AS session_name,
             p.image_url AS primary_photo_url
      FROM website_students s
      LEFT JOIN website_student_info i ON s.id = i.student_id
      LEFT JOIN website_classes c ON s.class_id = c.id
      LEFT JOIN website_sections sec ON s.section_id = sec.id
      LEFT JOIN website_sessions ses ON s.session_id = ses.id
      LEFT JOIN LATERAL (
        SELECT image_url FROM website_student_pictures
        WHERE student_id = s.id AND is_primary = TRUE
        LIMIT 1
      ) p ON true
      WHERE ${whereClause}
      ORDER BY s.id DESC
      LIMIT $${pIdx++} OFFSET $${pIdx++}
    `;

    const rosterRes = await queryDb(rosterQuery, [...values, limit, offset]);

    // Aggregate statistics
    const statsRes = await queryDb(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE i.verification_status = 'pending_setup')::int AS pending_setup,
         COUNT(*) FILTER (WHERE i.verification_status = 'submitted')::int AS submitted,
         COUNT(*) FILTER (WHERE i.verification_status = 'verified')::int AS verified,
         COUNT(*) FILTER (WHERE i.verification_status = 'rejected')::int AS rejected,
         COUNT(*) FILTER (WHERE s.is_active = TRUE)::int AS active_count
       FROM website_students s
       LEFT JOIN website_student_info i ON s.id = i.student_id
       WHERE s.website_id = $1`,
      [website.id]
    );

    return NextResponse.json({
      success: true,
      payload: {
        students: rosterRes.rows,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
        stats: statsRes.rows[0] || {},
      },
    });
  } catch (error) {
    console.error('Error fetching students list:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch student records.' }, { status: 500 });
  }
}

// POST: Register single student (requires registration_no and class_id only)
export async function POST(request, context) {
  try {
    const auth = await verifyStudentStaffAccess(request, context, 'create');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json();

    const {
      name,
      email,
      number,
      registration_no,
      roll_no,
      class_id,
      section_id,
      session_id,
      gender,
      blood_group,
      date_of_birth,
      religion,
      admission_date,
    } = body;

    if (!registration_no?.trim()) {
      return NextResponse.json({ success: false, error: 'Registration number is required.' }, { status: 400 });
    }

    if (!class_id) {
      return NextResponse.json({ success: false, error: 'Class is required.' }, { status: 400 });
    }

    const regNo = registration_no.trim();

    // Check duplicate registration_no in website_students
    const duplicateReg = await queryDb(
      `SELECT id FROM website_students WHERE website_id = $1 AND registration_no = $2 LIMIT 1`,
      [website.id, regNo]
    );
    if (duplicateReg.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: `Registration number "${regNo}" is already in use.` },
        { status: 409 }
      );
    }

    // Optional email check in website_student_info
    const cleanEmail = email?.trim() ? email.trim().toLowerCase() : null;
    if (cleanEmail) {
      const duplicateEmail = await queryDb(
        `SELECT id FROM website_student_info WHERE website_id = $1 AND LOWER(email) = $2 LIMIT 1`,
        [website.id, cleanEmail]
      );
      if (duplicateEmail.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'A student with this email address already exists.' },
          { status: 409 }
        );
      }
    }

    // Unique student identifier
    const studentUniqueId = `STU-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    // Generate random demo password (hashed, NOT NULL in website_student_info)
    const demoPassword = `${crypto.randomBytes(4).toString('hex')}S1!`;
    const hashedPassword = await hashPassword(demoPassword);

    // 64-character verification token expiring in 7 days
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 1. Insert into website_students (is_active is FALSE until setup & verification are complete)
    const insertRes = await queryDb(
      `INSERT INTO website_students (
          website_id, registration_no, roll_no, student_unique_id,
          class_id, section_id, session_id, is_active
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
       RETURNING *`,
      [
        website.id,
        regNo,
        roll_no?.trim() || null,
        studentUniqueId,
        class_id,
        section_id || null,
        session_id || null,
      ]
    );

    const newStudent = insertRes.rows[0];

    // 2. Insert into website_student_info (password NOT NULL)
    const insertInfoRes = await queryDb(
      `INSERT INTO website_student_info (
          website_id, student_id,
          name, email, number, gender, blood_group,
          date_of_birth, religion, admission_date,
          password, verification_token, verification_token_expires,
          verification_status, is_registered, is_verified
       )
       VALUES (
          $1, $2,
          $3, $4, $5, $6, $7,
          $8, $9, COALESCE($10, CURRENT_DATE),
          $11, $12, $13,
          'pending_setup', FALSE, FALSE
       )
       RETURNING *`,
      [
        website.id,
        newStudent.id,
        name?.trim() || null,
        cleanEmail,
        number?.trim() || null,
        gender || null,
        blood_group || null,
        date_of_birth || null,
        religion || null,
        admission_date || null,
        hashedPassword,
        verificationToken,
        tokenExpires,
      ]
    );

    const newInfo = insertInfoRes.rows[0];

    // Build multi-tenant setup link
    const setupUrl = buildStudentSetupUrl(website, verificationToken, request);

    // Dispatch setup email via Brevo only if email is provided
    let emailSent = false;
    let emailError = null;

    if (cleanEmail) {
      try {
        const emailHtml = buildStyledEmail({
          title: `Welcome to ${website.name || 'Institutional Portal'}`,
          preheader: `Complete your student account setup and enrollment credentials.`,
          websiteName: website.name || 'Educational Management Platform',
          bodyContent: `
            <p>Dear <strong>${newInfo.name || 'Student'}</strong>,</p>
            <p>You have been registered as a student at <strong>${website.name || 'our institution'}</strong>. Please finalize your enrollment and set your permanent account password by clicking the button below.</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin: 16px 0; font-size: 13px;">
              <p style="margin: 0 0 6px 0;"><strong>Registration Number:</strong> <span style="font-family: monospace;">${newStudent.registration_no}</span></p>
              <p style="margin: 0 0 6px 0;"><strong>Student Unique ID:</strong> <span style="font-family: monospace;">${newStudent.student_unique_id}</span></p>
              <p style="margin: 0;"><strong>Initial Demo Password:</strong> <span style="font-family: monospace; color: #475569;">${demoPassword}</span></p>
            </div>
            <p style="font-size: 13px; color: #64748b;">Once you submit your profile details, our administration will review and verify your account for Student Portal access.</p>
          `,
          ctaButton: {
            label: 'Setup Student Account →',
            url: setupUrl,
          },
        });

        await sendEmail({
          to: cleanEmail,
          toName: newInfo.name || 'Student',
          subject: `Complete Your Student Account Setup - ${website.name || 'Portal'}`,
          html: emailHtml,
          websiteId: website.id,
        });

        emailSent = true;
      } catch (err) {
        console.warn('Failed to send student setup email via Brevo:', err.message);
        emailError = err.message;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Student registered successfully!${
        emailSent ? ' Setup invitation link dispatched to ' + cleanEmail + '.' : ''
      }`,
      payload: {
        student: { ...newStudent, ...newInfo },
        setupUrl,
        demoPassword,
        emailSent,
        emailError,
      },
    });
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json({ success: false, error: 'Internal server error while creating student.' }, { status: 500 });
  }
}

// PUT: Update student record (basic, academic, address, guardian, dropout status, or bulk migration)
export async function PUT(request, context) {
  try {
    const auth = await verifyStudentStaffAccess(request, context, 'edit');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json();

    // Bulk migration
    if (body.action === 'migrate' && Array.isArray(body.student_ids) && body.student_ids.length > 0) {
      const { student_ids, target_session_id, target_class_id, target_section_id } = body;
      const updateParams = [website.id, student_ids];
      const updates = [];
      let pIdx = 3;

      if (target_session_id) {
        updates.push(`session_id = $${pIdx++}`);
        updateParams.push(target_session_id);
      }
      if (target_class_id) {
        updates.push(`class_id = $${pIdx++}`);
        updateParams.push(target_class_id);
      }
      if (target_section_id !== undefined) {
        updates.push(`section_id = $${pIdx++}`);
        updateParams.push(target_section_id || null);
      }
      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      await queryDb(
        `UPDATE website_students
         SET ${updates.join(', ')}
         WHERE website_id = $1 AND id = ANY($2::bigint[])`,
        updateParams
      );

      return NextResponse.json({
        success: true,
        message: `Successfully migrated ${student_ids.length} students.`,
      });
    }

    // Toggle drop out / active status
    if (body.action === 'toggle_dropout' || body.action === 'toggle_active') {
      const { student_id, is_active } = body;
      if (!student_id) {
        return NextResponse.json({ success: false, error: 'Student ID is required.' }, { status: 400 });
      }

      await queryDb(
        `UPDATE website_students
         SET is_active = $1, updated_at = CURRENT_TIMESTAMP
         WHERE website_id = $2 AND id = $3`,
        [Boolean(is_active), website.id, student_id]
      );

      return NextResponse.json({
        success: true,
        message: `Student status updated to ${is_active ? 'Active' : 'Dropped Out'}.`,
      });
    }

    // Single student profile update
    const studentId = body.id || body.student_id;
    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Student ID is required.' }, { status: 400 });
    }

    // Academic Fields in website_students
    const sFields = [];
    const sValues = [website.id, studentId];
    let sIdx = 3;

    if (body.roll_no !== undefined) {
      sFields.push(`roll_no = $${sIdx++}`);
      sValues.push(body.roll_no?.trim() || null);
    }
    if (body.class_id !== undefined) {
      sFields.push(`class_id = $${sIdx++}`);
      sValues.push(body.class_id || null);
    }
    if (body.section_id !== undefined) {
      sFields.push(`section_id = $${sIdx++}`);
      sValues.push(body.section_id || null);
    }
    if (body.session_id !== undefined) {
      sFields.push(`session_id = $${sIdx++}`);
      sValues.push(body.session_id || null);
    }
    if (body.is_active !== undefined) {
      sFields.push(`is_active = $${sIdx++}`);
      sValues.push(Boolean(body.is_active));
    }

    if (sFields.length > 0) {
      sFields.push(`updated_at = CURRENT_TIMESTAMP`);
      await queryDb(
        `UPDATE website_students SET ${sFields.join(', ')} WHERE website_id = $1 AND id = $2`,
        sValues
      );
    }

    // Personal & Info fields in website_student_info
    const iFields = [];
    const iValues = [website.id, studentId];
    let iIdx = 3;

    if (body.name !== undefined) {
      iFields.push(`name = $${iIdx++}`);
      iValues.push(body.name?.trim() || null);
    }
    if (body.email !== undefined) {
      iFields.push(`email = $${iIdx++}`);
      iValues.push(body.email?.trim()?.toLowerCase() || null);
    }
    if (body.number !== undefined) {
      iFields.push(`number = $${iIdx++}`);
      iValues.push(body.number?.trim() || null);
    }
    if (body.gender !== undefined) {
      iFields.push(`gender = $${iIdx++}`);
      iValues.push(body.gender || null);
    }
    if (body.blood_group !== undefined) {
      iFields.push(`blood_group = $${iIdx++}`);
      iValues.push(body.blood_group || null);
    }
    if (body.date_of_birth !== undefined) {
      iFields.push(`date_of_birth = $${iIdx++}`);
      iValues.push(body.date_of_birth || null);
    }
    if (body.religion !== undefined) {
      iFields.push(`religion = $${iIdx++}`);
      iValues.push(body.religion || null);
    }

    if (iFields.length > 0) {
      iFields.push(`updated_at = CURRENT_TIMESTAMP`);
      await queryDb(
        `UPDATE website_student_info SET ${iFields.join(', ')} WHERE website_id = $1 AND student_id = $2`,
        iValues
      );
    }

    // Address upsert
    if (body.address) {
      const a = body.address;
      await queryDb(
        `INSERT INTO website_student_addresses (
            website_id, student_id, present_address, permanent_address,
            city, district, upazila, postal_code, country, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
         ON CONFLICT (student_id)
         DO UPDATE SET
            present_address = EXCLUDED.present_address,
            permanent_address = EXCLUDED.permanent_address,
            city = EXCLUDED.city,
            district = EXCLUDED.district,
            upazila = EXCLUDED.upazila,
            postal_code = EXCLUDED.postal_code,
            country = EXCLUDED.country,
            updated_at = CURRENT_TIMESTAMP`,
        [
          website.id,
          studentId,
          a.present_address || null,
          a.permanent_address || null,
          a.city || null,
          a.district || null,
          a.upazila || null,
          a.postal_code || null,
          a.country || 'Bangladesh',
        ]
      );
    }

    // Guardian upsert
    if (body.guardian) {
      const g = body.guardian;
      await queryDb(
        `INSERT INTO website_student_guardians (
            website_id, student_id, father_name, father_phone, father_nid, father_occupation,
            mother_name, mother_phone, mother_nid, mother_occupation,
            guardian_name, guardian_relation, guardian_phone, guardian_email, guardian_address,
            updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
         ON CONFLICT (student_id)
         DO UPDATE SET
            father_name = EXCLUDED.father_name,
            father_phone = EXCLUDED.father_phone,
            father_nid = EXCLUDED.father_nid,
            father_occupation = EXCLUDED.father_occupation,
            mother_name = EXCLUDED.mother_name,
            mother_phone = EXCLUDED.mother_phone,
            mother_nid = EXCLUDED.mother_nid,
            mother_occupation = EXCLUDED.mother_occupation,
            guardian_name = EXCLUDED.guardian_name,
            guardian_relation = EXCLUDED.guardian_relation,
            guardian_phone = EXCLUDED.guardian_phone,
            guardian_email = EXCLUDED.guardian_email,
            guardian_address = EXCLUDED.guardian_address,
            updated_at = CURRENT_TIMESTAMP`,
        [
          website.id,
          studentId,
          g.father_name || null,
          g.father_phone || null,
          g.father_nid || null,
          g.father_occupation || null,
          g.mother_name || null,
          g.mother_phone || null,
          g.mother_nid || null,
          g.mother_occupation || null,
          g.guardian_name || null,
          g.guardian_relation || null,
          g.guardian_phone || null,
          g.guardian_email || null,
          g.guardian_address || null,
        ]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Student record updated successfully.',
    });
  } catch (error) {
    console.error('Error updating student record:', error);
    return NextResponse.json({ success: false, error: 'Failed to update student record.' }, { status: 500 });
  }
}

// DELETE: Delete student record(s)
export async function DELETE(request, context) {
  try {
    const auth = await verifyStudentStaffAccess(request, context, 'delete');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json().catch(() => ({}));
    const studentIds = body.student_ids || (id ? [id] : []);

    if (studentIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Student ID(s) required for deletion.' }, { status: 400 });
    }

    await queryDb(
      `DELETE FROM website_students
       WHERE website_id = $1 AND id = ANY($2::bigint[])`,
      [website.id, studentIds]
    );

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${studentIds.length} student record(s).`,
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete student record(s).' }, { status: 500 });
  }
}
