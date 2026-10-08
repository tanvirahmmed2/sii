import { queryDb } from '../src/lib/database/db.js';

async function test() {
  try {
    const res = await queryDb(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('modules', 'module_permissions', 'developers', 'developer_roles', 'website_modules', 'package_modules', 'package_website_modules', 'website_modules_permissions', 'website_staffs', 'staff_sessions')
      ORDER BY table_name;
    `);
    console.log('Active Tables in DB:', res.rows.map(r => r.table_name));

    // Also check views
    const views = await queryDb(`
      SELECT table_name FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name IN ('developer_roles', 'package_website_modules');
    `);
    console.log('Active Views in DB:', views.rows.map(r => r.table_name));

    // Check module count and module_permissions count
    const modCount = await queryDb('SELECT COUNT(*)::int AS count FROM modules');
    const permCount = await queryDb('SELECT COUNT(*)::int AS count FROM module_permissions');
    const wmCount = await queryDb('SELECT COUNT(*)::int AS count FROM website_modules');
    const pmCount = await queryDb('SELECT COUNT(*)::int AS count FROM package_modules');
    const wspCount = await queryDb('SELECT COUNT(*)::int AS count FROM website_modules_permissions');
    console.log('Counts:', {
      modules: modCount.rows[0].count,
      module_permissions: permCount.rows[0].count,
      website_modules: wmCount.rows[0].count,
      package_modules: pmCount.rows[0].count,
      website_modules_permissions: wspCount.rows[0].count
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

test();
