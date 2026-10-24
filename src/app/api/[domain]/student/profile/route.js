import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { getStudentSession, comparePassword, hashPassword } from 'src/lib/middleware/students.js';

/**
 * GET /api/[domain]/student/profile
 * Retrieves full authenticated student profile with academic, guardian, address, media, and form fields.
 */
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const session = await getStudentSession(request);
    if (!session || !session.isActive || !session.isVerified) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Active verified student session required.' },
        { status: 401 }
      );
    }

    const studentRes = await queryDb(
      `SELECT s.id, s.website_id, s.registration_no, s.roll_no, s.student_unique_id,
              s.class_id, s.section_id, s.session_id, s.department_id, s.is_active,
              s.created_at, s.updated_at,
              COALESCE(s.name, i.data->>'name') AS name,
              COALESCE(s.email, i.data->>'email') AS email,
              COALESCE(s.number, i.data->>'number') AS number,
              COALESCE(s.gender, i.data->>'gender') AS gender,
              COALESCE(s.blood_group, i.data->>'blood_group') AS blood_group,
              COALESCE(s.date_of_birth, (i.data->>'date_of_birth')::date) AS date_of_birth,
              COALESCE(s.religion, i.data->>'religion') AS religion,
              COALESCE(s.admission_date, (i.data->>'admission_date')::date) AS admission_date,
              COALESCE(i.is_registered, s.is_registered) AS is_registered,
              s.is_verified,
              COALESCE(i.verification_status, s.verification_status) AS verification_status,
              i.data AS info_data,
              c.name AS class_name, c.code AS class_code,
              sec.name AS section_name,
              ses.name AS session_name,
              d.name AS department_name
       FROM website_students s
       LEFT JOIN website_student_info i ON s.id = i.student_id
       LEFT JOIN website_classes c ON s.class_id = c.id
       LEFT JOIN website_sections sec ON s.section_id = sec.id
       LEFT JOIN website_sessions ses ON s.session_id = ses.id
       LEFT JOIN website_departments d ON s.department_id = d.id
       WHERE s.id = $1 AND s.website_id = $2
       LIMIT 1`,
      [session.id, website.id]
    );

    if (studentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student record not found.' }, { status: 404 });
    }

    const student = studentRes.rows[0];

    const [addrRes, guardRes, picRes, sigRes, fieldsRes] = await Promise.all([
      queryDb(`SELECT * FROM website_student_addresses WHERE student_id = $1 LIMIT 1`, [student.id]),
      queryDb(`SELECT * FROM website_student_guardians WHERE student_id = $1 LIMIT 1`, [student.id]),
      queryDb(`SELECT * FROM website_student_pictures WHERE student_id = $1 ORDER BY is_primary DESC, id DESC LIMIT 1`, [student.id]),
      queryDb(`SELECT * FROM website_student_signatures WHERE student_id = $1 LIMIT 1`, [student.id]),
      queryDb(
        `SELECT id, field_key, field_name, label_translations, field_type, target_scope,
                options, is_required, is_visible_in_student, display_order, placeholder
         FROM website_form_fields
         WHERE website_id = $1 AND (is_visible_in_student = TRUE OR is_visible_in_student IS NULL)
         ORDER BY display_order ASC, id ASC`,
        [website.id]
      ),
    ]);

    const address = addrRes.rows[0] ? { ...addrRes.rows[0], ...(addrRes.rows[0].data || {}) } : null;
    const guardian = guardRes.rows[0] ? { ...guardRes.rows[0], ...(guardRes.rows[0].data || {}) } : null;
    const picture = picRes.rows[0] || null;
    const signature = sigRes.rows[0] || null;

    const enrichedStudent = {
      ...student,
      registration_number: student.registration_no,
      roll: student.roll_no,
      phone: student.number,
      address: address?.present_address || '',
      present_address: address?.present_address || '',
      permanent_address: address?.permanent_address || '',
      city: address?.city || '',
      district: address?.district || '',
      upazila: address?.upazila || '',
      postal_code: address?.postal_code || '',
      father_name: guardian?.father_name || '',
      father_phone: guardian?.father_phone || '',
      father_occupation: guardian?.father_occupation || '',
      father_nid: guardian?.father_nid || '',
      mother_name: guardian?.mother_name || '',
      mother_phone: guardian?.mother_phone || '',
      mother_occupation: guardian?.mother_occupation || '',
      mother_nid: guardian?.mother_nid || '',
      guardian_name: guardian?.guardian_name || '',
      guardian_relation: guardian?.guardian_relation || 'Father',
      guardian_phone: guardian?.guardian_phone || '',
      guardian_email: guardian?.guardian_email || '',
      guardian_address: guardian?.guardian_address || '',
      image: picture?.image_url || null,
      photo_url: picture?.image_url || null,
      signature_url: signature?.signature_url || null,
      past_school_name: student.info_data?.past_school_name || '',
      past_school_class: student.info_data?.past_school_class || '',
      past_school_result: student.info_data?.past_school_result || '',
      special_note: student.info_data?.special_note || '',
    };

    const payload = {
      student: enrichedStudent,
      address,
      guardian,
      picture,
      signature,
      fields: fieldsRes.rows,
    };

    return NextResponse.json({
      success: true,
      payload,
      paylod: payload,
      student: enrichedStudent,
      address,
      guardian,
      picture,
      signature,
    });
  } catch (error) {
    console.error('Error fetching student profile:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

/**
 * PUT /api/[domain]/student/profile
 * Updates student profile details, addresses, guardians, media, and security settings.
 */
export async function PUT(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const session = await getStudentSession(request);
    if (!session || !session.isActive || !session.isVerified) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Active verified student session required.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));

    // Retrieve current student database record
    const studentRes = await queryDb(
      `SELECT s.id, s.password, s.name, s.number, s.email, i.data AS info_data
       FROM website_students s
       LEFT JOIN website_student_info i ON i.student_id = s.id
       WHERE s.id = $1 AND s.website_id = $2
       LIMIT 1`,
      [session.id, website.id]
    );

    if (studentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student not found.' }, { status: 404 });
    }

    const currentStudent = studentRes.rows[0];

    // Password Update Verification
    let newHashedPassword = null;
    if (body.new_password) {
      if (!body.current_password) {
        return NextResponse.json(
          { success: false, error: 'Current password is required to change your password.' },
          { status: 400 }
        );
      }
      const isMatch = await comparePassword(body.current_password, currentStudent.password);
      if (!isMatch) {
        return NextResponse.json(
          { success: false, error: 'Current password entered is incorrect.' },
          { status: 400 }
        );
      }
      if (body.new_password.length < 6) {
        return NextResponse.json(
          { success: false, error: 'New password must be at least 6 characters long.' },
          { status: 400 }
        );
      }
      newHashedPassword = await hashPassword(body.new_password);
    }

    // Dynamic field scope mapping
    const formFieldsRes = await queryDb(
      `SELECT field_key, target_scope FROM website_form_fields WHERE website_id = $1`,
      [website.id]
    );
    const scopeMap = {};
    for (const f of formFieldsRes.rows) {
      scopeMap[f.field_key] = f.target_scope || 'info';
    }

    const rawCustom = body.custom_fields && typeof body.custom_fields === 'object' ? body.custom_fields : {};
    const dynamicInfo = {};
    const dynamicGuardians = {};
    const dynamicAddresses = {};

    for (const [key, val] of Object.entries(rawCustom)) {
      const scope = scopeMap[key] || 'info';
      if (scope === 'guardians') {
        dynamicGuardians[key] = val;
      } else if (scope === 'addresses') {
        dynamicAddresses[key] = val;
      } else {
        dynamicInfo[key] = val;
      }
    }

    // 1. Update Core Students table
    const coreUpdates = ['updated_at = CURRENT_TIMESTAMP'];
    const coreVals = [];
    let idx = 1;

    if (body.name?.trim()) {
      coreUpdates.push(`name = $${idx++}`);
      coreVals.push(body.name.trim());
    }
    if (body.phone?.trim() || body.number?.trim()) {
      coreUpdates.push(`number = $${idx++}`);
      coreVals.push((body.phone || body.number).trim());
    }
    if (body.gender) {
      coreUpdates.push(`gender = $${idx++}`);
      coreVals.push(body.gender);
    }
    if (body.blood_group !== undefined) {
      coreUpdates.push(`blood_group = $${idx++}`);
      coreVals.push(body.blood_group || null);
    }
    if (body.date_of_birth) {
      coreUpdates.push(`date_of_birth = $${idx++}`);
      coreVals.push(body.date_of_birth);
    }
    if (body.religion !== undefined) {
      coreUpdates.push(`religion = $${idx++}`);
      coreVals.push(body.religion || null);
    }
    if (newHashedPassword) {
      coreUpdates.push(`password = $${idx++}`);
      coreVals.push(newHashedPassword);
    }

    coreVals.push(session.id, website.id);
    await queryDb(
      `UPDATE website_students
       SET ${coreUpdates.join(', ')}
       WHERE id = $${idx++} AND website_id = $${idx++}`,
      coreVals
    );

    // 2. Upsert website_student_info (Personal & Custom)
    const existingInfoData = currentStudent.info_data || {};
    const updatedInfoData = {
      ...existingInfoData,
      name: body.name?.trim() || existingInfoData.name || currentStudent.name,
      number: body.phone?.trim() || body.number?.trim() || existingInfoData.number || currentStudent.number,
      gender: body.gender || existingInfoData.gender,
      blood_group: body.blood_group !== undefined ? body.blood_group : existingInfoData.blood_group,
      date_of_birth: body.date_of_birth || existingInfoData.date_of_birth,
      religion: body.religion !== undefined ? body.religion : existingInfoData.religion,
      past_school_name: body.past_school_name !== undefined ? body.past_school_name : existingInfoData.past_school_name,
      past_school_class: body.past_school_class !== undefined ? body.past_school_class : existingInfoData.past_school_class,
      past_school_result: body.past_school_result !== undefined ? body.past_school_result : existingInfoData.past_school_result,
      special_note: body.special_note !== undefined ? body.special_note : existingInfoData.special_note,
      ...dynamicInfo,
    };

    await queryDb(
      `INSERT INTO website_student_info (
          website_id, student_id, data, updated_at
       ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (student_id) DO UPDATE
       SET data = website_student_info.data || EXCLUDED.data,
           updated_at = CURRENT_TIMESTAMP`,
      [website.id, session.id, JSON.stringify(updatedInfoData)]
    );

    // 3. Upsert website_student_addresses
    const presentAddress = body.present_address?.trim() || body.address?.trim() || null;
    const permanentAddress = body.permanent_address?.trim() || presentAddress || null;

    if (presentAddress || permanentAddress || body.city || body.district || Object.keys(dynamicAddresses).length > 0) {
      const addressData = {
        present_address: presentAddress,
        permanent_address: permanentAddress,
        city: body.city?.trim() || null,
        district: body.district?.trim() || null,
        upazila: body.upazila?.trim() || null,
        postal_code: body.postal_code?.trim() || null,
        country: body.country?.trim() || 'Bangladesh',
        ...dynamicAddresses,
      };

      await queryDb(
        `INSERT INTO website_student_addresses (
            website_id, student_id, data, updated_at
         ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (student_id) DO UPDATE
         SET data = website_student_addresses.data || EXCLUDED.data,
             updated_at = CURRENT_TIMESTAMP`,
        [website.id, session.id, JSON.stringify(addressData)]
      );
    }

    // 4. Upsert website_student_guardians
    if (
      body.father_name || body.mother_name || body.guardian_name ||
      body.father_phone || body.mother_phone || body.guardian_phone ||
      Object.keys(dynamicGuardians).length > 0
    ) {
      const guardianData = {
        father_name: body.father_name?.trim() || null,
        father_phone: body.father_phone?.trim() || null,
        father_occupation: body.father_occupation?.trim() || null,
        father_nid: body.father_nid?.trim() || null,
        mother_name: body.mother_name?.trim() || null,
        mother_phone: body.mother_phone?.trim() || null,
        mother_occupation: body.mother_occupation?.trim() || null,
        mother_nid: body.mother_nid?.trim() || null,
        guardian_name: body.guardian_name?.trim() || body.father_name?.trim() || null,
        guardian_relation: body.guardian_relation?.trim() || 'Father',
        guardian_phone: body.guardian_phone?.trim() || body.father_phone?.trim() || null,
        guardian_email: body.guardian_email?.trim() || null,
        guardian_address: body.guardian_address?.trim() || null,
        ...dynamicGuardians,
      };

      await queryDb(
        `INSERT INTO website_student_guardians (
            website_id, student_id, data, updated_at
         ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (student_id) DO UPDATE
         SET data = website_student_guardians.data || EXCLUDED.data,
             updated_at = CURRENT_TIMESTAMP`,
        [website.id, session.id, JSON.stringify(guardianData)]
      );
    }

    // 5. Update Profile Image if provided
    const photoUrl = body.photo_url?.trim() || body.image?.trim();
    if (photoUrl) {
      await queryDb(
        `INSERT INTO website_student_pictures (website_id, student_id, image_url, is_primary)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT DO NOTHING`,
        [website.id, session.id, photoUrl]
      );
    }

    // 6. Update Signature if provided
    const signatureUrl = body.signature_url?.trim();
    if (signatureUrl) {
      await queryDb(
        `INSERT INTO website_student_signatures (website_id, student_id, signature_url, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (student_id) DO UPDATE
         SET signature_url = EXCLUDED.signature_url, updated_at = CURRENT_TIMESTAMP`,
        [website.id, session.id, signatureUrl]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Student profile updated successfully!',
    });
  } catch (error) {
    console.error('Error updating student profile:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
