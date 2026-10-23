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

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND (table_name LIKE '%admission_applicant%' OR table_name LIKE '%student%')
      ORDER BY table_name;
    `);
    console.log('Relevant tables:', res.rows.map(r => r.table_name));

    // Also check row counts
    for (const t of ['website_admission_applicants', 'website_admission_applicant_info', 'website_students', 'website_student_info', 'website_student_addresses', 'website_student_guardians']) {
      try {
        const cnt = await client.query(`SELECT COUNT(*) FROM ${t}`);
        console.log(`Count in ${t}:`, cnt.rows[0].count);
      } catch (e) {
        console.log(`Table ${t} error:`, e.message);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
