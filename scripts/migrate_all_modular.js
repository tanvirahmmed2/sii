import pg from 'pg';

const { Pool } = pg;

const cleanEnv = (val) =>
  typeof val === 'string'
    ? val.replace(/\r/g, '').trim().replace(/^['"]|['"]$/g, '').trim()
    : val;

const pool = new Pool({
  user: cleanEnv(process.env.PG_USER),
  password: cleanEnv(process.env.PG_PASSWORD),
  host: cleanEnv(process.env.PG_HOST),
  port: process.env.PG_PORT ? parseInt(process.env.PG_PORT, 10) : 5432,
  database: cleanEnv(process.env.PG_DATABASE),
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('--- Making DB tables fully modular ---');
    await client.query('BEGIN');

    // 1. Add custom_fields to website_admission_applicants
    console.log('Adding custom_fields to website_admission_applicants...');
    await client.query(`
      ALTER TABLE website_admission_applicants
      ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
    `);

    // 2. Add custom_fields to website_students
    console.log('Adding custom_fields to website_students...');
    await client.query(`
      ALTER TABLE website_students
      ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
    `);

    // 3. Add custom_fields to website_student_addresses
    console.log('Adding custom_fields to website_student_addresses...');
    await client.query(`
      ALTER TABLE website_student_addresses
      ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
    `);

    // 4. Add custom_fields to website_admissions (circulars)
    console.log('Adding custom_fields to website_admissions...');
    await client.query(`
      ALTER TABLE website_admissions
      ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
    `);

    // 5. Ensure unique index on website_admission_form_fields
    console.log('Ensuring unique index on website_admission_form_fields...');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ws_adm_ff_adm_key 
      ON website_admission_form_fields (website_id, COALESCE(admission_id, 0), field_key);
    `);

    // 6. Ensure unique index on website_student_form_fields
    console.log('Ensuring unique index on website_student_form_fields...');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ws_stu_ff_key 
      ON website_student_form_fields (website_id, field_key);
    `);

    await client.query('COMMIT');
    console.log('--- All modular table upgrades committed successfully! ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
