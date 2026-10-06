const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// 1. Parse .env safely
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  });
}

console.log('Database Configuration:');
console.log('  Host:', process.env.PG_HOST);
console.log('  Port:', process.env.PG_PORT);
console.log('  User:', process.env.PG_USER);
console.log('  Database:', process.env.PG_DATABASE);

const pool = new Pool({
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  host: process.env.PG_HOST,
  port: process.env.PG_PORT ? parseInt(process.env.PG_PORT, 10) : 5432,
  database: process.env.PG_DATABASE,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('\n[1/5] Connected! Resetting and clearing the public schema...');
    await client.query(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `);
    console.log('✔ Public schema cleared and re-created successfully.');

    console.log('\n[2/5] Creating core extensions and functions...');
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✔ Extensions and utility functions initialized.');

    console.log('\n[3/5] Executing psql/schema.psql (Main Platform Schema)...');
    const schemaSql = fs.readFileSync(path.join(__dirname, '..', 'psql', 'schema.psql'), 'utf8');
    await client.query(schemaSql);
    console.log('✔ psql/schema.psql executed successfully!');

    console.log('\n[4/5] Executing psql/subschema.psql (Tenant Website Subschema)...');
    const subschemaSql = fs.readFileSync(path.join(__dirname, '..', 'psql', 'subschema.psql'), 'utf8');
    await client.query(subschemaSql);
    console.log('✔ psql/subschema.psql executed successfully!');

    console.log('\n[5/5] Ensuring additional marketing/developer tables and seed data...');
    // Themes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS themes (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        preview_image VARCHAR(500),
        preview_url VARCHAR(500),
        price DECIMAL(10,2) DEFAULT 0,
        features JSONB DEFAULT '[]'::jsonb,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tutorials table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tutorials (
        id BIGSERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        youtube_link VARCHAR(500),
        video_url VARCHAR(500),
        thumbnail_url VARCHAR(500),
        category VARCHAR(100),
        duration VARCHAR(50),
        is_published BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Updates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS updates (
        id BIGSERIAL PRIMARY KEY,
        version VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE,
        description TEXT,
        changelog TEXT,
        release_date DATE DEFAULT CURRENT_DATE,
        is_published BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Careers & Applications
    await client.query(`
      CREATE TABLE IF NOT EXISTS career (
        id BIGSERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        department VARCHAR(100),
        location VARCHAR(100),
        job_type VARCHAR(50) DEFAULT 'Full-time',
        workplace_type VARCHAR(50) DEFAULT 'Remote',
        experience_level VARCHAR(50) DEFAULT 'Mid-Level',
        salary_range VARCHAR(100),
        description TEXT NOT NULL,
        requirements TEXT,
        responsibilities TEXT,
        benefits TEXT,
        status VARCHAR(50) DEFAULT 'open',
        deadline DATE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS career_application (
        id BIGSERIAL PRIMARY KEY,
        career_id BIGINT REFERENCES career(id) ON DELETE CASCADE,
        applicant_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        portfolio_url VARCHAR(500),
        resume_url TEXT NOT NULL,
        cover_letter TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMPTZ
      );
    `);

    // Seed initial verified reviews in the database so that /reviews and home page immediately display them
    const reviewCount = await client.query('SELECT COUNT(*)::int AS count FROM reviews');
    if (reviewCount.rows[0].count === 0) {
      console.log('Seeding initial verified client reviews in reviews table...');
      await client.query(`
        INSERT INTO reviews (reviewer_name, institution_name, rating, title, review_text, is_featured, is_approved) VALUES
        ('Dr. Tariq Rahman', 'Greenwood International School', 5, 'Seamless Academic Administration', 'Managing student admissions, exam grade sheets, and automated SMS alerts has never been this effortless. The platform transformed our school daily operations completely.', true, true),
        ('Nusrat Jahan', 'Apex Academy & College', 5, 'Incredible Student & Parent Portal', 'Our teachers easily update marks and schedules, while parents love the real-time fee tracking and instant attendance notifications on mobile.', true, true),
        ('Mohammad K. Al-Hassan', 'Beaconhouse Scholar Campus', 5, 'Top-tier Performance & Stability', 'The cloud-hosted system handled thousands of simultaneous result checks during term board examinations without a glitch or slowdown.', true, true),
        ('Sarah Jenkins', 'Oakridge International Institute', 5, 'Revolutionized Our Digital Campus', 'From automated fee receipts to digital identity cards, this software provides an all-in-one suite that replaced four disparate legacy tools.', true, true),
        ('Engr. Mahfuzur Rahman', 'Crescent Grammar School', 5, 'Exceptional Value and Support', 'The modern themes look fantastic on mobile devices, and the platform support team helped customize our multi-branch grading scheme with ease.', false, true),
        ('Farhana Yeasmin', 'Metropolitan Science Academy', 5, 'Unmatched Reliability & Reports', 'Tabulation sheets and merit lists that used to take days now generate in seconds. Highly recommended for every institution seeking modern automation.', false, true),
        ('Kazi Ashrafuzzaman', 'Saint Marys High School', 4, 'Great Software for School Admins', 'Routine and timetable generation saved our coordinators weeks of manual scheduling work.', false, true),
        ('Amina Khatun', 'Pioneer Model College', 5, 'Intuitive Teacher Portal', 'Online marks entry and tabulation is smooth and user friendly. Even our less tech-savvy staff picked it up in an afternoon.', false, true),
        ('Tanveer Ahmed', 'Scholastica Model Academy', 5, 'Comprehensive Campus Automation', 'Fee collection via bKash and instant parent SMS alerts worked like a charm from day one.', true, true)
      `);
      console.log('✔ Initial verified reviews seeded.');
    }

    // Verify all created tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log(`\n🎉 Success! Database completely reset and initialized.`);
    console.log(`Total public tables created: ${tablesRes.rows.length}`);
    console.log('Tables:', tablesRes.rows.map((r) => r.table_name).join(', '));

  } catch (err) {
    console.error('\n❌ Error during migration:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
