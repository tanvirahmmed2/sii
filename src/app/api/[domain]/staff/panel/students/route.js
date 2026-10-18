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
    const departmentId = searchParams.get('department_id');
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
                s.department_id, s.class_id, s.section_id, s.session_id, s.is_active,
                s.created_at, s.updated_at,
                COALESCE(s.email, i.email) AS email, s.email AS registered_email,
                i.name, i.number, i.gender, i.blood_group,
                i.date_of_birth, i.religion, i.admission_date,
                i.is_registered, i.is_verified, i.verification_status,
                i.verification_token, i.verification_notes, i.rejection_reason, i.verified_at,
                dept.name AS department_name,
                c.name AS class_name, c.code AS class_code,
                sec.name AS section_name,
                ses.name AS session_name,
                st.name AS verified_by_staff_name
         FROM website_students s
         LEFT JOIN website_student_info i ON s.id = i.student_id
         LEFT JOIN website_departments dept ON s.department_id = dept.id
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

    if (departmentId) {
      conditions.push(`s.department_id = $${pIdx++}`);
      values.push(departmentId);
    }

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

    // Fetch roster with full student, guardian, and address details in one row
    const rosterQuery = `
      SELECT s.id, s.website_id, s.registration_no, s.roll_no, s.student_unique_id,
             s.department_id, s.class_id, s.section_id, s.session_id, s.is_active,
             s.created_at, s.updated_at,
             COALESCE(s.email, i.email) AS email, s.email AS registered_email,
             COALESCE(i.name, s.name) AS name,
             COALESCE(i.number, s.number) AS number,
             COALESCE(i.gender, s.gender) AS gender,
             COALESCE(i.blood_group, s.blood_group) AS blood_group,
             COALESCE(i.date_of_birth, s.date_of_birth) AS date_of_birth,
             COALESCE(i.religion, s.religion) AS religion,
             COALESCE(i.admission_date, s.admission_date) AS admission_date,
             COALESCE(i.is_registered, s.is_registered) AS is_registered,
             COALESCE(i.is_verified, s.is_verified) AS is_verified,
             COALESCE(i.verification_status, s.verification_status, 'pending_setup') AS verification_status,
             i.verification_token, i.verification_notes,
             dept.name AS department_name,
             c.name AS class_name, c.code AS class_code,
             sec.name AS section_name,
             ses.name AS session_name,
             p.image_url AS primary_photo_url,
             g.father_name, g.father_phone, g.father_nid, g.father_occupation,
             g.mother_name, g.mother_phone, g.mother_nid, g.mother_occupation,
             g.guardian_name, g.guardian_phone, g.guardian_relation, g.guardian_email, g.guardian_address,
             addr.present_address, addr.permanent_address,
             addr.city, addr.district, addr.upazila, addr.postal_code, addr.country
      FROM website_students s
      LEFT JOIN website_student_info i ON s.id = i.student_id
      LEFT JOIN website_departments dept ON s.department_id = dept.id
      LEFT JOIN website_classes c ON s.class_id = c.id
      LEFT JOIN website_sections sec ON s.section_id = sec.id
      LEFT JOIN website_sessions ses ON s.session_id = ses.id
      LEFT JOIN website_student_guardians g ON g.student_id = s.id
      LEFT JOIN website_student_addresses addr ON addr.student_id = s.id
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

// POST: Register single student (takes only required info in website_students table: department_id, session_id, class_id, section_id, registration_no, roll_no, email)
export async function POST(request, context) {
  try {
    const auth = await verifyStudentStaffAccess(request, context, 'create');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const body = await request.json();

    const {
      department_id,
      session_id,
      class_id,
      section_id,
      registration_no,
      roll_no,
      email,
    } = body;

    if (!registration_no?.trim()) {
      return NextResponse.json({ success: false, error: 'Registration number is required.' }, { status: 400 });
    }

    if (!department_id) {
      return NextResponse.json({ success: false, error: 'Academic department is required.' }, { status: 400 });
    }

    if (!session_id) {
      return NextResponse.json({ success: false, error: 'Academic session is required.' }, { status: 400 });
    }

    if (!class_id) {
      return NextResponse.json({ success: false, error: 'Academic class is required.' }, { status: 400 });
    }

    const cleanEmail = email?.trim() ? email.trim().toLowerCase() : null;
    if (cleanEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return NextResponse.json({ success: false, error: 'Please enter a valid student email address.' }, { status: 400 });
      }

      // Check duplicate email in website_students
      const duplicateEmail = await queryDb(
        `SELECT id FROM website_students WHERE website_id = $1 AND LOWER(email) = $2 LIMIT 1`,
        [website.id, cleanEmail]
      );
      if (duplicateEmail.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: `A student with email "${cleanEmail}" already exists in this institution.` },
          { status: 409 }
        );
      }
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

    // Unique student identifier
    const studentUniqueId = `STU-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    // Insert only required information into website_students table
    const insertRes = await queryDb(
      `INSERT INTO website_students (
          website_id, department_id, session_id, class_id, section_id,
          registration_no, roll_no, email, student_unique_id, is_active
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE)
       RETURNING *`,
      [
        website.id,
        parseInt(department_id, 10),
        parseInt(session_id, 10),
        parseInt(class_id, 10),
        section_id ? parseInt(section_id, 10) : null,
        regNo,
        roll_no?.trim() || null,
        cleanEmail,
        studentUniqueId,
      ]
    );

    const newStudent = insertRes.rows[0];

    // If student email is provided, send invitation to setup account via website mailer
    if (cleanEmail) {
      try {
        const setupUrl = `/auth/student/setup`;
        const emailHtml = buildStyledEmail({
          title: `Welcome to ${website.name || 'Student Portal'}`,
          recipientName: 'Student',
          paragraphs: [
            `You have been registered at <strong>${website.name || 'our institution'}</strong>.`,
            `Your Registration Number: <strong>${newStudent.registration_no}</strong>`,
            `Please visit the student setup page to verify your email and configure your account password and profile details.`,
          ],
          buttonText: 'Setup Student Account',
          buttonUrl: setupUrl,
          footerNote: 'If you did not expect this message, please contact your school administration.'
        });

        await sendEmail({
          to: cleanEmail,
          toName: 'Student',
          subject: `Student Account Setup - ${website.name || 'Portal'}`,
          html: emailHtml,
          websiteId: website.id,
        });
      } catch (mailErr) {
        console.warn('Mail dispatch warning on registration:', mailErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Student registered successfully in website_students table. Student can now setup account at /auth/student/setup.',
      payload: {
        student: newStudent,
        setupUrl: `/auth/student/setup`,
      },
    });
  } catch (error) {
    console.error('Error registering student:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to register student.' }, { status: 500 });
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

      // Synchronize with website_student_exits
      if (!is_active) {
        const stuInfo = await queryDb(
          `SELECT class_id, section_id, session_id FROM website_students WHERE website_id = $1 AND id = $2`,
          [website.id, student_id]
        );
        const sRow = stuInfo.rows[0];
        const staffId = auth.staffSession?.id || auth.staffSession?.staff?.id || null;
        await queryDb(
          `INSERT INTO website_student_exits (
             website_id, student_id, exit_type, exit_date, reason,
             last_class_id, last_section_id, last_session_id, recorded_by_staff_id
           )
           VALUES ($1, $2, 'dropped_out', CURRENT_DATE, $3, $4, $5, $6, $7)`,
          [
            website.id,
            student_id,
            body.reason || 'Marked as dropped out from Dropout Desk',
            sRow?.class_id || null,
            sRow?.section_id || null,
            sRow?.session_id || null,
            staffId,
          ]
        );
      } else {
        await queryDb(
          `DELETE FROM website_student_exits WHERE website_id = $1 AND student_id = $2 AND exit_type = 'dropped_out'`,
          [website.id, student_id]
        );
      }

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

    // Academic & Core Fields in website_students
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

    let cleanUpdateEmail = undefined;
    if (body.email !== undefined) {
      cleanUpdateEmail = body.email?.trim() ? body.email.trim().toLowerCase() : null;
      if (cleanUpdateEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanUpdateEmail)) {
          return NextResponse.json({ success: false, error: 'Please enter a valid student email address.' }, { status: 400 });
        }
        const dup = await queryDb(
          `SELECT s.id FROM website_students s
           LEFT JOIN website_student_info i ON s.id = i.student_id
           WHERE s.website_id = $1 AND s.id != $2 AND (LOWER(s.email) = $3 OR LOWER(i.email) = $3)
           LIMIT 1`,
          [website.id, studentId, cleanUpdateEmail]
        );
        if (dup.rows.length > 0) {
          return NextResponse.json(
            { success: false, error: `Email "${cleanUpdateEmail}" is already in use by another student.` },
            { status: 409 }
          );
        }
      }
      sFields.push(`email = $${sIdx++}`);
      sValues.push(cleanUpdateEmail);
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
    if (cleanUpdateEmail !== undefined) {
      iFields.push(`email = $${iIdx++}`);
      iValues.push(cleanUpdateEmail);
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

    // Media: Student Picture upsert
    if (body.image_url !== undefined && body.image_url?.trim()) {
      await queryDb(
        `INSERT INTO website_student_pictures (website_id, student_id, image_url, is_primary)
         VALUES ($1, $2, $3, TRUE)`,
        [website.id, studentId, body.image_url.trim()]
      );
    }

    // Media: Student Signature upsert
    if (body.signature_url !== undefined && body.signature_url?.trim()) {
      await queryDb(
        `INSERT INTO website_student_signatures (website_id, student_id, signature_url, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (student_id)
         DO UPDATE SET signature_url = EXCLUDED.signature_url, updated_at = CURRENT_TIMESTAMP`,
        [website.id, studentId, body.signature_url.trim()]
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
