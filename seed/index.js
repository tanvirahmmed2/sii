const { uploadTables } = require('./tables');
const { seedModules } = require('./modules');
const { seedDeveloper } = require('./developer');
const { seedHomeModules } = require('./home_modules');
const { seedControlModules } = require('./control_modules');
const { seedPackages } = require('./packages');
const { pool } = require('./db');

/**
 * Master Seed Orchestrator:
 * 1. Uploads all tables in PostgreSQL DB (psql/schema.psql + psql/website_tables.psql).
 * 2. Seeds platform developer modules (with page_path & api_path) & canonical website modules.
 * 3. Seeds developer_roles, developer_role_permissions, and Super Admin account.
 * 4. Seeds website_home_modules directly from [domain]/(home)/* directories.
 * 5. Seeds website_control_modules directly from [domain]/(staffs)/staff-panel/* directories.
 * 6. Seeds subscription packages, linking package_home_modules and package_control_modules.
 */
async function runAllSeeds(options = {}) {
  const startTime = Date.now();
  console.log('\n================================================================');
  console.log('🚀 STARTING FULL DATABASE & SYSTEM MODULES SETUP');
  console.log('================================================================');

  const results = {};

  try {
    // 1. Upload Tables
    results.tables = await uploadTables();

    // 2. Add Platform & Website Modules
    results.modules = await seedModules();

    // 3. Add Developer Roles, Permissions & Super Admin
    results.developer = await seedDeveloper(options);

    // 4. Add Website Home Modules
    results.home_modules = await seedHomeModules();

    // 5. Add Website Control Modules
    results.control_modules = await seedControlModules();

    // 6. Add Packages & Link Home/Control Modules
    results.packages = await seedPackages();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n================================================================');
    console.log(`🎉 FULL SYSTEM SETUP COMPLETED SUCCESSFULLY in ${elapsed}s!`);
    console.log('================================================================');
    console.log(`- Database Tables Uploaded:     ${results.tables.total_tables}`);
    console.log(`- Platform Modules Seeded:      ${results.modules.platform_modules_seeded}`);
    console.log(`- Developer Roles & Admin:      ${results.developer.email} (${results.developer.roles_seeded} roles, ${results.developer.permissions_granted} perms)`);
    console.log(`- Website Home Modules:         ${results.home_modules.home_modules_seeded}`);
    console.log(`- Website Control Modules:      ${results.control_modules.control_modules_seeded} (Control, Teacher, Student, Officer)`);
    console.log(`- Subscription Packages:        ${results.packages.packages_seeded} plans (with linked home & control modules)`);
    console.log('================================================================\n');

    return {
      success: true,
      duration_seconds: parseFloat(elapsed),
      results,
    };
  } catch (error) {
    console.error('\n❌ SYSTEM SETUP FAILED:', error);
    throw error;
  }
}

// CLI Execution: node seed/index.js
if (require.main === module) {
  runAllSeeds()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal setup error:', err);
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}

module.exports = {
  runAllSeeds,
};

