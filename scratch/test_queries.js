const fs = require('fs');
const { Pool } = require('pg');

let envFile = fs.existsSync('.env.local') ? '.env.local' : '.env';
const envContent = fs.readFileSync(envFile, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const idx = trimmed.indexOf('=');
    const key = trimmed.substring(0, idx).trim();
    const val = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = val;
  }
}

const pool = new Pool({
  user: env.PG_USER,
  password: env.PG_PASSWORD,
  host: env.PG_HOST,
  port: env.PG_PORT ? parseInt(env.PG_PORT, 10) : 5432,
  database: env.PG_DATABASE,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  const websiteId = 3;
  const classId = 7;

  try {
    const res = await client.query(`
      SELECT pcs.id,
             d.name AS day_name,
             d.name AS day_of_week,
             p.name AS period_name, p.start_time, p.end_time,
             sub.name AS subject_name, sub.code AS subject_code,
             t.name AS teacher_name,
             sec.name AS section_name,
             COALESCE(pcs.room_number, 'Room ' || p.id) AS room_number
      FROM website_period_class_subjects pcs
      JOIN website_periods p ON p.id = pcs.period_id
      JOIN website_days d ON d.id = p.day_id
      JOIN website_class_subjects cs ON cs.id = pcs.class_subject_id
      JOIN website_subjects sub ON sub.id = cs.subject_id
      LEFT JOIN website_sections sec ON sec.id = pcs.section_id
      LEFT JOIN website_teacher_class_periods tcp ON tcp.period_id = p.id AND tcp.class_id = cs.class_id
      LEFT JOIN website_teachers t ON t.id = tcp.teacher_id
      WHERE pcs.website_id = $1 AND cs.class_id = $2
    `, [websiteId, classId]);
    console.log('Routine query success! Rows:', res.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
