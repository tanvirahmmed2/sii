import { queryDb, pool } from '../src/lib/database/db.js';
import { hashPassword, comparePassword } from '../src/lib/middleware/teacher.js';

async function testTeacherLifecycle() {
  console.log('=== STARTING TEACHER AUTH LIFECYCLE TESTS ===');

  try {
    // 1. Get a website
    const webRes = await queryDb(`SELECT id, name, slug, subdomain, custom_domain FROM websites LIMIT 1`);
    if (webRes.rows.length === 0) {
      throw new Error('No website found in database');
    }
    const website = webRes.rows[0];
    console.log(`[1] Using Website: ID=${website.id}, Subdomain=${website.subdomain}, CustomDomain=${website.custom_domain}`);

    // Clean up test teacher if exists
    const testEmail = 'prof.test.euler@institution.edu';
    await queryDb(`DELETE FROM website_teachers WHERE website_id = $1 AND LOWER(email) = $2`, [website.id, testEmail]);

    // 2. Simulate Staff Creating Teacher
    console.log('[2] Simulating staff creating teacher...');
    const demoPassword = `DemoPass@${Math.floor(100000 + Math.random() * 900000)}`;
    const hashedDemoPassword = await hashPassword(demoPassword);
    const verificationToken = 'test_crypto_token_' + Math.random().toString(36).substring(2) + Date.now();

    const insertRes = await queryDb(
      `INSERT INTO website_teachers (
         website_id, name, email, number, password, is_active, is_registered,
         verification_token, verification_token_expires
       ) VALUES (
         $1, $2, $3, $4, $5, TRUE, FALSE,
         $6, CURRENT_TIMESTAMP + INTERVAL '7 days'
       ) RETURNING *`,
      [website.id, 'Prof. Leonhard Euler', testEmail, '+8801700112233', hashedDemoPassword, verificationToken]
    );

    const createdTeacher = insertRes.rows[0];
    console.log(`✓ Teacher created: ID=${createdTeacher.id}`);
    console.log(`  - is_registered: ${createdTeacher.is_registered} (Expected: false)`);
    console.log(`  - verification_token set: ${Boolean(createdTeacher.verification_token)}`);
    console.log(`  - Demo password match: ${await comparePassword(demoPassword, createdTeacher.password)}`);

    if (createdTeacher.is_registered !== false) {
      throw new Error('Teacher is_registered should be false upon initial staff creation!');
    }

    // 3. Teacher Validates Verification Token
    console.log('[3] Simulating token validation on /teacher/verify (POST)...');
    const verifyLookup = await queryDb(
      `SELECT id, name, email, number, is_registered, verification_token_expires
       FROM website_teachers
       WHERE website_id = $1 AND verification_token = $2 LIMIT 1`,
      [website.id, verificationToken]
    );

    if (verifyLookup.rows.length === 0) {
      throw new Error('Verification token lookup failed!');
    }
    console.log(`✓ Token valid for teacher: ${verifyLookup.rows[0].name}`);

    // 4. Teacher Submits Personal Password on /teacher/verify (PUT)
    console.log('[4] Simulating teacher setting personal password and address (PUT)...');
    const personalPassword = 'MySecretTeacherPassword2026!';
    const hashedPersonalPassword = await hashPassword(personalPassword);

    await queryDb(
      `UPDATE website_teachers
       SET password = $1,
           address = $2,
           is_registered = TRUE,
           verification_token = NULL,
           verification_token_expires = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND website_id = $4`,
      [hashedPersonalPassword, 'Faculty Quarters, Room 402', createdTeacher.id, website.id]
    );

    const updatedTeacherRes = await queryDb(
      `SELECT id, password, is_registered, verification_token, address
       FROM website_teachers WHERE id = $1`,
      [createdTeacher.id]
    );
    const updatedTeacher = updatedTeacherRes.rows[0];

    console.log(`✓ Teacher verified:`);
    console.log(`  - is_registered: ${updatedTeacher.is_registered} (Expected: true)`);
    console.log(`  - verification_token: ${updatedTeacher.verification_token} (Expected: null)`);
    console.log(`  - Personal password match: ${await comparePassword(personalPassword, updatedTeacher.password)}`);
    console.log(`  - Demo password rejected: ${!(await comparePassword(demoPassword, updatedTeacher.password))}`);

    if (updatedTeacher.is_registered !== true || updatedTeacher.verification_token !== null) {
      throw new Error('Teacher verification did not activate account properly!');
    }

    // 5. Teacher Logs In with Personal Password
    console.log('[5] Simulating teacher login...');
    const loginMatch = await comparePassword(personalPassword, updatedTeacher.password);
    if (!loginMatch) {
      throw new Error('Teacher personal password login failed!');
    }
    console.log('✓ Teacher authenticated successfully with personal password.');

    // 6. Test Password Recovery Flow
    console.log('[6] Testing password recovery flow...');
    const recoveryToken = 'recovery_token_' + Math.random().toString(36).substring(2);
    await queryDb(
      `UPDATE website_teachers
       SET recovery_token = $1, recovery_token_expires = CURRENT_TIMESTAMP + INTERVAL '1 hour'
       WHERE id = $2`,
      [recoveryToken, createdTeacher.id]
    );

    const newRecoveredPassword = 'BrandNewRecoveredPassword2026!';
    const hashedRecoveredPassword = await hashPassword(newRecoveredPassword);

    await queryDb(
      `UPDATE website_teachers
       SET password = $1,
           recovery_token = NULL,
           recovery_token_expires = NULL
       WHERE id = $2`,
      [hashedRecoveredPassword, createdTeacher.id]
    );

    const afterRecovery = await queryDb(`SELECT password, recovery_token FROM website_teachers WHERE id = $1`, [createdTeacher.id]);
    const recoveredMatch = await comparePassword(newRecoveredPassword, afterRecovery.rows[0].password);
    console.log(`✓ Password recovery verified: match=${recoveredMatch}, recovery_token=${afterRecovery.rows[0].recovery_token}`);

    if (!recoveredMatch || afterRecovery.rows[0].recovery_token !== null) {
      throw new Error('Password recovery assertion failed!');
    }

    // Clean up test teacher
    await queryDb(`DELETE FROM website_teachers WHERE id = $1`, [createdTeacher.id]);
    console.log('✓ Cleaned up test record.');

    console.log('\n=== ALL TEACHER AUTH LIFECYCLE TESTS PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testTeacherLifecycle();
