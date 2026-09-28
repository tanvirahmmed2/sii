import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isAdmin, isRegister, isCashier } from '@/lib/auth';
import { uploadImage } from '@/lib/cloudinary';
import { sendEmail } from '@/lib/brevo';
import { recordActivityLog } from '@/lib/logger';

// GET Admissions (Admin/Registrar/Cashier only)
export async function GET(request) {
  try {
    const authorized = (await isAdmin()) || (await isRegister()) || (await isCashier());
    if (!authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const result = await query(`
        SELECT sa.*, c.name AS class_name, 
               adm.title AS admission_title,
               adm.fees AS admission_fees_amount,
               af.amount AS fee_amount,
               af.status AS fee_status
        FROM student_admissions sa
        JOIN classes c ON sa.applied_class_id = c.id
        LEFT JOIN admissions adm ON sa.admission_id = adm.id
        LEFT JOIN admission_fees af ON sa.id = af.student_admission_id
        WHERE sa.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Applicant not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        paylod: { applicant: result.rows[0] }
      });
    }

    const result = await query(`
      SELECT sa.*, c.name AS class_name, 
             adm.title AS admission_title,
             adm.fees AS admission_fees_amount,
             af.amount AS fee_amount,
             af.status AS fee_status
      FROM student_admissions sa
      JOIN classes c ON sa.applied_class_id = c.id
      LEFT JOIN admissions adm ON sa.admission_id = adm.id
      LEFT JOIN admission_fees af ON sa.id = af.student_admission_id
      ORDER BY sa.applied_date DESC
    `);

    return NextResponse.json({
      success: true,
      paylod: { admissions: result.rows }
    });
  } catch (error) {
    console.error('Error fetching admissions applications:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST Admission Application (Public Candidate Submission)
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      admission_id,
      applicant_name,
      email,
      phone,
      date_of_birth,
      gender,
      blood_group,
      address,
      applied_class_id,
      father_name,
      father_occupation,
      father_phone,
      mother_name,
      mother_occupation,
      mother_phone,
      past_school_name,
      past_school_class,
      past_school_result,
      special_note,
      birth_regi_number,
      image,
      signature
    } = body;

    if (!admission_id || !applicant_name || !email || !phone || !date_of_birth || !gender || 
        !address || !applied_class_id || !father_name || !father_phone || !mother_name || !mother_phone) {
      return NextResponse.json({ success: false, error: 'Required candidate, father, and mother details must be filled.' }, { status: 400 });
    }

    // 1. Fetch circular details
    const circularRes = await query('SELECT * FROM admissions WHERE id = $1', [admission_id]);
    if (circularRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Selected admission circular not found.' }, { status: 404 });
    }

    const circular = circularRes.rows[0];

    // Lock new applications if result is published
    if (circular.is_result_published) {
      return NextResponse.json({ success: false, error: 'Applications for this circular are closed as results have been published.' }, { status: 400 });
    }

    // Validate circular deadline
    if (circular.finish_date && new Date() > new Date(circular.finish_date)) {
      return NextResponse.json({ success: false, error: 'Admission circular deadline has closed.' }, { status: 400 });
    }

    // Validate class matches circular target
    if (parseInt(applied_class_id, 10) !== parseInt(circular.class_id, 10)) {
      return NextResponse.json({ success: false, error: 'Applied class does not match target circular class.' }, { status: 400 });
    }

    // 2. Validate uniqueness of Email
    const studentEmailCheck = await query('SELECT id FROM students WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (studentEmailCheck.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'This email address is already registered to an active student account.' }, { status: 400 });
    }

    const applicantEmailCheck = await query(
      `SELECT id FROM student_admissions WHERE LOWER(email) = LOWER($1)`, 
      [email.trim()]
    );
    if (applicantEmailCheck.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'An admission application with this email address has already been submitted.' }, { status: 400 });
    }

    // Optional image upload
    let imageUrl = null;
    let imagePublicId = null;
    if (image && image.startsWith('data:image')) {
      try {
        const uploadRes = await uploadImage(image, 'student_admissions_images');
        imageUrl = uploadRes.url;
        imagePublicId = uploadRes.publicId;
      } catch (uploadErr) {
        console.error('Cloudinary image upload failure:', uploadErr);
      }
    }

    // Optional signature upload
    let signatureUrl = null;
    let signaturePublicId = null;
    if (signature && signature.startsWith('data:image')) {
      try {
        const uploadRes = await uploadImage(signature, 'student_admissions_signatures');
        signatureUrl = uploadRes.url;
        signaturePublicId = uploadRes.publicId;
      } catch (uploadErr) {
        console.error('Cloudinary signature upload failure:', uploadErr);
      }
    }

    const primaryGuardianName = father_name.trim();
    const primaryGuardianPhone = father_phone.trim();

    // Save to student_admissions
    const result = await query(`
      INSERT INTO student_admissions (
        admission_id, applicant_name, email, phone, date_of_birth, gender, blood_group, address, 
        applied_class_id, father_name, father_occupation, father_phone, 
        mother_name, mother_occupation, mother_phone,
        past_school_name, past_school_class, past_school_result, special_note,
        guardian_name, guardian_phone, birth_regi_number, 
        image, image_id, signature, signature_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, 'incomplete')
      RETURNING *
    `, [
      parseInt(admission_id, 10),
      applicant_name.trim(),
      email.trim(),
      phone.trim(),
      date_of_birth,
      gender,
      blood_group ? blood_group.trim() : null,
      address.trim(),
      parseInt(applied_class_id, 10),
      father_name.trim(),
      father_occupation ? father_occupation.trim() : null,
      father_phone.trim(),
      mother_name.trim(),
      mother_occupation ? mother_occupation.trim() : null,
      mother_phone.trim(),
      past_school_name ? past_school_name.trim() : null,
      past_school_class ? past_school_class.trim() : null,
      past_school_result ? past_school_result.trim() : null,
      special_note ? special_note.trim() : null,
      primaryGuardianName,
      primaryGuardianPhone,
      birth_regi_number ? birth_regi_number.trim() : null,
      imageUrl,
      imagePublicId,
      signatureUrl,
      signaturePublicId
    ]);

    const applicant = result.rows[0];
    const applicantNumber = `APP-1000${applicant.id}`;
    const admissionFeeAmount = circular.fees || 0.00;

    // Create admission fee record
    try {
      await query(`
        INSERT INTO admission_fees (student_admission_id, amount, status)
        VALUES ($1, $2, 'unpaid')
        ON CONFLICT (student_admission_id) DO UPDATE SET amount = EXCLUDED.amount
      `, [applicant.id, admissionFeeAmount]);
    } catch (feeErr) {
      console.error('Failed to create admission fee record:', feeErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Admission candidate application submitted successfully.',
      paylod: { 
        admission: applicant,
        applicant_number: applicantNumber,
        fee_amount: admissionFeeAmount
      }
    });
  } catch (error) {
    console.error('Error submitting admission application:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT Single Applicant Status Update (Admin / Registrar only)
export async function PUT(request) {
  try {
    const authorized = (await isAdmin()) || (await isRegister());
    if (!authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status } = body; 
    const normStatus = status ? status.toLowerCase() : '';

    const validStatuses = ['approved', 'selected', 'rejected', 'disqualified', 'pending'];
    if (!id || !normStatus || !validStatuses.includes(normStatus)) {
      return NextResponse.json({ success: false, error: `ID and valid status (${validStatuses.join('/')}) are required.` }, { status: 400 });
    }

    const admissionRes = await query('SELECT * FROM student_admissions WHERE id = $1', [id]);
    if (admissionRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Admission application not found.' }, { status: 404 });
    }

    const admission = admissionRes.rows[0];

    // If setting to approved / selected, verify fee status
    if (['approved', 'selected'].includes(normStatus)) {
      const feeCheck = await query('SELECT status FROM admission_fees WHERE student_admission_id = $1', [id]);
      const feeStatus = feeCheck.rows[0]?.status;
      if (!feeStatus || (feeStatus.toLowerCase() !== 'paid')) {
        return NextResponse.json({ success: false, error: 'Only paid candidates can be selected or approved for admission.' }, { status: 400 });
      }

      await query(`
        INSERT INTO accepted_admissions (
          student_admission_id, admission_id, class_id, applicant_name, email, phone
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (student_admission_id) DO NOTHING
      `, [
        id,
        admission.admission_id,
        admission.applied_class_id,
        admission.applicant_name,
        admission.email,
        admission.phone
      ]);
    } else {
      await query(`
        DELETE FROM accepted_admissions 
        WHERE student_admission_id = $1
      `, [id]);
    }

    await query(`
      UPDATE student_admissions SET
        status = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [normStatus, id]);

    return NextResponse.json({
      success: true,
      message: `Admission candidate application status updated to ${normStatus}.`
    });
  } catch (error) {
    console.error('Error processing admission application:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
