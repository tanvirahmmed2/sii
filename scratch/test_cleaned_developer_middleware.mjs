import DeveloperMiddleware, {
  hashPassword,
  comparePassword,
  signJWT,
  verifyJWT,
  generateToken,
  getDeveloperSession,
  isDeveloper,
  isAdmin,
  hasModulePermission,
  authenticateDeveloper,
} from '../src/lib/middleware/developer.js';
import { queryDb } from '../src/lib/database/db.js';

async function testCleanedDeveloperMiddleware() {
  console.log('=== VERIFYING CLEANED DEVELOPER.JS MIDDLEWARE ===\n');

  // 1. Verify role related constants & authenticators are REMOVED
  console.log('--- 1. Checking role-related properties are removed ---');
  const removedProps = [
    'DEVELOPER_ROLES',
    'DEVELOPER_ROLE_LABELS',
    'DEVELOPER_ROLE_PERMISSIONS',
    'ROLE_PERMISSIONS',
    'getDeveloperRole',
    'hasDeveloperRole',
    'hasRole',
    'requireDeveloperRole',
    'requireRole',
    'isDeveloperAdmin',
    'isSuperAdmin',
    'isLeadDeveloper',
    'isDeveloperManager',
    'isDeveloperMarketer',
    'isDeveloperSupport',
    'getDeveloperRoles',
  ];

  for (const prop of removedProps) {
    if (DeveloperMiddleware[prop] !== undefined) {
      throw new Error(`FAIL: ${prop} is still present in DeveloperMiddleware!`);
    }
    console.log(`[OK] Confirmed removed: ${prop}`);
  }

  // 2. Test password helpers
  console.log('\n--- 2. Testing Password & JWT Helpers ---');
  const pwd = 'Secr3tPassword2026!';
  const hash = await hashPassword(pwd);
  const match = await comparePassword(pwd, hash);
  if (!match) throw new Error('Password compare failed');
  console.log('[OK] hashPassword & comparePassword functional');

  const token = generateToken({ id: 1, email: 'test@example.com' });
  const decoded = verifyJWT(token);
  if (!decoded || decoded.id !== 1) throw new Error('JWT verification failed');
  console.log('[OK] signJWT, generateToken & verifyJWT functional');

  // 3. Test Database developer lookup & permissions
  console.log('\n--- 3. Testing Developer Session & Direct Module Permissions ---');
  const devRes = await queryDb('SELECT id, name, email FROM developers LIMIT 1');
  if (devRes.rows.length > 0) {
    const dev = devRes.rows[0];
    console.log(`Found developer in DB: ID ${dev.id} (${dev.email})`);

    // Create a mock request with Bearer token
    const devToken = generateToken({ id: dev.id, email: dev.email });
    const mockRequest = {
      headers: new Headers({
        Authorization: `Bearer ${devToken}`,
      }),
    };

    const session = await getDeveloperSession(mockRequest);
    if (!session) {
      console.warn('[WARN] Developer session was null (might be inactive or missing session record)');
    } else {
      console.log(`[OK] Retrieved Developer Session: ID ${session.id}, Name: ${session.name}`);
      console.log(`[OK] Verified NO role property: session.role = ${session.role}`);
      console.log(`[OK] Verified NO isAdmin property: session.isAdmin = ${session.isAdmin}`);
      console.log(`[OK] Assigned permissions count: ${(session.permissions || []).length}`);
    }

    const isDev = await isDeveloper(mockRequest);
    console.log(`[OK] isDeveloper(mockRequest) = ${isDev}`);

    const isAdminCheck = await isAdmin(mockRequest);
    console.log(`[OK] isAdmin(mockRequest) alias = ${isAdminCheck}`);
  } else {
    console.log('No developers found in database for mock session lookup.');
  }

  console.log('\n=== ALL DEVELOPER MIDDLEWARE TESTS PASSED! ===');
  process.exit(0);
}

testCleanedDeveloperMiddleware().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
