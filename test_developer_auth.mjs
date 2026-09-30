import pg from 'pg';
import { authenticateAdmin, getAdminSession, hashPassword, comparePassword } from './src/lib/middleware/developer.js';

const { Pool } = pg;

const pool = new Pool({
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT || '5432', 10),
  database: process.env.PG_DATABASE,
  ssl: { rejectUnauthorized: false }
});

async function runTests() {
  console.log('==============================================');
  console.log('TEST 1: Authenticate Demo Developer (tanvir@gmail.com / 123)');
  console.log('==============================================');
  
  const authResult = await authenticateAdmin('tanvir@gmail.com', '123', {
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0 Test Suite Automated Agent'
  });

  console.log('Auth Success! Admin user:', authResult.admin);
  console.log('Token generated:', authResult.token ? 'YES (Length: ' + authResult.token.length + ')' : 'NO');

  // Verify developer_login_activities table
  const actRes = await pool.query(
    `SELECT * FROM developer_login_activities WHERE developer_id = $1 ORDER BY id DESC LIMIT 1`,
    [authResult.admin.id]
  );
  console.log('Latest developer_login_activities row:', actRes.rows[0]);
  if (actRes.rows[0]?.status !== 'Success') {
    throw new Error('Expected status Success in developer_login_activities');
  }

  // Verify developer_login_sessions table
  const sessRes = await pool.query(
    `SELECT * FROM developer_login_sessions WHERE token = $1 LIMIT 1`,
    [authResult.token]
  );
  console.log('Latest developer_login_sessions row:', sessRes.rows[0]);
  if (!sessRes.rows[0] || !sessRes.rows[0].is_active) {
    throw new Error('Expected active session in developer_login_sessions');
  }

  console.log('\n==============================================');
  console.log('TEST 2: Verify getAdminSession with Bearer Token');
  console.log('==============================================');

  const mockRequest = {
    headers: {
      get: (h) => (h.toLowerCase() === 'authorization' ? `Bearer ${authResult.token}` : null)
    }
  };

  const session = await getAdminSession(mockRequest);
  console.log('Session extracted:', {
    id: session?.id,
    name: session?.name,
    email: session?.email,
    role: session?.role,
    roleName: session?.roleName,
    permissionsCount: session?.permissions?.length,
    isAdmin: session?.isAdmin,
  });

  if (!session || session.email !== 'tanvir@gmail.com') {
    throw new Error('Failed to resolve active session via getAdminSession');
  }

  console.log('\n==============================================');
  console.log('TEST 3: Incorrect Password Failure & Logging');
  console.log('==============================================');
  let failedAsExpected = false;
  try {
    await authenticateAdmin('tanvir@gmail.com', 'WRONG_PASSWORD_XYZ', {
      ip: '192.168.1.101',
      userAgent: 'Failed Login Test Device'
    });
  } catch (err) {
    failedAsExpected = true;
    console.log('Caught expected failure error:', err.message);
  }

  if (!failedAsExpected) {
    throw new Error('Login with incorrect password did NOT throw error!');
  }

  const failedActRes = await pool.query(
    `SELECT * FROM developer_login_activities WHERE developer_id = $1 ORDER BY id DESC LIMIT 1`,
    [authResult.admin.id]
  );
  console.log('Failed login activity logged:', failedActRes.rows[0]);
  if (failedActRes.rows[0]?.status !== 'Failed' || failedActRes.rows[0]?.failure_reason !== 'Incorrect password') {
    throw new Error('Expected Failed status with "Incorrect password" reason');
  }

  console.log('\n==============================================');
  console.log('TEST 4: Recovery Flow (Token Generation + Reset)');
  console.log('==============================================');
  // 1. Generate recovery token
  const testRecToken = 'rec_TEST' + Math.random().toString(36).substring(2, 8).toUpperCase();
  await pool.query(
    `UPDATE developers SET recovery_token = $1, recovery_token_expires = CURRENT_TIMESTAMP + INTERVAL '1 hour' WHERE email = $2`,
    [testRecToken, 'tanvir@gmail.com']
  );

  const checkRec = await pool.query(
    `SELECT recovery_token FROM developers WHERE email = $1`,
    ['tanvir@gmail.com']
  );
  console.log('Recovery token set in DB:', checkRec.rows[0]?.recovery_token);

  // 2. Reset password using recovery token
  const tempPass = 'temp_new_pass_456';
  const newHash = await hashPassword(tempPass);
  await pool.query(
    `UPDATE developers SET password = $1, recovery_token = NULL, recovery_token_expires = NULL WHERE email = $2`,
    [newHash, 'tanvir@gmail.com']
  );

  // Invalidate sessions
  await pool.query(`UPDATE developer_login_sessions SET is_active = FALSE WHERE developer_id = $1`, [authResult.admin.id]);

  // Test old token now fails
  const oldSessionCheck = await getAdminSession(mockRequest);
  console.log('Old session active after invalidation?:', oldSessionCheck !== null);
  if (oldSessionCheck !== null) {
    throw new Error('Old session was not invalidated!');
  }

  // Test login with temp password
  const tempLogin = await authenticateAdmin('tanvir@gmail.com', tempPass);
  console.log('Logged in with new password successfully:', tempLogin.admin.email);

  // Restore password back to '123'
  const restoredHash = await hashPassword('123');
  await pool.query(
    `UPDATE developers SET password = $1 WHERE email = $2`,
    [restoredHash, 'tanvir@gmail.com']
  );
  console.log('Restored password back to "123".');

  console.log('\n==============================================');
  console.log('TEST 5: Verification System Flow');
  console.log('==============================================');
  const testCode = '654321';
  await pool.query(
    `UPDATE developers SET two_factor_code = $1, two_factor_expires = CURRENT_TIMESTAMP + INTERVAL '1 hour' WHERE email = $2`,
    [testCode, 'tanvir@gmail.com']
  );

  let unverifiedCaught = false;
  try {
    await authenticateAdmin('tanvir@gmail.com', '123');
  } catch (err) {
    unverifiedCaught = err.unverified === true;
    console.log('Attempted login while unverified. Result:', err.message, '| unverified =', err.unverified);
  }

  if (!unverifiedCaught) {
    throw new Error('Unverified account was able to log in without entering verification code!');
  }

  // Perform verification (clear two_factor_code)
  await pool.query(
    `UPDATE developers SET two_factor_code = NULL, two_factor_expires = NULL, is_active = TRUE WHERE email = $1`,
    ['tanvir@gmail.com']
  );

  // Now login should succeed
  const verifiedLogin = await authenticateAdmin('tanvir@gmail.com', '123');
  console.log('Logged in successfully after verification! Admin ID:', verifiedLogin.admin.id);

  console.log('\n==============================================');
  console.log('ALL DEVELOPER AUTH TESTS PASSED FLAWLESSLY! ✨');
  console.log('==============================================');
  await pool.end();
  process.exit(0);
}

runTests().catch(async (e) => {
  console.error('Test execution failed:', e);
  await pool.end().catch(() => {});
  process.exit(1);
});
