const { uploadTables } = require('./tables');
const { seedModules } = require('./modules');
const { seedDeveloper } = require('./developer');
const { seedHomeModules } = require('./home_modules');
const { seedControlModules } = require('./control_modules');
const { pool } = require('./db');

/**
 * Master Seed Orchestrator:
 * 1. Uploads all tables in PostgreSQL DB (psql/schema.psql + psql/website_tables.psql).
 * 2. Seeds platform developer modules & canonical website modules (no defaults runtime hack).
 * 3. Seeds/ensures super admin developer account and grants all module permissions.
 * 4. Seeds website_home_modules directly from [domain]/(home)/* directories.
 * 5. Seeds website_control_modules directly from [domain]/(staffs)/staff-panel/* directories.
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

    // 3. Add Developer & Grant Permissions
    results.developer = await seedDeveloper(options);

    // 4. Add Website Home Modules
    results.home_modules = await seedHomeModules();

    // 5. Add Website Control Modules
    results.control_modules = await seedControlModules();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n================================================================');
    console.log(`🎉 FULL SYSTEM SETUP COMPLETED SUCCESSFULLY in ${elapsed}s!`);
    console.log('================================================================');
    console.log(`- Database Tables Uploaded:     ${results.tables.total_tables}`);
    console.log(`- Platform Modules Seeded:      ${results.modules.platform_modules_seeded}`);
    console.log(`- Canonical Website Modules:    ${results.modules.website_modules_seeded}`);
    console.log(`- Super Admin Developer:        ${results.developer.email} (${results.developer.permissions_granted} permissions)`);
    console.log(`- Website Home Modules:         ${results.home_modules.home_modules_seeded}`);
    console.log(`- Website Control Modules:      ${results.control_modules.control_modules_seeded}`);
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

