const { queryDb } = require('../src/lib/database/db.js');

async function test() {
  try {
    const dups = await queryDb(`
      SELECT website_id, LOWER(TRIM(email)) as email, COUNT(*)
      FROM website_admission_applicants
      WHERE email IS NOT NULL AND TRIM(email) != ''
      GROUP BY website_id, LOWER(TRIM(email))
      HAVING COUNT(*) > 1;
    `);
    console.log('Duplicates in admission_applicants:', dups.rows);

    // Check cross-role duplicates across all 5 tables
    const crossDups = await queryDb(`
      WITH all_emails AS (
        SELECT website_id, LOWER(TRIM(email)) as email, 'student' as role, id FROM website_students WHERE email IS NOT NULL AND TRIM(email) != ''
        UNION ALL
        SELECT website_id, LOWER(TRIM(email)) as email, 'applicant' as role, id FROM website_admission_applicants WHERE email IS NOT NULL AND TRIM(email) != ''
        UNION ALL
        SELECT website_id, LOWER(TRIM(email)) as email, 'staff' as role, id FROM website_staffs WHERE email IS NOT NULL AND TRIM(email) != ''
        UNION ALL
        SELECT website_id, LOWER(TRIM(email)) as email, 'teacher' as role, id FROM website_teachers WHERE email IS NOT NULL AND TRIM(email) != ''
        UNION ALL
        SELECT website_id, LOWER(TRIM(email)) as email, 'officer' as role, id FROM website_officers WHERE email IS NOT NULL AND TRIM(email) != ''
      )
      SELECT website_id, email, array_agg(role || ':' || id) as records, COUNT(*)
      FROM all_emails
      GROUP BY website_id, email
      HAVING COUNT(*) > 1;
    `);
    console.log('Cross-role duplicates:', crossDups.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
test();
