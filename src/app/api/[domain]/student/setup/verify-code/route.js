import { NextResponse } from 'next/server';
import { queryDb, pool } from 'src/lib/database/db.js';
import { withTenantTransaction } from '@/lib/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { hashPassword } from 'src/lib/middleware/students.js';
import { validateSubmissionPayload } from '@/lib/form-criteria-engine';

export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token')?.trim();
    const email = searchParams.get('email')?.trim();
    const registrationNo = searchParams.get('registration_no')?.trim();
    const studentId = searchParams.get('student_id')?.trim();

    if (!token && !email && !registrationNo && !studentId) {
      return NextResponse.json({
        success: false,
        error: 'Setup identifier (token, email, student_id, or registration_no) is required.'
      }, { status: 400 });
    }

    const studentRes = await queryDb(`
      SELECT s.id, s.website_id, s.registration_no, s.roll_no, s.student_unique_id,
             s.class_id, s.section_id, s.session_id, s.department_id,
             s.name, s.email, s.phone, s.number, s.gender, s.blood_group,
             s.date_of_birth, s.religion, s.is_active, s.is_verified,
             s.verification_token, s.verification_token_expires,
             i.data AS info_data,
             i.admission_snapshot,
             COALESCE(i.verification_status, s.verification_status, 'pending_setup') AS verification_status,
             COALESCE(i.is_registered, s.is_registered, FALSE) AS is_registered,
             c.name AS class_name, sec.name AS section_name, ses.name AS session_name,
             d.name AS department_name
      FROM website_students s
      LEFT JOIN website_student_info i ON i.student_id = s.id
      LEFT JOIN website_classes c ON s.class_id = c.id
      LEFT JOIN website_sections sec ON s.section_id = sec.id
      LEFT JOIN website_sessions ses ON s.session_id = ses.id
      LEFT JOIN website_departments d ON s.department_id = d.id
      WHERE s.website_id = $1
        AND (
          ($2::text IS NOT NULL AND s.verification_token = $2) OR
          ($3::text IS NOT NULL AND LOWER(TRIM(COALESCE(s.email, i.data->>'email'))) = LOWER(TRIM($3))) OR
          ($4::text IS NOT NULL AND (s.registration_no = $4 OR s.roll_no = $4 OR s.student_unique_id = $4)) OR
          ($5::bigint IS NOT NULL AND s.id = $5)
        )
      LIMIT 1
    `, [
      website.id,
      token || null,
      email || null,
      registrationNo || null,
      studentId ? parseInt(studentId, 10) : null
    ]);

    if (studentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student record not found.' }, { status: 404 });
    }

    const student = studentRes.rows[0];

    const [fieldsRes, addrRes, guardRes, picRes, sigRes] = await Promise.all([
      queryDb(`
        SELECT id AS form_field_id, target_scope, field_key, label, field_type,
               options, validation_regex, is_unique, is_editable_by_student,
               carry_over_to_student,
               (is_required_in_student OR is_required) AS is_required,
               placeholder, help_text, section, sort_order
        FROM website_form_fields
        WHERE website_id = $1
          AND is_visible_in_student = TRUE
          AND is_active = TRUE
        ORDER BY sort_order ASC, id ASC
      `, [website.id]),
      queryDb(`SELECT * FROM website_student_addresses WHERE student_id = $1 LIMIT 1`, [student.id]),
      queryDb(`SELECT * FROM website_student_guardians WHERE student_id = $1 LIMIT 1`, [student.id]),
      queryDb(`SELECT * FROM website_student_pictures WHERE student_id = $1 ORDER BY id DESC LIMIT 1`, [student.id]),
      queryDb(`SELECT * FROM website_student_signatures WHERE student_id = $1 LIMIT 1`, [student.id])
    ]);

    return NextResponse.json({
      success: true,
      payload: {
        student: {
          id: student.id,
          registration_no: student.registration_no,
          roll_no: student.roll_no,
          student_unique_id: student.student_unique_id,
          name: student.name,
          email: student.email,
          phone: student.phone || student.number,
          gender: student.gender,
          blood_group: student.blood_group,
          date_of_birth: student.date_of_birth,
          religion: student.religion,
          class_name: student.class_name,
          section_name: student.section_name,
          session_name: student.session_name,
          department_name: student.department_name,
          is_active: student.is_active,
          is_verified: student.is_verified,
          is_registered: student.is_registered,
          verification_status: student.verification_status,
          verification_token: student.verification_token
        },
        info_data: student.info_data || {},
        admission_snapshot: student.admission_snapshot || {},
        fields: fieldsRes.rows,
        address: addrRes.rows[0] ? { ...addrRes.rows[0], ...(addrRes.rows[0].data || {}) } : null,
        guardian: guardRes.rows[0] ? { ...guardRes.rows[0], ...(guardRes.rows[0].data || {}) } : null,
        picture: picRes.rows[0] || null,
        signature: sigRes.rows[0] || null
      }
    });
  } catch (error) {
    console.error('Error fetching student setup context:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      action,
      email,
      code,
      registration_no,
      token,
      student_id,
      password,
      custom_fields = {},
      info = {},
      guardians = {},
      addresses = {},
      name,
      number,
      gender,
      blood_group,
      date_of_birth,
      religion
    } = body;

    const cleanEmail = email?.trim()?.toLowerCase() || null;
    const cleanRegNo = registration_no?.trim() || null;
    const cleanToken = token?.trim() || null;
    const targetStudentId = student_id ? parseInt(student_id, 10) : null;

    const studentRes = await queryDb(`
      SELECT s.id, s.website_id, s.registration_no, s.roll_no, s.student_unique_id,
             s.email, s.phone, s.number, s.gender, s.date_of_birth,
             s.two_factor_code, s.two_factor_expires, s.verification_token,
             s.verification_token_expires, s.is_active, s.is_verified,
             i.data AS info_data, i.admission_snapshot
      FROM website_students s
      LEFT JOIN website_student_info i ON s.id = i.student_id
      WHERE s.website_id = $1
        AND (
          ($2::text IS NOT NULL AND s.verification_token = $2) OR
          ($3::text IS NOT NULL AND LOWER(TRIM(COALESCE(s.email, i.data->>'email'))) = $3) OR
          ($4::text IS NOT NULL AND (s.registration_no = $4 OR s.roll_no = $4 OR s.student_unique_id = $4)) OR
          ($5::bigint IS NOT NULL AND s.id = $5)
        )
      LIMIT 1
    `, [website.id, cleanToken, cleanEmail, cleanRegNo, targetStudentId]);

    if (studentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student record not found.' }, { status: 404 });
    }

    const student = studentRes.rows[0];

    if (action === 'finalize' || body.finalize === true || password || Object.keys(custom_fields).length > 0 || Object.keys(info).length > 0) {
      return await withTenantTransaction(website.id, async (client) => {
        const infoRes = await client.query(
          `SELECT data, admission_snapshot FROM website_student_info WHERE student_id = $1 AND website_id = $2`,
          [student.id, website.id]
        );
        const existingData = infoRes.rows[0]?.data || {};

        const fieldsMetaRes = await client.query(`
          SELECT field_key, target_scope, is_editable_by_student, carry_over_to_student
          FROM website_form_fields
          WHERE website_id = $1
        `, [website.id]);

        const nonEditableKeys = new Set(
          fieldsMetaRes.rows
            .filter((f) => f.is_editable_by_student === false)
            .map((f) => f.field_key)
        );

        const submittedInfo = {
          ...existingData,
          ...(info && typeof info === 'object' ? info : {}),
          ...(custom_fields && typeof custom_fields === 'object' ? custom_fields : {}),
          ...(name ? { name: name.trim() } : {}),
          ...(number ? { number: number.trim() } : {}),
          ...(gender ? { gender } : {}),
          ...(blood_group ? { blood_group } : {}),
          ...(date_of_birth ? { date_of_birth } : {}),
          ...(religion ? { religion } : {})
        };

        for (const lockedKey of nonEditableKeys) {
          if (existingData[lockedKey] !== undefined) {
            submittedInfo[lockedKey] = existingData[lockedKey];
          }
        }

        const mergedPayload = {
          core: {
            date_of_birth: submittedInfo.date_of_birth || student.date_of_birth,
            gender: submittedInfo.gender || student.gender,
            name: submittedInfo.name || student.name,
            email: cleanEmail || student.email
          },
          info: submittedInfo,
          guardians: { ...(guardians || {}), ...(body.guardian_data || {}) },
          addresses: { ...(addresses || {}), ...(body.address_data || {}) }
        };

        const validation = await validateSubmissionPayload({
          clientOrPool: client,
          websiteId: website.id,
          studentId: student.id,
          mode: 'student',
          payload: mergedPayload
        });

        if (!validation.valid) {
          const valError = new Error(validation.errors[0] || 'Onboarding requirements not met.');
          valError.isValidationError = true;
          valError.errors = validation.errors;
          throw valError;
        }

        let hashedPassword = null;
        if (password) {
          if (String(password).length < 6) {
            const passErr = new Error('Password must be at least 6 characters long.');
            passErr.isValidationError = true;
            passErr.errors = ['Password must be at least 6 characters long.'];
            throw passErr;
          }
          hashedPassword = await hashPassword(String(password).trim());
        }

        await client.query(`
          INSERT INTO website_student_info (
            website_id, student_id, data, is_registered, verification_status, updated_at
          ) VALUES ($1, $2, $3, TRUE, 'submitted', CURRENT_TIMESTAMP)
          ON CONFLICT (student_id) DO UPDATE SET
            data = EXCLUDED.data,
            is_registered = TRUE,
            verification_status = 'submitted',
            updated_at = CURRENT_TIMESTAMP
        `, [website.id, student.id, JSON.stringify(submittedInfo)]);

        const studentUpdates = [
          'updated_at = CURRENT_TIMESTAMP',
          "verification_status = 'submitted'",
          'is_registered = TRUE'
        ];
        const studentParams = [student.id, website.id];
        let pIdx = 3;

        if (cleanEmail) {
          studentUpdates.push(`email = $${pIdx++}`);
          studentParams.push(cleanEmail);
        }
        if (hashedPassword) {
          studentUpdates.push(`password = $${pIdx++}`);
          studentParams.push(hashedPassword);
        }
        if (submittedInfo.name) {
          studentUpdates.push(`name = COALESCE($${pIdx++}, name)`);
          studentParams.push(submittedInfo.name);
        }

        await client.query(`
          UPDATE website_students
          SET ${studentUpdates.join(', ')}
          WHERE id = $1 AND website_id = $2
        `, studentParams);

        if (Object.keys(mergedPayload.guardians).length > 0) {
          await client.query(`
            INSERT INTO website_student_guardians (website_id, student_id, data, updated_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            ON CONFLICT (student_id) DO UPDATE SET
              data = website_student_guardians.data || EXCLUDED.data,
              updated_at = CURRENT_TIMESTAMP
          `, [website.id, student.id, JSON.stringify(mergedPayload.guardians)]);
        }

        if (Object.keys(mergedPayload.addresses).length > 0) {
          await client.query(`
            INSERT INTO website_student_addresses (website_id, student_id, data, updated_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            ON CONFLICT (student_id) DO UPDATE SET
              data = website_student_addresses.data || EXCLUDED.data,
              updated_at = CURRENT_TIMESTAMP
          `, [website.id, student.id, JSON.stringify(mergedPayload.addresses)]);
        }

        return NextResponse.json({
          success: true,
          message: 'Student profile onboarding completed and submitted for staff verification.',
          student_id: student.id,
          verification_status: 'submitted'
        });
      });
    }

    if (!code?.trim()) {
      return NextResponse.json({ success: false, error: '6-digit verification code is required.' }, { status: 400 });
    }

    const cleanCode = code.trim();
    let isCodeValid = false;

    if (student.two_factor_code && student.two_factor_code === cleanCode) {
      if (!student.two_factor_expires || new Date() <= new Date(student.two_factor_expires)) {
        isCodeValid = true;
      }
    }

    if (!isCodeValid && cleanEmail) {
      const verCheck = await queryDb(`
        SELECT id FROM website_email_verifications
        WHERE website_id = $1 AND LOWER(email) = $2 AND otp_code = $3 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        ORDER BY id DESC LIMIT 1
      `, [website.id, cleanEmail, cleanCode]);
      if (verCheck.rows.length > 0) {
        isCodeValid = true;
      }
    }

    if (!isCodeValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired verification code. Please check your email and try again.'
      }, { status: 400 });
    }

    await queryDb(`
      UPDATE website_students
      SET two_factor_code = NULL,
          two_factor_expires = NULL,
          email = COALESCE(email, $1),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND website_id = $3
    `, [cleanEmail || student.email, student.id, website.id]);

    const fieldsRes = await queryDb(`
      SELECT id AS form_field_id, target_scope, field_key, label, field_type,
             options, validation_regex, is_unique, is_editable_by_student,
             carry_over_to_student,
             (is_required_in_student OR is_required) AS is_required,
             placeholder, help_text, section, sort_order
      FROM website_form_fields
      WHERE website_id = $1
        AND is_visible_in_student = TRUE
        AND is_active = TRUE
      ORDER BY sort_order ASC, id ASC
    `, [website.id]);

    return NextResponse.json({
      success: true,
      message: 'Email address verified successfully! You may now complete your student onboarding profile.',
      payload: {
        verified: true,
        setup_token: student.verification_token || student.registration_no,
        student: {
          id: student.id,
          registration_no: student.registration_no,
          roll_no: student.roll_no,
          email: cleanEmail || student.email,
          name: student.name
        },
        info_data: student.info_data || {},
        admission_snapshot: student.admission_snapshot || {},
        fields: fieldsRes.rows
      }
    });
  } catch (error) {
    if (error.isValidationError) {
      return NextResponse.json({
        success: false,
        error: error.message,
        errors: error.errors || [error.message],
        validation_errors: error.errors || [error.message]
      }, { status: 422 });
    }

    console.error('Error in student setup verify-code:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
