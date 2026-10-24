const fs = require('fs');
const path = require('path');
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
  try {
    const res = await client.query('SELECT * FROM website_classes WHERE id = 7');
    console.log('Class 7:', res.rows);
    const allCls = await client.query('SELECT id, website_id, name, code FROM website_classes WHERE website_id = 3');
    console.log('All classes for website 3:', allCls.rows);
    const stu = await client.query('SELECT * FROM website_students WHERE id = 12');
    console.log('Student 12:', stu.rows[0]);

    // Let's also test the exact query from student/me and student/dashboard for student 12
    const meQuery = await client.query(
      `SELECT s.id, s.website_id, s.registration_no, s.roll_no, s.student_unique_id,
              s.class_id, s.section_id, s.session_id, s.is_active,
              s.created_at, s.updated_at,
              COALESCE(s.name, i.data->>'name') AS name,
              COALESCE(s.email, i.data->>'email') AS email,
              COALESCE(s.number, i.data->>'number') AS number,
              COALESCE(s.gender, i.data->>'gender') AS gender,
              COALESCE(s.blood_group, i.data->>'blood_group') AS blood_group,
              COALESCE(s.date_of_birth, (i.data->>'date_of_birth')::date) AS date_of_birth,
              COALESCE(s.religion, i.data->>'religion') AS religion,
              COALESCE(s.admission_date, (i.data->>'admission_date')::date) AS admission_date,
              COALESCE(i.is_registered, s.is_registered) AS is_registered,
              s.is_verified,
              COALESCE(i.verification_status, s.verification_status) AS verification_status,
              i.data AS info_data,
              c.name AS class_name, c.code AS class_code,
              sec.name AS section_name,
              ses.name AS session_name
       FROM website_students s
       LEFT JOIN website_student_info i ON s.id = i.student_id
       LEFT JOIN website_classes c ON s.class_id = c.id
       LEFT JOIN website_sections sec ON s.section_id = sec.id
       LEFT JOIN website_sessions ses ON s.session_id = ses.id
       WHERE s.id = $1 AND s.website_id = $2
       LIMIT 1`,
      [12, 3]
    );
    console.log('student/me query result:');
    console.log(meQuery.rows[0]);

    // Check dashboard query
    const dashQuery = await client.query(
      `SELECT s.id, s.website_id, s.registration_no, s.roll_no, s.class_id, s.section_id, s.session_id,
              COALESCE(s.name, i.data->>'name') AS name,
              COALESCE(s.email, i.data->>'email') AS email,
              COALESCE(s.number, i.data->>'number') AS number,
              c.name AS class_name,
              sec.name AS section_name,
              ses.name AS session_name,
              p.image_url AS photo_url
       FROM website_students s
       LEFT JOIN website_student_info i ON i.student_id = s.id
       LEFT JOIN website_classes c ON c.id = s.class_id AND c.website_id = s.website_id
       LEFT JOIN website_sections sec ON sec.id = s.section_id AND sec.website_id = s.website_id
       LEFT JOIN website_sessions ses ON ses.id = s.session_id AND ses.website_id = s.website_id
       LEFT JOIN website_student_pictures p ON p.student_id = s.id AND p.is_primary = TRUE
       WHERE s.id = $1 AND s.website_id = $2
       LIMIT 1`,
      [12, 3]
    );
    console.log('student/dashboard student query result:');
    console.log(dashQuery.rows[0]);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
