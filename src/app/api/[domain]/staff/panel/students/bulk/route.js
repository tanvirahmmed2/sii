import { NextResponse } from 'next/server';
import crypto from 'crypto';
import * as XLSX from 'xlsx';
import { queryDb } from 'src/lib/database/db.js';
import { verifyStudentStaffAccess } from 'src/lib/middleware/student-auth.js';
import { hashPassword } from 'src/lib/middleware/students.js';
import { sendEmail, buildStyledEmail } from 'src/lib/database/brevo.js';
import { buildStudentSetupUrl } from 'src/lib/student/urls.js';
import { checkInstitutionEmailAvailability } from 'src/lib/database/emailUniqueness.js';


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
    const [deptsRes, classesRes, sectionsRes, sessionsRes] = await Promise.all([
      queryDb(`SELECT id, name, code FROM website_departments WHERE website_id = $1`, [website.id]),
      queryDb(`SELECT id, name, code, department_id FROM website_classes WHERE website_id = $1`, [website.id]),
      queryDb(`SELECT id, name, class_id FROM website_sections WHERE website_id = $1`, [website.id]),
      queryDb(`SELECT id, name FROM website_sessions WHERE website_id = $1`, [website.id]),
    ]);

    const deptsList = deptsRes.rows;
    const classesList = classesRes.rows;
    const sectionsList = sectionsRes.rows;
    const sessionsList = sessionsRes.rows;

    const findDepartmentId = (val) => {
      if (!val) return null;
      const str = String(val).trim().toLowerCase();
      const found = deptsList.find(
        (d) => (d.code && d.code.toLowerCase() === str) || d.name.toLowerCase() === str || String(d.id) === str
      );
      return found ? found.id : null;
    };

    const findClassId = (val) => {
      if (!val) return null;
      const str = String(val).trim().toLowerCase();
      const found = classesList.find(
        (c) => (c.code && c.code.toLowerCase() === str) || c.name.toLowerCase() === str || String(c.id) === str
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
      const deptInput = row.Department || row['Department Name'] || row.department_id || row.department || '';
      const classInput = row.Class || row['Class Code'] || row['Class Name'] || row.class_id || '';
      const sectionInput = row.Section || row['Section Name'] || row.section_id || '';
      const sessionInput = row.Session || row['Session Name'] || row.session_id || '';
      const email = (row.Email || row['Email Address'] || row.email || '').trim().toLowerCase() || null;
      const rollNo = (row.Roll || row['Roll No'] || row['Roll Number'] || row.roll_no || '').trim() || null;

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

      const matchedClass = classesList.find((c) => String(c.id) === String(resolvedClassId));
      const resolvedDeptId = findDepartmentId(deptInput) || matchedClass?.department_id || null;
      const resolvedSessionId = findSessionId(sessionInput) || matchedClass?.session_id || null;
      const resolvedSectionId = findSectionId(sectionInput, resolvedClassId);

      // Check duplicate email across all roles if email was provided
      if (email) {
        const emailAvail = await checkInstitutionEmailAvailability(website.id, email);
        if (!emailAvail.available) {
          results.failed++;
          results.errors.push({ row: rowIdx, email, registration_no: rawReg, error: emailAvail.message });
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

      const studentUniqueId = `STU-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

      try {
        const insertRes = await queryDb(
          `INSERT INTO website_students (
              website_id, department_id, session_id, class_id, section_id,
              registration_no, roll_no, email, student_unique_id, is_active
           )
           VALUES (
              $1, $2, $3, $4, $5,
              $6, $7, $8, $9, FALSE
           )
           RETURNING id, registration_no, roll_no, student_unique_id, email`,
          [
            website.id,
            resolvedDeptId,
            resolvedSessionId,
            resolvedClassId,
            resolvedSectionId,
            regNo,
            rollNo || null,
            email || null,
            studentUniqueId,
          ]
        );

        const newStudent = insertRes.rows[0];

        // Send setup notification email via Brevo if email is provided
        if (email) {
          try {
            const setupUrl = `/auth/student/setup`;
            const emailHtml = buildStyledEmail({
              title: `Student Account Setup - ${website.name || 'Portal'}`,
              recipientName: 'Student',
              paragraphs: [
                `You have been registered at <strong>${website.name || 'our institution'}</strong>.`,
                `Your registration number is: <strong>${newStudent.registration_no}</strong>`,
                `Please complete your student account setup by verifying your email and configuring your credentials.`,
              ],
              buttonText: 'Complete Account Setup',
              buttonUrl: setupUrl,
              footerNote: 'If you did not request this registration, please contact your administration office.'
            });

            await sendEmail({
              to: email,
              toName: 'Student',
              subject: `Student Account Setup - ${website.name || 'Portal'}`,
              html: emailHtml,
              websiteId: website.id,
            });
          } catch (mailErr) {
            console.warn(`[BulkRegister] Mail dispatch skipped for ${email}:`, mailErr.message);
          }
        }

        results.successful++;
        results.created.push({
          row: rowIdx,
          id: newStudent.id,
          registration_no: newStudent.registration_no,
          student_unique_id: newStudent.student_unique_id,
          email: newStudent.email,
        });
      } catch (insertErr) {
        results.failed++;
        results.errors.push({
          row: rowIdx,
          registration_no: regNo,
          error: insertErr.message || 'Database insert failed.',
        });
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
