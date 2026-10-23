const { pool } = require('../src/lib/database/db');

async function run() {
  const client = await pool.connect();
  try {
    console.log('--- Applying Email Uniqueness Indexes to DB ---');
    await client.query('BEGIN');

    // 1. website_students
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_website_students_unique_lower_email
      ON website_students (website_id, LOWER(TRIM(email)))
      WHERE email IS NOT NULL AND TRIM(email) != '';
    `);

    // 2. website_admission_applicants
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_website_admission_applicants_unique_lower_email
      ON website_admission_applicants (website_id, LOWER(TRIM(email)))
      WHERE email IS NOT NULL AND TRIM(email) != '';
    `);

    // 3. website_staffs
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_website_staffs_unique_lower_email
      ON website_staffs (website_id, LOWER(TRIM(email)))
      WHERE email IS NOT NULL AND TRIM(email) != '';
    `);

    // 4. website_teachers
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_website_teachers_unique_lower_email
      ON website_teachers (website_id, LOWER(TRIM(email)))
      WHERE email IS NOT NULL AND TRIM(email) != '';
    `);

    // 5. website_officers
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_website_officers_unique_lower_email
      ON website_officers (website_id, LOWER(TRIM(email)))
      WHERE email IS NOT NULL AND TRIM(email) != '';
    `);

    await client.query('COMMIT');
    console.log('--- Email Uniqueness Indexes successfully applied to DB ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to apply email uniqueness indexes:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
