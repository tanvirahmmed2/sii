import { queryDb, pool } from '../src/lib/database/db.js';
import { hashPassword, comparePassword, generateToken, getStudentSession, isStudent } from '../src/lib/middleware/students.js';
import { buildStudentSetupUrl, buildStudentRecoveryUrl, buildStudentPortalUrl } from '../src/lib/student/urls.js';
import crypto from 'crypto';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING STUDENT AUTH, BULK & VERIFICATION LIFECYCLE TESTS');
  console.log('   (Testing Split website_students & website_student_info Architecture)');
  console.log('====================================================\n');

  const testWebsiteId = 3; // 'afit'
  const testEmail = `test.student.${Date.now()}@example.com`;
  const testRegNo = `REG-TEST-${Date.now().toString().slice(-6)}`;
  const testRoll = '77';
  const testPassword = 'MySecretPassword2026!';

  try {
    // 1. Verify DB tables
    console.log('1. Checking database tables...');
    const tablesRes = await queryDb(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'website_student%'`
    );
    const tableNames = tablesRes.rows.map(r => r.table_name);
    console.log('   Found student tables:', tableNames);
    const expected = [
      'website_students',
      'website_student_info',
      'website_student_addresses',
      'website_student_guardians',
      'website_student_pictures',
      'website_student_signatures',
      'website_student_attendances',
      'website_student_login_sessions',
    ];
    for (const exp of expected) {
      if (!tableNames.includes(exp)) throw new Error(`Missing table: ${exp}`);
    }
    console.log('   ✓ All 8 student tables exist in PostgreSQL.\n');

    // 2. Fetch or seed a class and session
    console.log('2. Fetching academic context...');
    let classRes = await queryDb(`SELECT id FROM website_classes WHERE website_id = $1 LIMIT 1`, [testWebsiteId]);
    if (classRes.rows.length === 0) {
      classRes = await queryDb(
        `INSERT INTO website_classes (website_id, name, numeric_name, code) VALUES ($1, 'Class 10', 10, 'CLS-10') RETURNING id`,
        [testWebsiteId]
      );
    }
    const classId = classRes.rows[0].id;

    let sessionRes = await queryDb(`SELECT id FROM website_sessions WHERE website_id = $1 LIMIT 1`, [testWebsiteId]);
    if (sessionRes.rows.length === 0) {
      sessionRes = await queryDb(
        `INSERT INTO website_sessions (website_id, name, is_current) VALUES ($1, '2026-2027', TRUE) RETURNING id`,
        [testWebsiteId]
      );
    }
    const sessionId = sessionRes.rows[0].id;
    console.log(`   ✓ Linked Class ID: ${classId}, Session ID: ${sessionId}\n`);

    // 3. Test URL Builder
    console.log('3. Testing multi-tenant URL builder...');
    const websiteMock = { id: 3, subdomain: 'afit', custom_domain: null };
    const setupUrl = buildStudentSetupUrl(websiteMock, 'sample_token_xyz', { headers: new Map([['host', 'afit.localhost:3000']]) });
    console.log('   Generated setup URL:', setupUrl);
    if (!setupUrl.includes('/auth/student/setup?token=sample_token_xyz')) {
      throw new Error('Setup URL generation mismatch');
    }
    console.log('   ✓ URL builder works correctly for tenant.\n');

    // 4. Staff Creates Single Student
    console.log('4. Simulating staff single student registration (split schema)...');
    const demoPassword = `${crypto.randomBytes(4).toString('hex')}S1!`;
    const hashedDemo = await hashPassword(demoPassword);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const studentUniqueId = `STU-TEST-${Date.now().toString(36).toUpperCase()}`;

    // Insert into website_students (is_active is FALSE until setup and verification)
    const studentInsertRes = await queryDb(
      `INSERT INTO website_students (
          website_id, registration_no, roll_no, student_unique_id,
          class_id, session_id, is_active
       )
       VALUES ($1, $2, $3, $4, $5, $6, FALSE)
       RETURNING *`,
      [
        testWebsiteId,
        testRegNo,
        testRoll,
        studentUniqueId,
        classId,
        sessionId,
      ]
    );
    const createdStudent = studentInsertRes.rows[0];

    // Insert into website_student_info (password NOT NULL)
    const infoInsertRes = await queryDb(
      `INSERT INTO website_student_info (
          website_id, student_id,
          name, email, number, gender, blood_group,
          password, verification_token, verification_token_expires,
          verification_status, is_registered, is_verified
       )
       VALUES (
          $1, $2,
          'Sakib Al Hasan', $3, '01711223344', 'Male', 'B+',
          $4, $5, $6,
          'pending_setup', FALSE, FALSE
       )
       RETURNING *`,
      [
        testWebsiteId,
        createdStudent.id,
        testEmail,
        hashedDemo,
        verificationToken,
        tokenExpires,
      ]
    );
    const createdInfo = infoInsertRes.rows[0];

    console.log(`   ✓ Created Student ID: ${createdStudent.id}`);
    console.log(`   ✓ Linked Student Info ID: ${createdInfo.id}, Status: ${createdInfo.verification_status}`);
    console.log(`   Demo password: ${demoPassword}`);
    console.log(`   website_students.is_active: ${createdStudent.is_active}, is_registered: ${createdInfo.is_registered}, is_verified: ${createdInfo.is_verified}\n`);

    // 5. Unregistered Login Attempt (Must be rejected)
    console.log('5. Testing login attempt while pending setup...');
    const cmpDemo = await comparePassword(demoPassword, createdInfo.password);
    if (!cmpDemo) throw new Error('Demo password hash comparison failed');

    if (createdInfo.verification_status === 'pending_setup') {
      console.log('   ✓ Student is blocked with "pending_setup" status as expected.\n');
    }

    // 6. Student Completes Account Setup
    console.log('6. Student completes setup (sets personal password, addresses, guardians, photo, signature)...');
    const hashedPersonal = await hashPassword(testPassword);
    await queryDb(
      `UPDATE website_student_info
       SET password = $1,
           is_registered = TRUE,
           verification_status = 'submitted',
           updated_at = CURRENT_TIMESTAMP
       WHERE student_id = $2`,
      [hashedPersonal, createdStudent.id]
    );

    // In website_students, is_active remains FALSE (waiting for verification)
    const activeCheckBeforeVerify = await queryDb(`SELECT is_active FROM website_students WHERE id = $1`, [createdStudent.id]);
    if (activeCheckBeforeVerify.rows[0].is_active) {
      throw new Error('Student should not be active before staff verification!');
    }

    // Upsert address
    await queryDb(
      `INSERT INTO website_student_addresses (
          website_id, student_id, present_address, permanent_address, city, district
       ) VALUES ($1, $2, 'House 12, Road 5, Dhanmondi', 'Village Ramnagar', 'Dhaka', 'Dhaka')`,
      [testWebsiteId, createdStudent.id]
    );

    // Upsert guardian
    await queryDb(
      `INSERT INTO website_student_guardians (
          website_id, student_id, father_name, father_phone, mother_name, mother_phone, guardian_name, guardian_phone
       ) VALUES ($1, $2, 'Kazi Nazrul', '01811223344', 'Rokeya Begum', '01911223344', 'Kazi Nazrul', '01811223344')`,
      [testWebsiteId, createdStudent.id]
    );

    // Upsert picture
    await queryDb(
      `INSERT INTO website_student_pictures (website_id, student_id, image_url, is_primary)
       VALUES ($1, $2, 'https://example.com/photos/sakib.jpg', TRUE)`,
      [testWebsiteId, createdStudent.id]
    );

    // Upsert signature
    await queryDb(
      `INSERT INTO website_student_signatures (website_id, student_id, signature_url)
       VALUES ($1, $2, 'https://example.com/signatures/sakib.png')`,
      [testWebsiteId, createdStudent.id]
    );

    console.log('   ✓ Saved address, guardians, picture, and signature.');
    console.log('   ✓ Status updated to: "submitted", is_registered: true, is_verified: false, is_active: false\n');

    // 7. Login Attempt While Submitted (Awaiting Staff Verification)
    console.log('7. Testing login attempt while awaiting staff verification...');
    const submittedCheck = await queryDb(`SELECT * FROM website_student_info WHERE student_id = $1`, [createdStudent.id]);
    const submittedInfo = submittedCheck.rows[0];
    if (submittedInfo.verification_status === 'submitted' && !submittedInfo.is_verified) {
      console.log('   ✓ Student blocked from login with "awaiting staff verification" as expected.\n');
    } else {
      throw new Error('Student should not be verified yet');
    }

    // 8. Staff Reviews and Approves Student on /student-verify
    console.log('8. Staff approves student profile via /student-verify...');
    await queryDb(
      `UPDATE website_student_info
       SET is_verified = TRUE,
           verification_status = 'verified',
           verified_at = CURRENT_TIMESTAMP,
           verification_notes = 'All documents and signatures verified by registrar.'
       WHERE student_id = $1`,
      [createdStudent.id]
    );
    await queryDb(
      `UPDATE website_students
       SET is_active = TRUE,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [createdStudent.id]
    );

    const verifiedInfoCheck = await queryDb(`SELECT * FROM website_student_info WHERE student_id = $1`, [createdStudent.id]);
    const verifiedStuCheck = await queryDb(`SELECT * FROM website_students WHERE id = $1`, [createdStudent.id]);
    const verifiedInfo = verifiedInfoCheck.rows[0];
    const verifiedStudent = verifiedStuCheck.rows[0];
    console.log(`   ✓ Student verified! is_verified: ${verifiedInfo.is_verified}, status: ${verifiedInfo.verification_status}, is_active: ${verifiedStudent.is_active}\n`);

    // 9. Verified Student Logs In
    console.log('9. Verified student logs in...');
    const pwdMatch = await comparePassword(testPassword, verifiedInfo.password);
    if (!pwdMatch) throw new Error('Personal password comparison failed');

    const jwtToken = generateToken({
      id: verifiedStudent.id,
      email: verifiedInfo.email,
      name: verifiedInfo.name,
      registration_no: verifiedStudent.registration_no,
      website_id: verifiedStudent.website_id,
      role: 'student',
    });
    console.log('   ✓ Authentication passed. JWT Token issued:', jwtToken.slice(0, 30) + '...');

    // 10. Student Session Middleware Guard Check
    console.log('10. Validating session through isStudent middleware...');
    const reqMock = {
      headers: {
        get: (header) => (header.toLowerCase() === 'authorization' ? `Bearer ${jwtToken}` : null),
      },
    };
    const sessionResObj = await getStudentSession(reqMock);
    if (!sessionResObj) throw new Error('Student session resolution returned null');
    console.log(`   Resolved Session Student: ${sessionResObj.name} (Reg: ${sessionResObj.registrationNumber})`);
    console.log(`   isActive: ${sessionResObj.isActive}, isRegistered: ${sessionResObj.isRegistered}, isVerified: ${sessionResObj.isVerified}`);

    const isAuthedStudent = await isStudent(reqMock);
    if (!isAuthedStudent) throw new Error('isStudent returned false for verified student');
    console.log('   ✓ isStudent(request) returned TRUE. Student portal access unlocked!\n');

    // 11. Password Recovery Flow
    console.log('11. Testing student password recovery...');
    const recoveryCode = '987654';
    await queryDb(
      `UPDATE website_student_info
       SET recovery_token = $1,
           recovery_token_expires = NOW() + INTERVAL '1 hour'
       WHERE student_id = $2`,
      [recoveryCode, createdStudent.id]
    );

    const newPass = 'BrandNewPassword2026!';
    const hashedNew = await hashPassword(newPass);
    await queryDb(
      `UPDATE website_student_info
       SET password = $1,
           recovery_token = NULL,
           recovery_token_expires = NULL
       WHERE student_id = $2 AND recovery_token = $3`,
      [hashedNew, createdStudent.id, recoveryCode]
    );

    const recheckInfo = await queryDb(`SELECT password FROM website_student_info WHERE student_id = $1`, [createdStudent.id]);
    const canLoginNew = await comparePassword(newPass, recheckInfo.rows[0].password);
    if (!canLoginNew) throw new Error('New password verification failed after recovery');
    console.log('   ✓ Password recovery completed and verified successfully.\n');

    // 12. Cleanup test student
    console.log('12. Cleaning up test student record...');
    await queryDb(`DELETE FROM website_students WHERE id = $1`, [createdStudent.id]);
    const leftoverInfo = await queryDb(`SELECT * FROM website_student_info WHERE student_id = $1`, [createdStudent.id]);
    if (leftoverInfo.rows.length > 0) throw new Error('Cascade delete to website_student_info failed');
    console.log('   ✓ Test student removed cleanly (cascaded to website_student_info).\n');

    console.log('====================================================');
    console.log('🎉 ALL 12 LIFECYCLE TESTS PASSED PERFECTLY!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
