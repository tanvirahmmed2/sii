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
  const studentId = 12;

  try {
    console.log('--- 1. Testing updated student/me query ---');
    const meRes = await client.query(
      `SELECT s.id, s.website_id,
              COALESCE(s.registration_no, s.student_unique_id, i.data->>'registration_no', i.data->>'registration_number') AS registration_no,
              s.roll_no, s.student_unique_id,
              s.class_id, s.section_id, s.session_id, s.is_active,
              s.created_at, s.updated_at,
              COALESCE(s.name, i.data->>'name', 'Student') AS name,
              COALESCE(s.email, i.data->>'email') AS email,
              COALESCE(s.number, i.data->>'number') AS number,
              COALESCE(s.gender, i.data->>'gender') AS gender,
              COALESCE(s.blood_group, i.data->>'blood_group') AS blood_group,
              COALESCE(s.date_of_birth, CASE WHEN i.data->>'date_of_birth' ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN (i.data->>'date_of_birth')::date ELSE NULL END) AS date_of_birth,
              COALESCE(s.religion, i.data->>'religion') AS religion,
              COALESCE(s.admission_date, CASE WHEN i.data->>'admission_date' ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN (i.data->>'admission_date')::date ELSE NULL END) AS admission_date,
              COALESCE(i.is_registered, s.is_registered) AS is_registered,
              s.is_verified,
              COALESCE(i.verification_status, s.verification_status) AS verification_status,
              i.data AS info_data,
              COALESCE(c.name, i.data->>'class_name', 'General Enrollment') AS class_name,
              c.code AS class_code,
              sec.name AS section_name,
              ses.name AS session_name
       FROM website_students s
       LEFT JOIN website_student_info i ON s.id = i.student_id
       LEFT JOIN website_classes c ON s.class_id = c.id
       LEFT JOIN website_sections sec ON s.section_id = sec.id
       LEFT JOIN website_sessions ses ON s.session_id = ses.id
       WHERE s.id = $1 AND s.website_id = $2
       LIMIT 1`,
      [studentId, websiteId]
    );
    console.log('me query result:', {
      id: meRes.rows[0]?.id,
      name: meRes.rows[0]?.name,
      registration_no: meRes.rows[0]?.registration_no,
      roll_no: meRes.rows[0]?.roll_no,
      class_name: meRes.rows[0]?.class_name,
    });

    console.log('--- 2. Testing updated student/dashboard queries ---');
    const studentRes = await client.query(
      `SELECT s.id, s.website_id,
              COALESCE(s.registration_no, s.student_unique_id, i.data->>'registration_no', i.data->>'registration_number') AS registration_no,
              s.roll_no, s.student_unique_id, s.class_id, s.section_id, s.session_id,
              COALESCE(s.name, i.data->>'name', 'Student') AS name,
              COALESCE(s.email, i.data->>'email') AS email,
              COALESCE(s.number, i.data->>'number') AS number,
              COALESCE(c.name, i.data->>'class_name', 'General Enrollment') AS class_name,
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
      [studentId, websiteId]
    );
    console.log('dashboard student result:', {
      id: studentRes.rows[0]?.id,
      name: studentRes.rows[0]?.name,
      registration_no: studentRes.rows[0]?.registration_no,
      roll_no: studentRes.rows[0]?.roll_no,
      class_name: studentRes.rows[0]?.class_name,
    });

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = daysOfWeek[new Date().getDay()];
    const routineRes = await client.query(
      `SELECT pcs.id,
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
       WHERE pcs.website_id = $1 AND cs.class_id = $2 AND LOWER(d.name) = LOWER($3)
       ORDER BY p.start_time ASC`,
      [websiteId, studentRes.rows[0]?.class_id || 0, currentDay]
    );
    console.log('Today routine count for ' + currentDay + ':', routineRes.rows.length);

    console.log('--- 3. Testing updated student/routine query ---');
    const fullRoutine = await client.query(
      `SELECT pcs.id,
              d.name AS day_of_week,
              d.name AS day_name,
              p.name AS period_name,
              p.start_time,
              p.end_time,
              s.name AS subject_name,
              s.code AS subject_code,
              t.name AS teacher_name,
              sec.name AS section_name,
              COALESCE(pcs.room_number, 'Campus Room ' || p.id) AS room_number
       FROM website_period_class_subjects pcs
       JOIN website_periods p ON p.id = pcs.period_id
       JOIN website_days d ON d.id = p.day_id
       JOIN website_class_subjects cs ON cs.id = pcs.class_subject_id
       JOIN website_subjects s ON s.id = cs.subject_id
       LEFT JOIN website_sections sec ON sec.id = pcs.section_id
       LEFT JOIN website_teacher_class_periods tcp ON tcp.period_id = p.id AND tcp.class_id = cs.class_id
       LEFT JOIN website_teachers t ON t.id = tcp.teacher_id
       WHERE pcs.website_id = $1 AND cs.class_id = $2
       ORDER BY d.id ASC, p.start_time ASC`,
      [websiteId, studentRes.rows[0]?.class_id || 0]
    );
    console.log('Full weekly routine rows:', fullRoutine.rows.length);

    console.log('ALL QUERIES PASSED WITH ZERO ERRORS!');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
