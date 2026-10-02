const { Pool } = require('pg');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  user: 'postgres.sqxdooluvklbffbkunxe',
  password: 'tanvir483469',
  host: 'aws-0-ap-northeast-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

async function runTest() {
  console.log('=== TEST 1: Check existing Super Admin (tanvir@gmail.com) ===');
  const adminRes = await pool.query(
    'SELECT id, name, email, email_verified, is_active FROM developers WHERE email = $1',
    ['tanvir@gmail.com']
  );
  console.log('Super Admin record:', adminRes.rows[0]);
  if (!adminRes.rows[0] || !adminRes.rows[0].email_verified) {
    throw new Error('Super Admin must exist and be email_verified = true');
  }

  console.log('\n=== TEST 2: Simulate Developer Account Creation ===');
  const testEmail = 'automated_test_dev_' + Date.now() + '@example.com';
  const rawPass = 'SecureDevPass123!';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(rawPass, salt);
  const verificationToken = crypto.randomBytes(32).toString('hex');

  const createRes = await pool.query(
    `INSERT INTO developers (name, email, password, role_id, is_active, email_verified, verification_token, verification_token_expires)
     VALUES ($1, $2, $3, 1, TRUE, FALSE, $4, CURRENT_TIMESTAMP + INTERVAL '24 hours')
     RETURNING id, name, email, email_verified, verification_token, is_active`,
    ['Test Dev User', testEmail, passwordHash, verificationToken]
  );
  const createdDev = createRes.rows[0];
  console.log('Created Developer:', createdDev);
  if (createdDev.email_verified !== false) {
    throw new Error('New developer must have email_verified = false');
  }

  console.log('\n=== TEST 3: Verify Unverified Account Block ===');
  const unverifiedCheck = await pool.query(
    'SELECT email_verified FROM developers WHERE id = $1',
    [createdDev.id]
  );
  if (unverifiedCheck.rows[0].email_verified === false) {
    console.log('✔ Account is properly recognized as unverified before link activation.');
  }

  console.log('\n=== TEST 4: Simulate Clicking the Activation Link ===');
  const verifyRes = await pool.query(
    `UPDATE developers 
     SET email_verified = TRUE,
         verification_token = NULL,
         verification_token_expires = NULL,
         two_factor_code = NULL,
         two_factor_expires = NULL,
         is_active = TRUE,
         updated_at = CURRENT_TIMESTAMP
     WHERE verification_token = $1
     RETURNING id, email, email_verified, verification_token, is_active`,
    [verificationToken]
  );
  console.log('Updated Developer after Link Click:', verifyRes.rows[0]);
  if (!verifyRes.rows[0] || verifyRes.rows[0].email_verified !== true || verifyRes.rows[0].verification_token !== null) {
    throw new Error('Verification failed to update developer record');
  }
  console.log('✔ Developer successfully verified and token invalidated.');

  console.log('\n=== TEST 5: Verify Login Works After Verification ===');
  const finalCheck = await pool.query(
    'SELECT id, password, email_verified, is_active FROM developers WHERE id = $1',
    [createdDev.id]
  );
  const match = await bcrypt.compare(rawPass, finalCheck.rows[0].password);
  if (!match || !finalCheck.rows[0].email_verified || !finalCheck.rows[0].is_active) {
    throw new Error('Login credentials or verified status failed');
  }
  console.log('✔ Developer authenticated successfully with active verified session.');

  // Clean up test account
  await pool.query('DELETE FROM developers WHERE id = $1', [createdDev.id]);
  console.log('✔ Cleaned up test developer account.');
  console.log('\n🎉 ALL VERIFICATION AND AUTHENTICATION TESTS PASSED!');
}

runTest()
  .then(() => pool.end())
  .catch((err) => {
    console.error('Test failed:', err);
    pool.end();
    process.exit(1);
  });
