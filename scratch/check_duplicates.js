const { pool } = require('../src/lib/database/db');

async function main() {
  console.log('Checking for existing duplicate emails in DB...');
  
  const tables = ['website_students', 'website_admission_applicants', 'website_staffs', 'website_teachers', 'website_officers'];
  
  for (const t of tables) {
    const res = await pool.query(`
      SELECT website_id, LOWER(TRIM(email)) AS email, COUNT(*) 
      FROM ${t} 
      WHERE email IS NOT NULL AND TRIM(email) != ''
      GROUP BY website_id, LOWER(TRIM(email)) 
      HAVING COUNT(*) > 1;
    `);
    console.log(`Intra-table duplicates in ${t}:`, res.rows);
  }

  // Cross table duplicates
  const crossRes = await pool.query(`
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
    SELECT website_id, email, string_agg(role || ':' || id::text, ', ') as roles, count(*)
    FROM all_emails
    GROUP BY website_id, email
    HAVING count(*) > 1;
  `);
  console.log('Cross-table duplicates:', crossRes.rows);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
