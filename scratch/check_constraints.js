const { queryDb } = require('../src/lib/database/db.js');



async function run() {
  try {
    const res = await queryDb(`
      SELECT conname, conrelid::regclass::text as table_name, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      WHERE conrelid::regclass::text IN ('website_students', 'website_admission_applicants', 'website_staffs', 'website_teachers', 'website_officers')
        AND contype = 'u';
    `);
    console.log("Current unique constraints:", res.rows);

    const indexes = await queryDb(`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE tablename IN ('website_students', 'website_admission_applicants', 'website_staffs', 'website_teachers', 'website_officers')
        AND indexdef LIKE '%UNIQUE%';
    `);
    console.log("Current unique indexes:", indexes.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
