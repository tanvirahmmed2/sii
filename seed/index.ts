import { uploadTables } from './tables';
import { seedModules } from './modules';
import { seedDeveloper } from './developer';
import { seedHomeModules } from './home_modules';
import { seedControlModules } from './control_modules';
import { seedPackages } from './packages';
import { pool } from './db';

export async function runAllSeeds(options: any = {}): Promise<{
  success: boolean;
  duration_seconds: number;
  results: Record<string, any>;
}> {
  const startTime = Date.now();
  console.log('\n================================================================');
  console.log('🚀 STARTING FULL DATABASE & SYSTEM MODULES SETUP');
  console.log('================================================================');

  const results: Record<string, any> = {};

  try {
    results.tables = await uploadTables();
    results.modules = await seedModules();
    results.developer = await seedDeveloper(options);
    results.home_modules = await seedHomeModules();
    results.control_modules = await seedControlModules();
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

if (typeof require !== 'undefined' && require.main === module) {
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
