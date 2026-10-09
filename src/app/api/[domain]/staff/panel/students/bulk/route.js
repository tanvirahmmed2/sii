import { NextResponse } from 'next/server';
import crypto from 'crypto';
import * as XLSX from 'xlsx';
import { queryDb } from 'src/lib/database/db.js';
import { verifyStudentStaffAccess } from 'src/lib/middleware/student-auth.js';
import { hashPassword } from 'src/lib/middleware/students.js';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo.js';
import { buildStudentSetupUrl } from 'src/lib/student/urls.js';

export async function POST(request, context) {
  try {
    const auth = await verifyStudentStaffAccess(request, context, 'create');
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { website } = auth;
    const contentType = request.headers.get('content-type') || '';

    let rawRows = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!file || typeof file === 'string') {
        return NextResponse.json({ success: false, error: 'Excel or CSV file is required.' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return NextResponse.json({ success: false, error: 'Spreadsheet has no sheets.' }, { status: 400 });
      }

      const worksheet = workbook.Sheets[firstSheetName];
      rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    } else {
      const body = await request.json();
      rawRows = Array.isArray(body.students) ? body.students : (Array.isArray(body) ? body : []);
    }

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({ success: false, error: 'No student records found to import.' }, { status: 400 });
    }

    // Pre-fetch academic references for this institution
    const [classesRes, sectionsRes, sessionsRes] = await Promise.all([
      queryDb(`SELECT id, name, code FROM website_classes WHERE website_id = $1`, [website.id]),
      queryDb(`SELECT id, name, class_id FROM website_sections WHERE website_id = $1`, [website.id]),
      queryDb(`SELECT id, name FROM website_sessions WHERE website_id = $1`, [website.id]),
    ]);

    const classesList = classesRes.rows;
    const sectionsList = sectionsRes.rows;
    const sessionsList = sessionsRes.rows;

    const findClassId = (val) => {
      if (!val) return null;
      const str = String(val).trim().toLowerCase();
      const found = classesList.find(
        (c) => c.code.toLowerCase() === str || c.name.toLowerCase() === str || String(c.id) === str
      );
      return found ? found.id : null;
    };

    const findSectionId = (val, classId) => {
      if (!val) return null;
      const str = String(val).trim().toLowerCase();
      const found = sectionsList.find(
        (s) =>
          (!classId || String(s.class_id) === String(classId)) &&
          (s.name.toLowerCase() === str || String(s.id) === str)
      );
      return found ? found.id : null;
    };

    const findSessionId = (val) => {
      if (!val) return null;
      const str = String(val).trim().toLowerCase();
      const found = sessionsList.find(
        (s) => s.name.toLowerCase() === str || String(s.id) === str
      );
      return found ? found.id : null;
    };

    const results = {
      total: rawRows.length,
      successful: 0,
      failed: 0,
      created: [],
      errors: [],
    };

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowIdx = i + 1;

      // Extract normalized values from row
      const rawReg = (row.Registration || row['Registration No'] || row['Registration Number'] || row.registration_no || row.reginumber || row['Reg No'] || '').trim();
      const classInput = row.Class || row['Class Code'] || row['Class Name'] || row.class_id || '';
      const sectionInput = row.Section || row['Section Name'] || row.section_id || '';
      const sessionInput = row.Session || row['Session Name'] || row.session_id || '';
      const name = (row.Name || row['Student Name'] || row.name || '').trim() || null;
      const email = (row.Email || row['Email Address'] || row.email || '').trim().toLowerCase() || null;
      const phone = (row.Phone || row.Number || row.Mobile || row['Phone Number'] || row.phone || '').trim() || null;
      const rollNo = (row.Roll || row['Roll No'] || row['Roll Number'] || row.roll_no || '').trim() || null;
      const gender = (row.Gender || row.gender || 'Male').trim();
      const bloodGroup = (row['Blood Group'] || row.BloodGroup || row.blood_group || '').trim() || null;
      const rawDob = row['Date of Birth'] || row.DOB || row.dob || null;
      const religion = (row.Religion || row.religion || '').trim() || null;

      if (!rawReg) {
        results.failed++;
        results.errors.push({ row: rowIdx, error: 'Registration number is missing.' });
        continue;
      }

      const resolvedClassId = findClassId(classInput);
      if (!resolvedClassId) {
        results.failed++;
        results.errors.push({ row: rowIdx, registration_no: rawReg, error: `Class "${classInput || 'Blank'}" could not be matched.` });
        continue;
      }

      // Check duplicate email if email was provided
      if (email) {
        const emailCheck = await queryDb(
          `SELECT id FROM website_student_info WHERE website_id = $1 AND LOWER(email) = $2 LIMIT 1`,
          [website.id, email]
        );
        if (emailCheck.rows.length > 0) {
          results.failed++;
          results.errors.push({ row: rowIdx, email, registration_no: rawReg, error: 'Email already registered.' });
          continue;
        }
      }

      const regNo = rawReg;

      // Check duplicate registration_no
      const regCheck = await queryDb(
        `SELECT id FROM website_students WHERE website_id = $1 AND registration_no = $2 LIMIT 1`,
        [website.id, regNo]
      );
      if (regCheck.rows.length > 0) {
        results.failed++;
        results.errors.push({ row: rowIdx, registration_no: regNo, error: 'Registration number already exists.' });
        continue;
      }

      const resolvedSectionId = findSectionId(sectionInput, resolvedClassId);
      const resolvedSessionId = findSessionId(sessionInput);

      const studentUniqueId = `STU-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
      const demoPassword = `${crypto.randomBytes(4).toString('hex')}S1!`;
      const hashedPassword = await hashPassword(demoPassword);
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const tokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      try {
        const insertRes = await queryDb(
          `INSERT INTO website_students (
              website_id, registration_no, roll_no, student_unique_id,
              class_id, section_id, session_id, is_active
           )
           VALUES (
              $1, $2, $3, $4,
              $5, $6, $7, FALSE
           )
           RETURNING id, registration_no, student_unique_id`,
          [
            website.id,
            regNo,
            rollNo || null,
            studentUniqueId,
            resolvedClassId,
            resolvedSectionId,
            resolvedSessionId,
          ]
        );

        const newStudent = insertRes.rows[0];

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
              $8, $9, CURRENT_DATE,
              $10, $11, $12,
              'pending_setup', FALSE, FALSE
           )
           RETURNING id, name, email`,
          [
            website.id,
            newStudent.id,
            name || null,
            email || null,
            phone || null,
            ['Male', 'Female', 'Other'].includes(gender) ? gender : 'Male',
            bloodGroup || null,
            rawDob ? new Date(rawDob) : null,
            religion || null,
            hashedPassword,
            verificationToken,
            tokenExpires,
          ]
        );

        const newInfo = insertInfoRes.rows[0];

        // Build setup URL and dispatch Brevo invitation email
        const setupUrl = buildStudentSetupUrl(website, verificationToken, request);

        try {
          const emailHtml = buildStyledEmail({
            title: `Welcome to ${website.name || 'Institutional Portal'}`,
            preheader: `Complete your student account setup and enrollment credentials.`,
            websiteName: website.name || 'Educational Management Platform',
            bodyContent: `
              <p>Dear <strong>${newStudent.name}</strong>,</p>
              <p>You have been enrolled as a student at <strong>${website.name || 'our institution'}</strong>. Please finalize your enrollment and set your personal account password by clicking the button below.</p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin: 16px 0; font-size: 13px;">
                <p style="margin: 0 0 6px 0;"><strong>Registration Number:</strong> <span style="font-family: monospace;">${newStudent.registration_no}</span></p>
                <p style="margin: 0 0 6px 0;"><strong>Student Unique ID:</strong> <span style="font-family: monospace;">${newStudent.student_unique_id}</span></p>
                <p style="margin: 0;"><strong>Initial Demo Password:</strong> <span style="font-family: monospace; color: #475569;">${demoPassword}</span></p>
              </div>
              <p style="font-size: 13px; color: #64748b;">Once you submit your profile details, our staff administration will review and verify your account for Student Portal access.</p>
            `,
            ctaButton: {
              label: 'Setup Student Account →',
              url: setupUrl,
            },
          });

          await sendEmail({
            to: email,
            toName: newStudent.name,
            subject: `Complete Your Student Account Setup - ${website.name || 'Portal'}`,
            html: emailHtml,
            websiteId: website.id,
          });
        } catch (emailErr) {
          console.warn(`Bulk email dispatch failed for ${email}:`, emailErr.message);
        }

        results.successful++;
        results.created.push({
          id: newStudent.id,
          name: newStudent.name,
          email: newStudent.email,
          registration_no: newStudent.registration_no,
        });
      } catch (insertErr) {
        results.failed++;
        results.errors.push({ row: rowIdx, name, email, error: insertErr.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Batch import complete. Successfully imported ${results.successful} of ${results.total} students.`,
      payload: results,
    });
  } catch (error) {
    console.error('Error in bulk student import:', error);
    return NextResponse.json({ success: false, error: 'Bulk import failed: ' + error.message }, { status: 500 });
  }
}
