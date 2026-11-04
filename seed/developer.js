const bcrypt = require('bcryptjs');
const { pool, query } = require('./db');

/**
 * Seeds / ensures a Lead Developer & Super Admin account in `developers` table,
 * and grants full permissions across all platform modules in `module_permissions`.
 */
async function seedDeveloper(options = {}) {
  console.log('\n======================================================');
  console.log('3. SEEDING DEVELOPER ACCOUNT & MODULE PERMISSIONS');
  console.log('======================================================');

  const name = options.name || 'Tanvir Ahmmed';
  const email = (options.email || 'tanvir004006@gmail.com').toLowerCase().trim();
  const rawPassword = options.password || '12345678';
  const phone = options.phone || '+8801700000000';
  const designation = options.designation || 'Lead Software Engineer & Super Admin';

  console.log(`-> Checking if developer ${email} exists...`);
  const existingDev = await query('SELECT id, password FROM developers WHERE email = $1', [email]);

  let devId;
  if (existingDev.rows.length === 0) {
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const insertRes = await query(
      `INSERT INTO developers (
         name, email, phone, designation, password,
         is_active, email_verified, bio, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, TRUE, TRUE, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, name, email, designation`,
      [name, email, phone, designation, hashedPassword, 'Lead Software Engineer & Platform Super Admin']
    );
    devId = insertRes.rows[0].id;
    console.log(`✓ Created new developer account #${devId} (${email}).`);
  } else {
    devId = existingDev.rows[0].id;
    // Update active and verified status
    await query(
      `UPDATE developers
       SET name = $1, phone = $2, designation = $3, is_active = TRUE, email_verified = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [name, phone, designation, devId]
    );
    console.log(`✓ Existing developer account #${devId} (${email}) verified and updated.`);
  }

  // Grant full permissions for all modules in `modules` table
  console.log(`-> Granting full permissions across all platform modules for developer #${devId}...`);
  const allModulesRes = await query('SELECT id, slug, name FROM modules ORDER BY id ASC');
  const allModules = allModulesRes.rows || [];

  let permsGranted = 0;
  for (const mod of allModules) {
    await query(
      `INSERT INTO module_permissions (
         developer_id, module_id, can_view, can_create, can_edit, can_delete, updated_at
       ) VALUES ($1, $2, TRUE, TRUE, TRUE, TRUE, CURRENT_TIMESTAMP)
       ON CONFLICT (developer_id, module_id) DO UPDATE SET
         can_view = TRUE,
         can_create = TRUE,
         can_edit = TRUE,
         can_delete = TRUE,
         updated_at = CURRENT_TIMESTAMP`,
      [devId, mod.id]
    );
    permsGranted++;
  }

  console.log(`✓ Granted full permissions for ${permsGranted} modules to developer #${devId}.`);

  return {
    success: true,
    developer_id: devId,
    email,
    permissions_granted: permsGranted,
  };
}

if (require.main === module) {
  seedDeveloper()
    .then((res) => {
      console.log('\nDeveloper successfully seeded!', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n✗ Error seeding developer:', err);
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}

module.exports = {
  seedDeveloper,
};

