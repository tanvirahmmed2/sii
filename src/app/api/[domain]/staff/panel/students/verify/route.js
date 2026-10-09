import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyStudentStaffAccess } from 'src/lib/middleware/student-auth.js';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo.js';
import { buildStudentPortalUrl, buildStudentSetupUrl } from 'src/lib/student/urls.js';

// GET: Fetch students submitted for verification with complete profile relations
export async function GET(request, context) {
  try {
    const auth = await verifyStudentStaffAccess(request, context, 'view');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status') || 'submitted'; // 'submitted', 'verified', 'rejected', 'pending_setup', 'all'
    const classId = searchParams.get('class_id');
    const sectionId = searchParams.get('section_id');
    const sessionId = searchParams.get('session_id');
    const search = searchParams.get('search')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    const conditions = ['s.website_id = $1'];
    const values = [website.id];
    let pIdx = 2;

    if (status && status !== 'all') {
      conditions.push(`i.verification_status = $${pIdx++}`);
      values.push(status);
    }

    if (sessionId) {
      conditions.push(`s.session_id = $${pIdx++}`);
      values.push(sessionId);
    }

    if (classId) {
      conditions.push(`s.class_id = $${pIdx++}`);
      values.push(classId);
    }

    if (sectionId) {
      conditions.push(`s.section_id = $${pIdx++}`);
      values.push(sectionId);
    }

    if (search) {
      conditions.push(
        `(i.name ILIKE $${pIdx} OR i.email ILIKE $${pIdx} OR s.registration_no ILIKE $${pIdx} OR s.student_unique_id ILIKE $${pIdx} OR i.number ILIKE $${pIdx})`
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

    const query = `
      SELECT s.id, s.website_id, s.registration_no, s.roll_no, s.student_unique_id,
             s.class_id, s.section_id, s.session_id, s.is_active,
             s.created_at, s.updated_at,
             i.name, i.email, i.number, i.gender, i.blood_group, i.date_of_birth,
             i.religion, i.admission_date, i.is_registered, i.is_verified,
             i.verification_status, i.verification_notes, i.verification_token,
             i.verified_at, i.rejection_reason,
             c.name AS class_name, c.code AS class_code,
             sec.name AS section_name,
             ses.name AS session_name,
             st.name AS verified_by_staff_name,
             -- Address
             addr.present_address, addr.permanent_address, addr.city, addr.district,
             addr.upazila, addr.postal_code, addr.country,
             -- Guardian
             g.father_name, g.father_phone, g.father_nid, g.father_occupation,
             g.mother_name, g.mother_phone, g.mother_nid, g.mother_occupation,
             g.guardian_name, g.guardian_relation, g.guardian_phone, g.guardian_email, g.guardian_address,
             -- Pictures & Signature
             p.image_url AS photo_url,
             sig.signature_url
      FROM website_students s
      LEFT JOIN website_student_info i ON s.id = i.student_id
      LEFT JOIN website_classes c ON s.class_id = c.id
      LEFT JOIN website_sections sec ON s.section_id = sec.id
      LEFT JOIN website_sessions ses ON s.session_id = ses.id
      LEFT JOIN website_staffs st ON i.verified_by_staff_id = st.id
      LEFT JOIN website_student_addresses addr ON s.id = addr.student_id
      LEFT JOIN website_student_guardians g ON s.id = g.student_id
      LEFT JOIN LATERAL (
        SELECT image_url FROM website_student_pictures
        WHERE student_id = s.id AND is_primary = TRUE
        LIMIT 1
      ) p ON true
      LEFT JOIN website_student_signatures sig ON s.id = sig.student_id
      WHERE ${whereClause}
      ORDER BY
        CASE WHEN i.verification_status = 'submitted' THEN 1 ELSE 2 END,
        s.updated_at DESC
      LIMIT $${pIdx++} OFFSET $${pIdx++}
    `;

    const res = await queryDb(query, [...values, limit, offset]);

    // Counter stats
    const statsRes = await queryDb(
      `SELECT
         COUNT(*) FILTER (WHERE i.verification_status = 'submitted')::int AS submitted_count,
         COUNT(*) FILTER (WHERE i.verification_status = 'verified')::int AS verified_count,
         COUNT(*) FILTER (WHERE i.verification_status = 'rejected')::int AS rejected_count,
         COUNT(*) FILTER (WHERE i.verification_status = 'pending_setup')::int AS pending_setup_count,
         COUNT(*)::int AS total_count
       FROM website_students s
       LEFT JOIN website_student_info i ON s.id = i.student_id
       WHERE s.website_id = $1`,
      [website.id]
    );

    return NextResponse.json({
      success: true,
      payload: {
        students: res.rows,
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
    console.error('Error fetching students for verification:', error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve students for verification.' }, { status: 500 });
  }
}

// PUT: Approve/Verify or Reject a student profile
export async function PUT(request, context) {
  try {
    const auth = await verifyStudentStaffAccess(request, context, 'edit');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website, staffSession } = auth;
    const body = await request.json();
    const { student_id, action, notes } = body;

    if (!student_id) {
      return NextResponse.json({ success: false, error: 'student_id is required.' }, { status: 400 });
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: 'action must be "approve" or "reject".' }, { status: 400 });
    }

    // Verify student exists and belongs to website
    const checkRes = await queryDb(
      `SELECT s.id, s.registration_no, s.student_unique_id,
              i.name, i.email, i.verification_token
       FROM website_students s
       LEFT JOIN website_student_info i ON s.id = i.student_id
       WHERE s.id = $1 AND s.website_id = $2
       LIMIT 1`,
      [student_id, website.id]
    );

    if (checkRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student record not found.' }, { status: 404 });
    }

    const student = checkRes.rows[0];
    const staffId = staffSession?.staff?.id || staffSession?.id || null;

    if (action === 'approve') {
      // 1. Update website_student_info
      await queryDb(
        `UPDATE website_student_info
         SET is_verified = TRUE,
             verification_status = 'verified',
             verified_by_staff_id = $1,
             verified_at = CURRENT_TIMESTAMP,
             verification_notes = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE student_id = $3 AND website_id = $4`,
        [staffId, notes || null, student_id, website.id]
      );

      // 2. Update website_students: set is_active = TRUE
      const stuUpdate = await queryDb(
        `UPDATE website_students
         SET is_active = TRUE,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND website_id = $2
         RETURNING *`,
        [student_id, website.id]
      );

      const updatedStudent = stuUpdate.rows[0];

      // Dispatch Approval Notice Email via Brevo
      if (student.email) {
        try {
          const portalUrl = buildStudentPortalUrl(website, request);
          const emailHtml = buildStyledEmail({
            title: `Account Verified! Welcome to ${website.name || 'Student Portal'}`,
            preheader: `Your profile verification has been approved. You can now access your student portal.`,
            websiteName: website.name || 'Institutional Management Portal',
            bodyContent: `
              <p>Dear <strong>${student.name || 'Student'}</strong>,</p>
              <p>Congratulations! Your student profile and enrollment credentials have been reviewed and <strong>approved</strong> by the school administration.</p>
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 14px; margin: 16px 0; font-size: 13px; color: #166534;">
                <p style="margin: 0 0 6px 0;"><strong>Registration Number:</strong> <span style="font-family: monospace;">${student.registration_no}</span></p>
                <p style="margin: 0 0 6px 0;"><strong>Status:</strong> Verified & Active</p>
                ${notes ? `<p style="margin: 0;"><strong>Staff Note:</strong> ${notes}</p>` : ''}
              </div>
              <p style="font-size: 13px; color: #475569;">You can now log in to view your classes, attendance, marks, routine, and institutional notices.</p>
            `,
            ctaButton: {
              label: 'Access Student Portal →',
              url: portalUrl,
            },
          });

          await sendEmail({
            to: student.email,
            toName: student.name || 'Student',
            subject: `Profile Approved - Student Portal Access Enabled`,
            html: emailHtml,
            websiteId: website.id,
          });
        } catch (err) {
          console.warn('Failed to send student approval email via Brevo:', err.message);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Student "${student.name || student.registration_no}" has been verified successfully.`,
        payload: { student: updatedStudent },
      });
    }

    if (action === 'reject') {
      // 1. Update website_student_info
      await queryDb(
        `UPDATE website_student_info
         SET is_verified = FALSE,
             verification_status = 'rejected',
             verified_by_staff_id = $1,
             verified_at = CURRENT_TIMESTAMP,
             verification_notes = $2,
             rejection_reason = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE student_id = $3 AND website_id = $4`,
        [staffId, notes || 'Profile rejected during staff verification.', student_id, website.id]
      );

      // 2. Update website_students: set is_active = FALSE
      const stuUpdate = await queryDb(
        `UPDATE website_students
         SET is_active = FALSE,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND website_id = $2
         RETURNING *`,
        [student_id, website.id]
      );

      const updatedStudent = stuUpdate.rows[0];

      // Dispatch Rejection Notice Email via Brevo
      if (student.email) {
        try {
          const setupUrl = buildStudentSetupUrl(website, student.verification_token, request);
          const emailHtml = buildStyledEmail({
            title: `Profile Verification Update`,
            preheader: `Changes required for your student account verification.`,
            websiteName: website.name || 'Institutional Management Portal',
            bodyContent: `
              <p>Dear <strong>${student.name || 'Student'}</strong>,</p>
              <p>Your student profile was reviewed by the school administration, and some details require correction or revision.</p>
              <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 14px; margin: 16px 0; font-size: 13px; color: #9f1239;">
                <p style="margin: 0 0 4px 0;"><strong>Status:</strong> Action Required / Rejected</p>
                <p style="margin: 0;"><strong>Review Feedback:</strong> ${notes || 'Please update your submitted details and resubmit.'}</p>
              </div>
              <p style="font-size: 13px; color: #475569;">Please click the button below to update your profile details and resubmit for verification.</p>
            `,
            ctaButton: {
              label: 'Update Student Profile →',
              url: setupUrl,
            },
          });

          await sendEmail({
            to: student.email,
            toName: student.name || 'Student',
            subject: `Student Profile Verification Notice - Action Required`,
            html: emailHtml,
            websiteId: website.id,
          });
        } catch (err) {
          console.warn('Failed to send student rejection notice email via Brevo:', err.message);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Student "${student.name || student.registration_no}" profile marked as rejected.`,
        payload: { student: updatedStudent },
      });
    }
  } catch (error) {
    console.error('Error during student verification action:', error);
    return NextResponse.json({ success: false, error: 'Internal server error processing verification.' }, { status: 500 });
  }
}
