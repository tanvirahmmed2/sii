import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { verifyStaffPaymentAccess } from 'src/lib/database/paymentGateways.js';
import { hashPassword } from 'src/lib/middleware/students.js';

export const dynamic = 'force-dynamic';

/**
 * Registers a selected applicant into website_students and website_student_info
 * and associated addresses, guardians, and media tables.
 */
export async function enrollSelectedApplicant({ websiteId, circular, applicant, meritPosition }) {
  try {
    const currentYear = new Date().getFullYear();
    const cleanEmail = applicant.email ? applicant.email.toLowerCase().trim() : '';

    // Check if student with this email already exists in website_students for this website
    let studentId = applicant.enrolled_student_id;

    if (!studentId && cleanEmail) {
      const existingStudent = await queryDb(
        `SELECT id FROM website_students WHERE website_id = $1 AND LOWER(email) = $2 LIMIT 1`,
        [websiteId, cleanEmail]
      );
      if (existingStudent.rows.length > 0) {
        studentId = existingStudent.rows[0].id;
      }
    }

    if (!studentId) {
      // Generate unique registration_no (without REG prefix) and student_unique_id
      const regSeq = 1000 + parseInt(applicant.id, 10);
      let regNo = `${currentYear}${regSeq}`;
      let counter = 0;
      while (true) {
        const check = await queryDb(
          `SELECT id FROM website_students WHERE website_id = $1 AND LOWER(TRIM(registration_no)) = LOWER(TRIM($2)) LIMIT 1`,
          [websiteId, regNo]
        );
        if (check.rows.length === 0) break;
        counter++;
        regNo = `${currentYear}${regSeq + counter}`;
      }
      const studentUniqueId = `STU${currentYear}${regSeq}`;
      const rollNo = applicant.roll_no || applicant.exam_roll || String(meritPosition || regSeq);

      const newStudentRes = await queryDb(
        `INSERT INTO website_students (
          website_id, department_id, class_id, session_id,
          registration_no, roll_no, email, student_unique_id, is_active
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8, FALSE
        )
        ON CONFLICT (website_id, registration_no) DO UPDATE SET
          roll_no = EXCLUDED.roll_no,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id`,
        [
          websiteId,
          circular.department_id || null,
          circular.class_id || null,
          circular.session_id || null,
          regNo,
          rollNo,
          cleanEmail || null,
          studentUniqueId
        ]
      );
      studentId = newStudentRes.rows[0].id;

      // Temporary hashed password for initial setup
      const initialHashedPassword = await hashPassword(`Student@${applicant.id}!`);

      // Insert modular website_student_info
      const studentInfoData = {
        name: applicant.applicant_name,
        email: cleanEmail || null,
        number: applicant.phone || null,
        ...(applicant.info_data || {})
      };
      await queryDb(
        `INSERT INTO website_student_info (
          website_id, student_id, data, verification_status, is_registered, updated_at
        ) VALUES (
          $1, $2, $3, 'pending_setup', FALSE, CURRENT_TIMESTAMP
        )
        ON CONFLICT (student_id) DO UPDATE SET
          data = website_student_info.data || EXCLUDED.data,
          updated_at = CURRENT_TIMESTAMP`,
        [websiteId, studentId, JSON.stringify(studentInfoData)]
      );

      // Insert modular website_student_addresses
      const studentAddrData = {
        ...(applicant.address_data || {})
      };
      await queryDb(
        `INSERT INTO website_student_addresses (
          website_id, student_id, data, updated_at
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (student_id) DO UPDATE SET
          data = website_student_addresses.data || EXCLUDED.data,
          updated_at = CURRENT_TIMESTAMP`,
        [websiteId, studentId, JSON.stringify(studentAddrData)]
      );

      // Insert modular website_student_guardians
      const studentGuardData = {
        ...(applicant.guardian_data || {})
      };
      await queryDb(
        `INSERT INTO website_student_guardians (
          website_id, student_id, data, updated_at
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (student_id) DO UPDATE SET
          data = website_student_guardians.data || EXCLUDED.data,
          updated_at = CURRENT_TIMESTAMP`,
        [websiteId, studentId, JSON.stringify(studentGuardData)]
      );

      // Insert picture if available
      if (applicant.photo_url) {
        await queryDb(
          `INSERT INTO website_student_pictures (
            website_id, student_id, image_url, image_id, is_primary
          ) VALUES ($1, $2, $3, $4, TRUE)
          ON CONFLICT DO NOTHING`,
          [websiteId, studentId, applicant.photo_url, applicant.photo_id || null]
        );
      }

      // Insert signature if available
      if (applicant.signature_url) {
        await queryDb(
          `INSERT INTO website_student_signatures (
            website_id, student_id, signature_url, signature_id
          ) VALUES ($1, $2, $3, $4)
          ON CONFLICT (student_id) DO UPDATE SET
            signature_url = EXCLUDED.signature_url,
            updated_at = CURRENT_TIMESTAMP`,
          [websiteId, studentId, applicant.signature_url, applicant.signature_id || null]
        );
      }
    }

    // Update applicant with enrolled status and student reference
    await queryDb(
      `UPDATE website_admission_applicants
       SET status = 'enrolled',
           enrolled_student_id = $1,
           enrolled_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [studentId, applicant.id]
    );

    return studentId;
  } catch (err) {
    console.error(`Error enrolling applicant ID ${applicant?.id}:`, err);
    return null;
  }
}

/**
 * Helper to auto-publish results for any circular whose result_date has arrived
 */
export async function autoPublishDueResults(websiteId) {
  try {
    const dueRes = await queryDb(`
      SELECT a.id, a.title, a.department_id, a.class_id, a.session_id
      FROM website_admissions a
      WHERE a.website_id = $1 
        AND a.result_date IS NOT NULL 
        AND a.result_date <= CURRENT_DATE
        AND a.is_result_published = FALSE
    `, [websiteId]);

    for (const circ of dueRes.rows) {
      // 1. Fetch candidates with status = 'selected' or 'accepted'
      const selRes = await queryDb(`
        SELECT a.id, a.application_no, a.exam_roll, a.roll_no, a.applicant_name, a.score,
               a.selection_notes, a.email, a.phone,
               inf.data AS info_data,
               g.data AS guardian_data,
               addr.data AS address_data,
               a.enrolled_student_id,
               img.photo_url,
               img.photo_public_id,
               img.signature_url,
               img.signature_public_id
        FROM website_admission_applicants a
        LEFT JOIN website_admission_applicant_info inf ON inf.applicant_id = a.id
        LEFT JOIN website_admission_applicant_guardians g ON g.applicant_id = a.id
        LEFT JOIN website_admission_applicant_addresses addr ON addr.applicant_id = a.id
        LEFT JOIN website_admission_applicant_images img ON img.applicant_id = a.id
        WHERE a.website_id = $1 AND a.admission_id = $2 AND a.status IN ('selected', 'accepted', 'enrolled')
        ORDER BY a.score DESC NULLS LAST, a.created_at ASC
      `, [websiteId, circ.id]);

      let merit = 1;
      for (const cand of selRes.rows) {
        await queryDb(`
          INSERT INTO website_admission_results (
            website_id, admission_id, applicant_id, roll_no, applicant_name,
            merit_position, score, selection_status, remarks, is_published, published_at
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, 'selected', $8, true, CURRENT_TIMESTAMP
          )
          ON CONFLICT (admission_id, applicant_id) DO UPDATE SET
            roll_no = EXCLUDED.roll_no,
            applicant_name = EXCLUDED.applicant_name,
            score = EXCLUDED.score,
            merit_position = EXCLUDED.merit_position,
            is_published = true,
            updated_at = CURRENT_TIMESTAMP
        `, [
          websiteId,
          circ.id,
          cand.id,
          cand.roll_no || cand.exam_roll || `ROL-${cand.id}`,
          cand.applicant_name,
          merit,
          cand.score || 0.00,
          cand.selection_notes || 'Selected in Official Merit Intake'
        ]);

        // Auto-enroll into website_students & website_student_info
        await enrollSelectedApplicant({
          websiteId,
          circular: circ,
          applicant: cand,
          meritPosition: merit
        });

        merit++;
      }

      // Mark circular results as published
      await queryDb(`
        UPDATE website_admissions
        SET is_result_published = TRUE,
            result_published_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND website_id = $2
      `, [circ.id, websiteId]);
    }
  } catch (err) {
    console.error('Error auto-publishing due results:', err);
  }
}

/**
 * POST /api/[domain]/staff/panel/admissions/results/publish
 * Publishes admission results for accepted/selected students,
 * registers candidates into website_students and website_student_info,
 * and updates circular is_result_published to TRUE.
 */
export async function POST(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const admission_id = body.admission_id || body.circular_id;
    const { remarks_template = 'Selected in Official Merit Intake' } = body;

    if (!admission_id) {
      return NextResponse.json({ success: false, error: 'admission_id or circular_id is required.' }, { status: 400 });
    }

    const admId = parseInt(admission_id, 10);

    // Verify circular belongs to this website
    const admCheck = await queryDb(`
      SELECT id, title, department_id, class_id, session_id
      FROM website_admissions
      WHERE id = $1 AND website_id = $2
    `, [admId, auth.website.id]);

    if (admCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Admission circular not found.' }, { status: 404 });
    }

    const circular = admCheck.rows[0];
    const staffId = auth.user?.id || null;

    // 1. Fetch only candidates with status = 'selected', 'accepted', or already 'enrolled'
    const selectedRes = await queryDb(`
      SELECT a.id, a.application_no, a.exam_roll, a.roll_no, a.applicant_name, a.score,
             a.selection_notes, a.email, a.phone,
             inf.data AS info_data,
             g.data AS guardian_data,
             addr.data AS address_data,
             a.enrolled_student_id,
             img.photo_url,
             img.photo_public_id,
             img.signature_url,
             img.signature_public_id
      FROM website_admission_applicants a
      LEFT JOIN website_admission_applicant_info inf ON inf.applicant_id = a.id
      LEFT JOIN website_admission_applicant_guardians g ON g.applicant_id = a.id
      LEFT JOIN website_admission_applicant_addresses addr ON addr.applicant_id = a.id
      LEFT JOIN website_admission_applicant_images img ON img.applicant_id = a.id
      WHERE a.website_id = $1 AND a.admission_id = $2 AND a.status IN ('selected', 'accepted', 'enrolled')
      ORDER BY a.score DESC NULLS LAST, a.created_at ASC
    `, [auth.website.id, admId]);

    if (selectedRes.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No accepted/selected candidates found for this circular. Please select candidates before publishing results.'
      }, { status: 400 });
    }

    // 2. Clear stale results for this circular
    await queryDb(`
      DELETE FROM website_admission_results
      WHERE website_id = $1 AND admission_id = $2
    `, [auth.website.id, admId]);

    // 3. Insert each selected candidate into website_admission_results & auto-enroll into website_students
    let merit = 1;
    let enrolledCount = 0;
    for (const cand of selectedRes.rows) {
      await queryDb(`
        INSERT INTO website_admission_results (
          website_id, admission_id, applicant_id, roll_no, applicant_name,
          merit_position, score, selection_status, remarks, is_published,
          published_by_staff_id, published_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, 'selected', $8, true,
          $9, CURRENT_TIMESTAMP
        )
      `, [
        auth.website.id,
        admId,
        cand.id,
        cand.roll_no || cand.exam_roll || `ROL-${cand.id}`,
        cand.applicant_name,
        merit,
        cand.score || 0.00,
        cand.selection_notes || remarks_template,
        staffId
      ]);

      // Auto-register candidate into database as students in website_students & website_student_info
      const enrolledStudentId = await enrollSelectedApplicant({
        websiteId: auth.website.id,
        circular,
        applicant: cand,
        meritPosition: merit
      });

      if (enrolledStudentId) {
        enrolledCount++;
      }

      merit++;
    }

    // 4. Mark circular as results published
    await queryDb(`
      UPDATE website_admissions
      SET is_result_published = TRUE,
          result_published_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND website_id = $2
    `, [admId, auth.website.id]);

    return NextResponse.json({
      success: true,
      message: `Results published for ${selectedRes.rows.length} candidates. Registered ${enrolledCount} students into website_students.`,
      published_count: selectedRes.rows.length,
      enrolled_count: enrolledCount,
      circular: circular
    });
  } catch (error) {
    console.error('Error in POST /staff/panel/admissions/results/publish:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/[domain]/staff/panel/admissions/results/publish?admission_id=...
 */
export async function GET(request, context) {
  try {
    const auth = await verifyStaffPaymentAccess(request, context);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    // Trigger auto-publish for any circulars whose result_date has arrived
    await autoPublishDueResults(auth.website.id);

    const { searchParams } = new URL(request.url);
    const admissionId = searchParams.get('admission_id') || searchParams.get('circular_id');

    let sql = `
      SELECT r.*, a.email, a.phone, a.application_no, a.exam_roll,
             a.status AS applicant_status, a.enrolled_student_id,
             adm.title AS circular_title, adm.is_result_published, adm.result_published_at
      FROM website_admission_results r
      JOIN website_admission_applicants a ON a.id = r.applicant_id
      JOIN website_admissions adm ON adm.id = r.admission_id
      WHERE r.website_id = $1
    `;
    const params = [auth.website.id];

    if (admissionId) {
      sql += ` AND r.admission_id = $2`;
      params.push(parseInt(admissionId, 10));
    }

    sql += ` ORDER BY r.merit_position ASC NULLS LAST, r.score DESC`;

    const res = await queryDb(sql, params);

    return NextResponse.json({
      success: true,
      results: res.rows
    });
  } catch (error) {
    console.error('Error in GET /staff/panel/admissions/results/publish:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
