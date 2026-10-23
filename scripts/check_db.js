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

async function check() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'website_admission_applicants' ORDER BY ordinal_position;");
    console.log('website_admission_applicants columns:\n', res.rows.map(r => `${r.column_name} (${r.data_type})`).join('\n '));

    const res2 = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'website_admission_applicant_info' ORDER BY ordinal_position;");
    console.log('\nwebsite_admission_applicant_info columns:\n', res2.rows.map(r => `${r.column_name} (${r.data_type})`).join('\n '));

    const res3 = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'website_admissions' ORDER BY ordinal_position;");
    console.log('\nwebsite_admissions columns:\n', res3.rows.map(r => `${r.column_name} (${r.data_type})`).join('\n '));

    const res4 = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'website_students' ORDER BY ordinal_position;");
    console.log('\nwebsite_students columns:\n', res4.rows.map(r => `${r.column_name} (${r.data_type})`).join('\n '));

    const res5 = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'website_student_info' ORDER BY ordinal_position;");
    console.log('\nwebsite_student_info columns:\n', res5.rows.map(r => `${r.column_name} (${r.data_type})`).join('\n '));

    const res6 = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'website_admission_form_fields' ORDER BY ordinal_position;");
    console.log('\nwebsite_admission_form_fields columns:\n', res6.rows.map(r => `${r.column_name} (${r.data_type})`).join('\n '));

    const res7 = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'website_student_form_fields' ORDER BY ordinal_position;");
    console.log('\nwebsite_student_form_fields columns:\n', res7.rows.map(r => `${r.column_name} (${r.data_type})`).join('\n '));

    const res8 = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'website_student_guardians' ORDER BY ordinal_position;");
    console.log('\nwebsite_student_guardians columns:\n', res8.rows.map(r => `${r.column_name} (${r.data_type})`).join('\n '));

    const res9 = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'website_student_addresses' ORDER BY ordinal_position;");
    console.log('\nwebsite_student_addresses columns:\n', res9.rows.map(r => `${r.column_name} (${r.data_type})`).join('\n '));

  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(console.error);
