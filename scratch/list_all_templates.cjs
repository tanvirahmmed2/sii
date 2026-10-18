const fs = require('fs');
const pg = require('pg');

const envText = fs.readFileSync('.env', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > -1) {
    const k = line.slice(0, idx).trim();
    let v = line.slice(idx + 1).trim();
    if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
});

const pool = new pg.Pool({
  user: env.PG_USER,
  password: env.PG_PASSWORD,
  host: env.PG_HOST,
  port: parseInt(env.PG_PORT || '5432', 10),
  database: env.PG_DATABASE,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const tables = [
    'system_student_id_templates',
    'system_teacher_id_templates',
    'system_officer_id_templates',
    'system_student_tc_templates',
    'system_student_testimonial_templates',
    'system_student_certificate_templates'
  ];
  for (const t of tables) {
    try {
      const res = await pool.query(`SELECT id, name FROM ${t}`);
      console.log(`${t}:`, res.rows);
    } catch (e) {
      console.log(`${t} error:`, e.message);
    }
  }
  await pool.end();
}
main().catch(console.error);
