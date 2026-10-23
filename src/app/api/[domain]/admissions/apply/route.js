import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { checkInstitutionEmailAvailability } from 'src/lib/database/emailUniqueness.js';

/**
 * GET /api/[domain]/admissions/apply?admission_id=...
 * Returns active circular details and application fee for candidate review before submitting.
 */
export async function GET(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const admissionId = searchParams.get('admission_id');

    let sql = `
      SELECT a.*, c.name AS class_name, s.name AS session_name,
             d.name AS department_name,
             af.fee_title, af.amount AS fee_amount, af.currency AS fee_currency, af.late_fee,
             ex.exam_date AS admission_exam_date, ex.admit_publish_date AS admission_admit_publish_date,
             ex.venue AS exam_venue, ex.instructions AS exam_instructions
      FROM website_admissions a
      LEFT JOIN website_classes c ON c.id = a.class_id
      LEFT JOIN website_sessions s ON s.id = a.session_id
      LEFT JOIN website_departments d ON d.id = a.department_id
      LEFT JOIN website_admission_fees af ON af.admission_id = a.id AND af.status = 'active'
      LEFT JOIN website_admission_exams ex ON ex.admission_id = a.id
      WHERE a.website_id = $1 AND a.is_published = TRUE AND a.status IN ('open', 'upcoming')
    `;
    const params = [website.id];

    if (admissionId) {
      sql += ` AND a.id = $2`;
      params.push(parseInt(admissionId, 10));
    }

    sql += ` ORDER BY a.created_at DESC`;

    const res = await queryDb(sql, params);

    // Fetch subjects for any exam-based circulars
    const examSubjectsRes = await queryDb(`
      SELECT id, admission_id, admission_exam_id, title, mark, time
      FROM website_admission_exam_subjects
      WHERE website_id = $1
      ORDER BY id ASC
    `, [website.id]);

    const subjectsByAdmission = {};
    for (const sub of examSubjectsRes.rows) {
      if (!subjectsByAdmission[sub.admission_id]) {
        subjectsByAdmission[sub.admission_id] = [];
      }
      subjectsByAdmission[sub.admission_id].push(sub);
    }

    const circularsWithSubjects = res.rows.map((circ) => ({
      ...circ,
      exam_subjects: subjectsByAdmission[circ.id] || []
    }));

    return NextResponse.json({
      success: true,
      circulars: circularsWithSubjects
    });
  } catch (error) {
    console.error('Error in GET /admissions/apply:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/[domain]/admissions/apply
 * Candidate submits application form -> records applicant, info, and fee payment entry.
 * Note: payment_status is in website_admission_fee_payments.
 */
export async function POST(request, context) {
  try {
    const website = await resolveWebsiteFromRequest(request, context);
    if (!website) {
      return NextResponse.json({ success: false, error: 'Institution portal not found.' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      admission_id,
      circular_id,
      applicant_name,
      email,
      phone,
      gender = 'Male',
      date_of_birth,
      father_name,
      father_phone,
      father_occupation,
      mother_name,
      mother_phone,
      mother_occupation,
      guardian_name,
      guardian_phone,
      guardian_relation,
      address,
      present_address,
      permanent_address,
      last_class,
      last_class_grade,
      last_institution,
      previous_school,
      previous_gpa
    } = body;

    const targetAdmId = admission_id || circular_id;
    if (!targetAdmId) {
      return NextResponse.json({ success: false, error: 'Please select an admission circular target.' }, { status: 400 });
    }
    const admId = parseInt(targetAdmId, 10);

    // Verify circular exists and get active fee
    const circRes = await queryDb(`
      SELECT a.*, af.amount AS fee_amount, af.currency AS fee_currency
      FROM website_admissions a
      LEFT JOIN website_admission_fees af ON af.admission_id = a.id AND af.status = 'active'
      WHERE a.id = $1 AND a.website_id = $2
    `, [admId, website.id]);

    if (circRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Admission circular not found.' }, { status: 404 });
    }
    const circular = circRes.rows[0];

    if (!applicant_name || !applicant_name.trim()) {
      return NextResponse.json({ success: false, error: 'Applicant candidate name is required.' }, { status: 400 });
    }
    if (!email || !email.trim() || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'A valid candidate email address is required.' }, { status: 400 });
    }
    if (!phone || !phone.trim()) {
      return NextResponse.json({ success: false, error: 'Contact phone number is required.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 0. Enforce backend email verification check (or check if applicant already verified)
    const existingAppCheck = await queryDb(`
      SELECT id, application_no, status FROM website_admission_applicants
      WHERE website_id = $1 AND admission_id = $2 AND LOWER(email) = $3
      LIMIT 1
    `, [website.id, admId, cleanEmail]);

    const existingApp = existingAppCheck.rows[0] || null;

    // 0a. Check cross-role email uniqueness:
    // Prevent enrolled students from applying, prevent staff/teacher/officer/other applicant conflict
    const emailAvailability = await checkInstitutionEmailAvailability(website.id, cleanEmail, {
      excludeRole: existingApp ? 'applicant' : null,
      excludeId: existingApp?.id || null,
    });

    if (!emailAvailability.available) {
      return NextResponse.json({
        success: false,
        error: emailAvailability.message || 'This email address cannot be used for admission application.',
        conflict_role: emailAvailability.conflictRole
      }, { status: 409 });
    }

    let verifiedCheck = null;
    if (existingAppCheck.rows.length === 0) {
      verifiedCheck = await queryDb(`
        SELECT id, is_verified, expires_at
        FROM website_email_verifications
        WHERE website_id = $1 AND LOWER(email) = $2 AND purpose = 'admission' AND is_verified = TRUE
        ORDER BY id DESC
        LIMIT 1
      `, [website.id, cleanEmail]);

      if (verifiedCheck.rows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Email verification required. Please verify your email with the one-time passcode before submitting.'
        }, { status: 403 });
      }
    }

    // 1. Fetch active modular form fields (primary blueprint is website_student_form_fields)
    const stuFieldsRes = await queryDb(`
      SELECT * FROM website_student_form_fields
      WHERE website_id = $1 AND is_active = TRUE
      ORDER BY sort_order ASC, id ASC
    `, [website.id]);

    let activeFields = [];
    if (stuFieldsRes.rows.length > 0) {
      activeFields = stuFieldsRes.rows;
      // Append any circular-specific fields
      const admFieldsRes = await queryDb(`
        SELECT * FROM website_admission_form_fields
        WHERE website_id = $1 AND admission_id = $2 AND is_active = TRUE
        ORDER BY sort_order ASC, id ASC
      `, [website.id, admId]);
      const existingKeys = new Set(activeFields.map((f) => f.field_key));
      for (const af of admFieldsRes.rows) {
        if (!existingKeys.has(af.field_key)) {
          activeFields.push(af);
          existingKeys.add(af.field_key);
        }
      }
    } else {
      const fieldsRes = await queryDb(`
        SELECT * FROM website_admission_form_fields
        WHERE website_id = $1 AND (admission_id = $2 OR admission_id IS NULL) AND is_active = TRUE
        ORDER BY sort_order ASC, id ASC
      `, [website.id, admId]);
      activeFields = fieldsRes.rows.length > 0 ? fieldsRes.rows : [
        { field_key: 'applicant_name', label: 'Applicant Name', field_type: 'text', is_required: true, section: 'personal' },
        { field_key: 'phone', label: 'Phone', field_type: 'text', is_required: true, validation_regex: '^01[3-9]\\d{8}$', section: 'personal' },
        { field_key: 'gender', label: 'Gender', field_type: 'select', options: ['Male', 'Female', 'Other'], is_required: true, section: 'personal' },
        { field_key: 'date_of_birth', label: 'Date of Birth', field_type: 'date', is_required: true, section: 'personal' }
      ];
    }


    const validationErrors = [];
    const submittedCustom = body.custom_fields && typeof body.custom_fields === 'object' ? { ...body.custom_fields } : {};

    for (const f of activeFields) {
      let val = body[f.field_key];
      if (val === undefined || val === null) {
        val = submittedCustom[f.field_key];
      }
      const strVal = val !== undefined && val !== null ? String(val).trim() : '';

      // Check Required
      if (f.is_required && !strVal) {
        validationErrors.push({
          field_key: f.field_key,
          label: f.label,
          error: `${f.label} is required.`
        });
        continue;
      }

      if (strVal) {
        // Field Type Checks
        if (f.field_type === 'number') {
          if (isNaN(Number(strVal))) {
            validationErrors.push({
              field_key: f.field_key,
              label: f.label,
              error: `${f.label} must be a valid number.`
            });
          }
        } else if (f.field_type === 'date') {
          if (isNaN(Date.parse(strVal))) {
            validationErrors.push({
              field_key: f.field_key,
              label: f.label,
              error: `${f.label} must be a valid date.`
            });
          }
        } else if (f.field_type === 'select') {
          let opts = [];
          if (Array.isArray(f.options)) opts = f.options;
          else if (typeof f.options === 'string') {
            try { opts = JSON.parse(f.options); } catch { opts = []; }
          }
          if (opts.length > 0 && !opts.includes(strVal)) {
            validationErrors.push({
              field_key: f.field_key,
              label: f.label,
              error: `Invalid selection for ${f.label}. Allowed options: ${opts.join(', ')}.`
            });
          }
        }

        // Regex Pattern Validation
        if (f.validation_regex) {
          try {
            const re = new RegExp(f.validation_regex);
            if (!re.test(strVal)) {
              validationErrors.push({
                field_key: f.field_key,
                label: f.label,
                error: `${f.label} format is invalid. ${f.help_text || ''}`.trim()
              });
            }
          } catch (e) {
            console.warn(`Invalid regex pattern for field ${f.field_key}:`, e.message);
          }
        }
      }

      submittedCustom[f.field_key] = val !== undefined ? val : null;
    }

    // STRICT POLICY: IF NOT OK -> DO NOT SAVE!
    if (validationErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Application data does not meet the circular requirements.',
        validation_errors: validationErrors
      }, { status: 422 });
    }

    const resolvedLastClass = last_class ? last_class.trim() : (body.past_school_class || 'N/A');
    const resolvedLastGrade = last_class_grade !== undefined && last_class_grade !== '' && last_class_grade !== null
      ? parseFloat(last_class_grade)
      : (previous_gpa ? parseFloat(previous_gpa) : null);
    const resolvedLastInst = last_institution ? last_institution.trim() : (previous_school || body.past_school_name || 'N/A');

    let applicant;
    let appNumber;

    if (existingAppCheck.rows.length > 0) {
      // Update existing applicant -> status becomes 'unpaid'
      const existing = existingAppCheck.rows[0];
      appNumber = existing.application_no;
      const updateRes = await queryDb(`
        UPDATE website_admission_applicants
        SET applicant_name = $1,
            email = $2,
            phone = $3,
            status = 'unpaid',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4 AND website_id = $5
        RETURNING *
      `, [
        applicant_name.trim(),
        cleanEmail,
        phone.trim(),
        existing.id,
        website.id
      ]);
      applicant = updateRes.rows[0];
    } else {
      // Generate Application Number: APP-{year}-{random_seq}
      const countRes = await queryDb(`SELECT COUNT(*)::int AS count FROM website_admission_applicants WHERE website_id = $1`, [website.id]);
      const seq = (countRes.rows[0].count || 0) + 1001;
      const year = new Date().getFullYear();
      appNumber = `APP-${year}-${seq}`;

      const insertApp = await queryDb(`
        INSERT INTO website_admission_applicants (
          website_id, admission_id, application_no, applicant_name, email,
          phone, status
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, 'unpaid'
        ) RETURNING *
      `, [
        website.id,
        admId,
        appNumber,
        applicant_name.trim(),
        cleanEmail,
        phone.trim()
      ]);
      applicant = insertApp.rows[0];
    }

    // 3. Partition submitted custom fields by section
    const customPersonal = {};
    const customGuardian = {};
    const customAddress = {};

    for (const f of activeFields) {
      const val = submittedCustom[f.field_key];
      if (val !== undefined && val !== null) {
        if (f.section === 'guardian') {
          customGuardian[f.field_key] = val;
        } else if (f.section === 'address') {
          customAddress[f.field_key] = val;
        } else {
          customPersonal[f.field_key] = val;
        }
      }
    }

    // 3a. Upsert modular data into website_admission_applicant_info
    const personalData = {
      gender: gender || 'Male',
      date_of_birth: date_of_birth || null,
      blood_group: body.blood_group || null,
      religion: body.religion || null,
      last_class: resolvedLastClass,
      last_class_grade: resolvedLastGrade,
      last_institution: resolvedLastInst,
      ...customPersonal
    };

    await queryDb(`
      INSERT INTO website_admission_applicant_info (website_id, applicant_id, data, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (applicant_id) DO UPDATE SET
        data = website_admission_applicant_info.data || EXCLUDED.data,
        updated_at = CURRENT_TIMESTAMP
    `, [website.id, applicant.id, JSON.stringify(personalData)]);

    // 3b. Upsert modular data into website_admission_applicant_guardians
    const guardianData = {
      father_name: father_name || null,
      father_phone: father_phone || null,
      father_occupation: father_occupation || null,
      mother_name: mother_name || null,
      mother_phone: mother_phone || null,
      mother_occupation: mother_occupation || null,
      guardian_name: guardian_name || father_name || null,
      guardian_phone: guardian_phone || father_phone || null,
      guardian_relation: guardian_relation || 'Father',
      guardian_email: body.guardian_email || null,
      guardian_address: body.guardian_address || null,
      ...customGuardian
    };

    await queryDb(`
      INSERT INTO website_admission_applicant_guardians (website_id, applicant_id, data, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (applicant_id) DO UPDATE SET
        data = website_admission_applicant_guardians.data || EXCLUDED.data,
        updated_at = CURRENT_TIMESTAMP
    `, [website.id, applicant.id, JSON.stringify(guardianData)]);

    // 3c. Upsert modular data into website_admission_applicant_addresses
    const addressData = {
      present_address: present_address || address || null,
      permanent_address: permanent_address || address || null,
      city: body.city || null,
      district: body.district || null,
      upazila: body.upazila || null,
      postal_code: body.postal_code || null,
      country: body.country || 'Bangladesh',
      ...customAddress
    };

    await queryDb(`
      INSERT INTO website_admission_applicant_addresses (website_id, applicant_id, data, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (applicant_id) DO UPDATE SET
        data = website_admission_applicant_addresses.data || EXCLUDED.data,
        updated_at = CURRENT_TIMESTAMP
    `, [website.id, applicant.id, JSON.stringify(addressData)]);


    // 4. Upsert pending payment record in website_admission_fee_payments
    const feeAmount = parseFloat(circular.fee_amount) || 500.00;
    const feeCurrency = circular.fee_currency || 'BDT';
    const invoiceRef = `INV-ADM-${appNumber}`;

    const existingPayment = await queryDb(
      `SELECT id, payment_status FROM website_admission_fee_payments WHERE applicant_id = $1 AND website_id = $2 LIMIT 1`,
      [applicant.id, website.id]
    );

    if (existingPayment.rows.length === 0) {
      await queryDb(`
        INSERT INTO website_admission_fee_payments (
          website_id, applicant_id, admission_id,
          gateway_code, amount, currency, transaction_id, payment_status, invoice_no
        ) VALUES (
          $1, $2, $3,
          'online', $4, $5, NULL, 'pending', $6
        )
      `, [
        website.id,
        applicant.id,
        admId,
        feeAmount,
        feeCurrency,
        invoiceRef
      ]);
    }

    // Consume verified token record to prevent replay attack
    try {
      if (typeof verifiedCheck !== 'undefined' && verifiedCheck?.rows?.length > 0) {
        await queryDb(`DELETE FROM website_email_verifications WHERE id = $1`, [verifiedCheck.rows[0].id]);
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: 'Admission application registered successfully. Please proceed with payment.',
      applicant_id: applicant.id,
      application_number: appNumber,
      fee_amount: feeAmount,
      fee_currency: feeCurrency,
      invoice_ref: invoiceRef,
      applicant: {
        id: applicant.id,
        application_no: appNumber,
        applicant_name: applicant.applicant_name,
        email: applicant.email,
        phone: applicant.phone,
        fee_amount: feeAmount,
        currency: feeCurrency,
        payment_status: 'pending'
      },
      payment: {
        payment_url: `/pay/admission-fees/${applicant.id}`,
        invoice_ref: invoiceRef
      },
      next_step: `/pay/admission-fees/${applicant.id}`
    });
  } catch (error) {
    console.error('Error in POST /admissions/apply:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
