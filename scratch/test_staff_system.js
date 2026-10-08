import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { queryDb } from '../src/lib/database/db.js';
import { JWT_SECRET } from '../src/lib/database/secret.js';
import {
  getStaffSession,
  createStaffSession,
  revokeStaffSession,
  hasStaffModulePermission,
} from '../src/lib/middleware/staff.js';

const DEFAULT_JWT_SECRET = JWT_SECRET || 'developer_superadmin_jwt_secret_key_2026';

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(String(password), String(hash));
}

function signJWT(payload, expiresIn = '7d') {
  return jwt.sign(payload, DEFAULT_JWT_SECRET, { expiresIn });
}

async function runTests() {
  console.log('=== RUNNING STAFF SYSTEM VERIFICATION TESTS ===\n');

  try {
    // TEST 1: Database Columns Check
    console.log('TEST 1: Verifying DB schema...');
    const roleCol = await queryDb(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'website_staffs' AND column_name = 'role'
    `);
    console.log('Role column in website_staffs count (must be 0):', roleCol.rows.length);
    if (roleCol.rows.length !== 0) throw new Error('Role column still exists in website_staffs!');

    const permCols = await queryDb(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'staff_permissions'
    `);
    console.log('staff_permissions column count:', permCols.rows.length);
    if (permCols.rows.length < 5) throw new Error('staff_permissions table incomplete!');

    const sessCols = await queryDb(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'staff_sessions'
    `);
    console.log('staff_sessions column count:', sessCols.rows.length);
    if (sessCols.rows.length < 5) throw new Error('staff_sessions table incomplete!');
    console.log('-> TEST 1 PASSED: Database schema is valid.\n');

    // TEST 2: Find a test website (e.g. afit)
    console.log('TEST 2: Finding website...');
    const webRes = await queryDb(`SELECT id, name, subdomain, slug FROM websites LIMIT 1`);
    if (webRes.rows.length === 0) throw new Error('No websites found in DB!');
    const website = webRes.rows[0];
    console.log(`Using website: id=${website.id}, name="${website.name}", slug="${website.slug}"`);

    // TEST 3: Create a test staff member with password
    console.log('TEST 3: Creating test staff member...');
    const testEmail = `test_staff_${Date.now()}@example.com`;
    const plainPass = 'StaffSecret123!';
    const hashed = await hashPassword(plainPass);

    const staffInsert = await queryDb(`
      INSERT INTO website_staffs (
        website_id, name, email, number, address, password,
        is_active, is_registered, username
      )
      VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE, $7)
      RETURNING *
    `, [
      website.id,
      'Test Staff Officer',
      testEmail,
      '+8801700000000',
      'Campus Administrative Office',
      hashed,
      `testuser_${Date.now()}`
    ]);
    const staff = staffInsert.rows[0];
    console.log(`Created test staff: id=${staff.id}, email="${staff.email}"`);

    // Verify password comparison
    const match = await comparePassword(plainPass, staff.password);
    console.log('Password match test:', match);
    if (!match) throw new Error('Password compare failed!');

    // TEST 4: Assign module permissions in staff_permissions
    console.log('\nTEST 4: Assigning module permissions...');
    await queryDb(`
      INSERT INTO staff_permissions (website_id, staff_id, module_slug, can_view, can_create, can_edit, can_delete)
      VALUES 
        ($1, $2, 'sis', TRUE, TRUE, TRUE, FALSE),
        ($1, $2, 'attendance', TRUE, TRUE, FALSE, FALSE),
        ($1, $2, 'fees', TRUE, FALSE, FALSE, FALSE)
      ON CONFLICT (staff_id, module_slug) DO UPDATE SET can_view = TRUE
    `, [website.id, staff.id]);

    const permsRes = await queryDb(`
      SELECT module_slug, can_view, can_create, can_edit, can_delete
      FROM staff_permissions
      WHERE staff_id = $1
    `, [staff.id]);
    console.log('Assigned permissions:', permsRes.rows);
    if (permsRes.rows.length !== 3) throw new Error('Permissions count mismatch!');
    console.log('-> TEST 4 PASSED: Permissions assigned correctly.\n');

    // TEST 5: Create session and test middleware
    console.log('TEST 5: Creating session and testing middleware...');
    const testToken = signJWT({
      id: staff.id,
      website_id: website.id,
      email: staff.email,
      name: staff.name,
    });

    const sess = await createStaffSession({
      websiteId: website.id,
      staffId: staff.id,
      token: testToken,
      request: {
        headers: {
          get: (h) => (h === 'x-forwarded-for' ? '127.0.0.1' : 'Jest/Node Test Agent'),
        },
      },
    });
    console.log('Session created id:', sess.id);

    // Mock request with Bearer token
    const mockRequest = {
      headers: {
        get: (h) => (h.toLowerCase() === 'authorization' ? `Bearer ${testToken}` : null),
      },
    };

    const sessionData = await getStaffSession(mockRequest);

    console.log('Decoded session staff name:', sessionData?.staff?.name);
    console.log('Allowed modules:', sessionData?.allowedModules);
    console.log('Checking permission sis (create):', hasStaffModulePermission(sessionData, 'sis', 'create'));
    console.log('Checking permission sis (delete):', hasStaffModulePermission(sessionData, 'sis', 'delete'));
    console.log('Checking permission hostel (view):', hasStaffModulePermission(sessionData, 'hostel', 'view'));

    if (!hasStaffModulePermission(sessionData, 'sis', 'create')) {
      throw new Error('hasStaffModulePermission should be true for sis create!');
    }
    if (hasStaffModulePermission(sessionData, 'sis', 'delete')) {
      throw new Error('hasStaffModulePermission should be false for sis delete!');
    }
    if (hasStaffModulePermission(sessionData, 'hostel', 'view')) {
      throw new Error('hasStaffModulePermission should be false for hostel view!');
    }
    console.log('-> TEST 5 PASSED: Session resolution and permission verification succeeded.\n');

    // TEST 6: Session revocation
    console.log('TEST 6: Testing session revocation...');
    await revokeStaffSession(testToken);
    const revokedCheck = await queryDb(`SELECT is_active FROM staff_sessions WHERE token = $1`, [testToken]);
    console.log('Session is_active after revoke (should be false):', revokedCheck.rows[0]?.is_active);
    if (revokedCheck.rows[0]?.is_active !== false) throw new Error('Revoke session failed!');
    console.log('-> TEST 6 PASSED: Session revocation succeeded.\n');

    // Clean up test staff
    console.log('Cleaning up test staff member...');
    await queryDb(`DELETE FROM website_staffs WHERE id = $1`, [staff.id]);
    console.log('Cleaned up successfully.');

    console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
    process.exit(0);
  } catch (err) {
    console.error('Test failed with error:', err);
    process.exit(1);
  }
}

runTests();
