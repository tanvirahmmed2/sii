import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { sendEmail } from '@/lib/brevo';
import { triggerMonthlyFeeGeneration } from '@/lib/fees';

// POST publish admission results (Admin only)
export async function POST(request) {
  let client;
  try {
    const authenticated = await isAdmin();
    if (!authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Admins only.' }, { status: 403 });
    }

    const { admission_id } = await request.json();

    if (!admission_id) {
      return NextResponse.json({ success: false, error: 'Admission circular ID is required.' }, { status: 400 });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    // 1. Fetch circular details
    const circularRes = await client.query('SELECT * FROM admissions WHERE id = $1', [admission_id]);
    if (circularRes.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return NextResponse.json({ success: false, error: 'Admission circular not found.' }, { status: 404 });
    }

    const circular = circularRes.rows[0];

    if (circular.is_result_published) {
      await client.query('ROLLBACK');
      client.release();
      return NextResponse.json({ success: false, error: 'Results have already been published for this circular.' }, { status: 400 });
    }

    // Get max seats of target class
    const classInfoRes = await client.query('SELECT max_seats FROM classes WHERE id = $1', [circular.class_id]);
    const maxSeats = classInfoRes.rows[0]?.max_seats || 40;

    // 2. Fetch all selected/approved applications for this circular
    const approvedCandidatesRes = await client.query(`
      SELECT 
        sa.id as student_admission_id,
        sa.admission_id,
        sa.applied_class_id as class_id,
        sa.applicant_name,
        sa.email,
        sa.phone,
        sa.date_of_birth,
        sa.gender,
        sa.blood_group,
        sa.address,
        sa.birth_regi_number,
        sa.father_name,
        sa.father_occupation,
        sa.father_phone,
        sa.mother_name,
        sa.mother_occupation,
        sa.mother_phone,
        sa.past_school_name,
        sa.past_school_class,
        sa.past_school_result,
        sa.special_note,
        sa.guardian_name,
        sa.guardian_phone,
        sa.image,
        sa.image_id,
        sa.signature,
        sa.signature_id,
        c.name AS class_name,
        c.numeric_name AS class_numeric_name
      FROM student_admissions sa
      JOIN classes c ON sa.applied_class_id = c.id
      WHERE sa.admission_id = $1 AND LOWER(sa.status) IN ('approved', 'selected')
      ORDER BY sa.id ASC
    `, [admission_id]);

    const candidates = approvedCandidatesRes.rows.slice(0, maxSeats);

    const academicYear = new Date().getFullYear();
    let registeredCount = 0;

    const countRes = await client.query(
      'SELECT COUNT(*) as count FROM students WHERE class_id = $1',
      [circular.class_id]
    );
    let currentStudentSeq = parseInt(countRes.rows[0]?.count || 0, 10);

    // 3. Register each approved candidate as an official student without deleting applicant records
    for (const cand of candidates) {
      currentStudentSeq++;
      const match = String(cand.class_numeric_name || cand.class_name || '').match(/\d+/);
      const classNum = match ? match[0] : '1';
      const seqStr = String(currentStudentSeq).padStart(2, '0');
      const candidateRoll = parseInt(`${classNum}0${seqStr}`, 10);

      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const codeExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      const parentsInfo = `Father: ${cand.father_name || cand.guardian_name} (${cand.father_phone || cand.guardian_phone}), Mother: ${cand.mother_name || 'N/A'}`;

      const classNumeric = cand.class_numeric_name || 0;
      const regPrefix = `${academicYear}-${classNumeric}`;

      // Sequential registration number
      const maxRegRes = await client.query(
        `SELECT registration_number 
         FROM students 
         WHERE registration_number LIKE $1 
         ORDER BY registration_number DESC 
         LIMIT 1`,
        [`${regPrefix}%`]
      );

      let nextNum = 1;
      if (maxRegRes.rows.length > 0) {
        const lastReg = maxRegRes.rows[0].registration_number;
        const regParts = lastReg.split('-');
        if (regParts.length >= 2) {
          const suffixStr = regParts[1].substring(String(classNumeric).length);
          const parsed = parseInt(suffixStr, 10);
          if (!isNaN(parsed)) {
            nextNum = parsed + 1;
          }
        }
      }

      let isUnique = false;
      let regNo = '';
      while (!isUnique) {
        const suffix = String(nextNum).padStart(3, '0');
        regNo = `${regPrefix}${suffix}`;
        const check = await client.query('SELECT id FROM students WHERE LOWER(registration_number) = LOWER($1)', [regNo]);
        if (check.rows.length === 0) {
          isUnique = true;
        } else {
          nextNum++;
        }
      }

      // Insert or Update student record
      const existingStudentRes = await client.query('SELECT id FROM students WHERE LOWER(email) = LOWER($1)', [cand.email.trim()]);
      
      let studentId = null;
      if (existingStudentRes.rows.length > 0) {
        studentId = existingStudentRes.rows[0].id;
        await client.query(`
          UPDATE students SET
            name = $1,
            phone = $2,
            class_id = $3,
            date_of_birth = $4,
            address = $5,
            gender = $6,
            birth_certificate_number = $7,
            blood_group = $8,
            father_name = $9,
            father_occupation = $10,
            father_phone = $11,
            mother_name = $12,
            mother_occupation = $13,
            mother_phone = $14,
            past_school_name = $15,
            past_school_class = $16,
            past_school_result = $17,
            special_note = $18,
            parents_info = $19,
            verification_code = $20,
            verification_code_expires = $21,
            image = $22,
            image_id = $23,
            signature = $24,
            signature_id = $25,
            roll = $26,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $27
        `, [
          cand.applicant_name,
          cand.phone,
          cand.class_id,
          cand.date_of_birth,
          cand.address,
          cand.gender,
          cand.birth_regi_number,
          cand.blood_group,
          cand.father_name,
          cand.father_occupation,
          cand.father_phone,
          cand.mother_name,
          cand.mother_occupation,
          cand.mother_phone,
          cand.past_school_name,
          cand.past_school_class,
          cand.past_school_result,
          cand.special_note,
          parentsInfo,
          verificationCode,
          codeExpires,
          cand.image,
          cand.image_id,
          cand.signature,
          cand.signature_id,
          candidateRoll,
          studentId
        ]);
      } else {
        const studentRes = await client.query(`
          INSERT INTO students (
            name, email, phone, registration_number, class_id, date_of_birth, address,
            gender, birth_certificate_number, blood_group,
            father_name, father_occupation, father_phone,
            mother_name, mother_occupation, mother_phone,
            past_school_name, past_school_class, past_school_result, special_note,
            parents_info, is_active, is_registered,
            verification_code, verification_code_expires, image, image_id, signature, signature_id,
            roll
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, FALSE, FALSE, $22, $23, $24, $25, $26, $27, $28
          )
          RETURNING id
        `, [
          cand.applicant_name,
          cand.email,
          cand.phone,
          regNo,
          cand.class_id,
          cand.date_of_birth,
          cand.address,
          cand.gender,
          cand.birth_regi_number,
          cand.blood_group,
          cand.father_name,
          cand.father_occupation,
          cand.father_phone,
          cand.mother_name,
          cand.mother_occupation,
          cand.mother_phone,
          cand.past_school_name,
          cand.past_school_class,
          cand.past_school_result,
          cand.special_note,
          parentsInfo,
          verificationCode,
          codeExpires,
          cand.image,
          cand.image_id,
          cand.signature,
          cand.signature_id,
          candidateRoll
        ]);

        studentId = studentRes.rows[0].id;
      }

      // Save Father details into student_guardians
      if (cand.father_name && cand.father_phone) {
        await client.query(`
          INSERT INTO student_guardians (
            student_id, name, relationship, email, phone, occupation
          ) VALUES ($1, $2, 'Father', $3, $4, $5)
        `, [
          studentId,
          cand.father_name,
          cand.email,
          cand.father_phone,
          cand.father_occupation || null
        ]);
      }

      // Save Mother details into student_guardians
      if (cand.mother_name && cand.mother_phone) {
        await client.query(`
          INSERT INTO student_guardians (
            student_id, name, relationship, email, phone, occupation
          ) VALUES ($1, $2, 'Mother', $3, $4, $5)
        `, [
          studentId,
          cand.mother_name,
          cand.email,
          cand.mother_phone,
          cand.mother_occupation || null
        ]);
      }

      // Send setup email
      try {
        const setupLink = `${request.headers.get('origin') || 'http://localhost:3000'}/auth/student/registration`;
        await sendEmail({
          to: cand.email,
          toName: cand.applicant_name,
          subject: `Admission Selected & Registration Code - ${circular.title}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #f1f5f9; border-radius: 16px;">
              <h2 style="color: #059669;">Congratulations ${cand.applicant_name}!</h2>
              <p>You have been <strong>SELECTED</strong> for admission to Class <strong>${cand.class_name}</strong> under circular "<strong>${circular.title}</strong>".</p>
              <p>Your official student registration credentials are ready below:</p>
              
              <div style="background-color: #f8fafc; padding: 16px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;">
                <p style="margin: 6px 0;"><strong>Registration Number:</strong> <code style="color: #059669; font-size: 16px; font-weight: bold;">${regNo}</code></p>
                <p style="margin: 6px 0;"><strong>Verification Code:</strong> <code style="color: #059669; font-size: 16px; font-weight: bold;">${verificationCode}</code></p>
              </div>

              <p style="text-align: center; margin: 24px 0;">
                <a href="${setupLink}" style="background-color: #059669; color: white; padding: 12px 28px; text-decoration: none; border-radius: 9999px; font-weight: bold; display: inline-block;">
                  Complete Student Portal Setup
                </a>
              </p>
            </div>
          `
        });
      } catch (mailErr) {
        console.error(`Failed to send setup email to ${cand.email}:`, mailErr);
      }

      registeredCount++;
    }

    // Update circular status to published (DO NOT DELETE student_admissions RECORDS!)
    await client.query('UPDATE admissions SET is_result_published = TRUE WHERE id = $1', [admission_id]);

    // Create Notice board post
    await client.query(`
      INSERT INTO notices (title, link, is_pinned)
      VALUES ($1, '/admission-status', FALSE)
    `, [`Admission Selection Results Published: ${circular.title}`]);

    await client.query('COMMIT');
    client.release();

    try {
      await triggerMonthlyFeeGeneration();
    } catch (feeErr) {
      console.error('Error generating monthly fee for published students:', feeErr);
    }

    return NextResponse.json({
      success: true,
      message: `Admission selection results published successfully. ${registeredCount} candidate records registered into official student accounts. Applicant data preserved.`
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rbErr) {
        console.error('Rollback error:', rbErr);
      }
      client.release();
    }
    console.error('Error publishing admission results:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
