import { NextResponse } from 'next/server';
import { queryDb } from 'src/lib/database/db.js';
import { withTenantTransaction } from '@/lib/db';
import { resolveWebsiteFromRequest } from 'src/lib/middleware/creator.js';
import { checkInstitutionEmailAvailability } from 'src/lib/database/emailUniqueness.js';
import { validateSubmissionPayload } from '@/lib/form-criteria-engine';

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

    const liveFieldsRes = await queryDb(`
      SELECT id AS form_field_id, target_scope, field_key, label, field_type,
             options, validation_regex, is_unique, is_required, is_required_in_admission, sort_order
      FROM website_form_fields
      WHERE website_id = $1 AND is_visible_in_admission = TRUE AND is_active = TRUE
      ORDER BY sort_order ASC, id ASC
    `, [website.id]);

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

    const circularsWithSubjects = res.rows.map((circ) => {
      const activeSnapshot =
        Array.isArray(circ.form_schema_snapshot) && circ.form_schema_snapshot.length > 0
          ? circ.form_schema_snapshot
          : liveFieldsRes.rows;

      return {
        ...circ,
        form_schema_snapshot: activeSnapshot,
        criteria_rules: circ.criteria_rules || {
          age: { enabled: false, min_years: null, max_years: null, as_of_date: null },
          rules: { all: [] }
        },
        exam_subjects: subjectsByAdmission[circ.id] || []
      };
    });

    return NextResponse.json({
      success: true,
      circulars: circularsWithSubjects,
      circular: circularsWithSubjects[0] || null
    });
  } catch (error) {
    console.error('Error in GET /admissions/apply:', error);
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

    const candidateName = (applicant_name || body.name || '').trim();
    if (!candidateName) {
      return NextResponse.json({ success: false, error: 'Applicant candidate name is required.' }, { status: 400 });
    }
    if (!email || !email.trim() || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'A valid candidate email address is required.' }, { status: 400 });
    }
    if (!phone || !phone.trim()) {
      return NextResponse.json({ success: false, error: 'Contact phone number is required.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existingAppCheck = await queryDb(`
      SELECT id, application_no, status FROM website_admission_applicants
      WHERE website_id = $1 AND admission_id = $2 AND LOWER(email) = $3
      LIMIT 1
    `, [website.id, admId, cleanEmail]);

    const existingApp = existingAppCheck.rows[0] || null;

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

    const submittedCustom = body.custom_fields && typeof body.custom_fields === 'object' ? { ...body.custom_fields } : {};

    const resolvedLastClass = last_class ? last_class.trim() : (body.past_school_class || 'N/A');
    const resolvedLastGrade = last_class_grade !== undefined && last_class_grade !== '' && last_class_grade !== null
      ? parseFloat(last_class_grade)
      : (previous_gpa ? parseFloat(previous_gpa) : null);
    const resolvedLastInst = last_institution ? last_institution.trim() : (previous_school || body.past_school_name || 'N/A');
    const resolvedGender = body.gender || submittedCustom.gender || gender || 'Male';
    const resolvedDob = body.date_of_birth || submittedCustom.date_of_birth || date_of_birth || null;

    const personalData = {
      gender: resolvedGender,
      date_of_birth: resolvedDob,
      blood_group: body.blood_group || submittedCustom.blood_group || null,
      religion: body.religion || submittedCustom.religion || null,
      last_class: resolvedLastClass,
      last_class_grade: resolvedLastGrade,
      last_institution: resolvedLastInst,
      ...submittedCustom
    };

    const guardianData = {
      father_name: father_name || body.father_name || null,
      father_phone: father_phone || body.father_phone || null,
      father_occupation: father_occupation || body.father_occupation || null,
      mother_name: mother_name || body.mother_name || null,
      mother_phone: mother_phone || body.mother_phone || null,
      mother_occupation: mother_occupation || body.mother_occupation || null,
      guardian_name: guardian_name || father_name || null,
      guardian_phone: guardian_phone || father_phone || null,
      guardian_relation: guardian_relation || 'Father',
      guardian_email: body.guardian_email || null,
      guardian_address: body.guardian_address || null,
      ...(body.guardian_custom_fields || {})
    };

    const addressData = {
      present_address: present_address || address || null,
      permanent_address: permanent_address || address || null,
      city: body.city || null,
      district: body.district || null,
      upazila: body.upazila || null,
      postal_code: body.postal_code || null,
      country: body.country || 'Bangladesh',
      ...(body.address_custom_fields || {})
    };

    const payload = {
      core: {
        applicant_name: candidateName,
        name: candidateName,
        email: cleanEmail,
        phone: phone.trim(),
        gender: resolvedGender,
        date_of_birth: resolvedDob,
      },
      info: personalData,
      guardians: guardianData,
      addresses: addressData
    };

    const result = await withTenantTransaction(website.id, async (client) => {
      const validation = await validateSubmissionPayload({
        clientOrPool: client,
        websiteId: website.id,
        admissionId: admId,
        applicantId: existingApp?.id || null,
        mode: 'admission',
        payload
      });

      if (!validation.valid) {
        const valError = new Error(validation.errors[0] || 'Application requirements not met.');
        valError.isValidationError = true;
        valError.errors = validation.errors;
        throw valError;
      }

      let applicant;
      let appNumber;

      if (existingAppCheck.rows.length > 0) {
        const existing = existingAppCheck.rows[0];
        appNumber = existing.application_no;
        const updateRes = await client.query(`
          UPDATE website_admission_applicants
          SET applicant_name = $1,
              name = $1,
              email = $2,
              phone = $3,
              gender = $4,
              date_of_birth = $5,
              status = 'unpaid',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $6 AND website_id = $7
          RETURNING *
        `, [
          candidateName,
          cleanEmail,
          phone.trim(),
          resolvedGender,
          resolvedDob,
          existing.id,
          website.id
        ]);
        applicant = updateRes.rows[0];
      } else {
        const countRes = await client.query(
          `SELECT COUNT(*)::int AS count FROM website_admission_applicants WHERE website_id = $1`,
          [website.id]
        );
        const seq = (countRes.rows[0].count || 0) + 1001;
        const year = new Date().getFullYear();
        appNumber = `APP-${year}-${seq}`;

        const insertApp = await client.query(`
          INSERT INTO website_admission_applicants (
            website_id, admission_id, application_no, applicant_name, name, email,
            phone, gender, date_of_birth, status
          ) VALUES (
            $1, $2, $3, $4, $4, $5,
            $6, $7, $8, 'unpaid'
          ) RETURNING *
        `, [
          website.id,
          admId,
          appNumber,
          candidateName,
          cleanEmail,
          phone.trim(),
          resolvedGender,
          resolvedDob
        ]);
        applicant = insertApp.rows[0];
      }

      await client.query(`
        INSERT INTO website_admission_applicant_info (website_id, applicant_id, data, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (applicant_id) DO UPDATE SET
          data = website_admission_applicant_info.data || EXCLUDED.data,
          updated_at = CURRENT_TIMESTAMP
      `, [website.id, applicant.id, JSON.stringify(personalData)]);

      await client.query(`
        INSERT INTO website_admission_applicant_guardians (website_id, applicant_id, data, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (applicant_id) DO UPDATE SET
          data = website_admission_applicant_guardians.data || EXCLUDED.data,
          updated_at = CURRENT_TIMESTAMP
      `, [website.id, applicant.id, JSON.stringify(guardianData)]);

      await client.query(`
        INSERT INTO website_admission_applicant_addresses (website_id, applicant_id, data, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (applicant_id) DO UPDATE SET
          data = website_admission_applicant_addresses.data || EXCLUDED.data,
          updated_at = CURRENT_TIMESTAMP
      `, [website.id, applicant.id, JSON.stringify(addressData)]);

      const feeAmount = parseFloat(circular.fee_amount) || 500.00;
      const feeCurrency = circular.fee_currency || 'BDT';
      const invoiceRef = `INV-ADM-${appNumber}`;

      const existingPayment = await client.query(
        `SELECT id, payment_status FROM website_admission_fee_payments WHERE applicant_id = $1 AND website_id = $2 LIMIT 1`,
        [applicant.id, website.id]
      );

      if (existingPayment.rows.length === 0) {
        await client.query(`
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

      if (verifiedCheck?.rows?.length > 0) {
        await client.query(`DELETE FROM website_email_verifications WHERE id = $1`, [verifiedCheck.rows[0].id]);
      }

      return {
        applicant,
        appNumber,
        feeAmount,
        feeCurrency,
        invoiceRef
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Admission application registered successfully. Please proceed with payment.',
      applicant_id: result.applicant.id,
      application_number: result.appNumber,
      fee_amount: result.feeAmount,
      fee_currency: result.feeCurrency,
      invoice_ref: result.invoiceRef,
      applicant: {
        id: result.applicant.id,
        application_no: result.appNumber,
        applicant_name: result.applicant.applicant_name,
        email: result.applicant.email,
        phone: result.applicant.phone,
        fee_amount: result.feeAmount,
        currency: result.feeCurrency,
        payment_status: 'pending'
      },
      payment: {
        payment_url: `/pay/admission-fees/${result.applicant.id}`,
        invoice_ref: result.invoiceRef
      },
      next_step: `/pay/admission-fees/${result.applicant.id}`
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

    console.error('Error in POST /admissions/apply:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
