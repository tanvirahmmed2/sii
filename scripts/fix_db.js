const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Parse .env if exists
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

const pool = new Pool({
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  host: process.env.PG_HOST,
  port: process.env.PG_PORT ? parseInt(process.env.PG_PORT, 10) : 5432,
  database: process.env.PG_DATABASE,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log('Connecting to PostgreSQL database:', process.env.PG_DATABASE, 'at', process.env.PG_HOST);

  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
    const existingTables = new Set(res.rows.map((r) => r.table_name));
    console.log(`Found ${existingTables.size} existing tables in database.`);

    // 1. Ensure marketing tables and columns are created or synced
    console.log('\nChecking & creating required marketing tables...');

    // Table 19: reviews
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id BIGSERIAL PRIMARY KEY,
        creator_id BIGINT,
        website_id BIGINT,
        reviewer_name VARCHAR(255) NOT NULL,
        institution_name VARCHAR(255),
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title VARCHAR(255),
        review_text TEXT NOT NULL,
        is_featured BOOLEAN DEFAULT FALSE,
        is_approved BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✔ reviews table verified');

    // Table 20: policies
    await pool.query(`
      CREATE TABLE IF NOT EXISTS policies (
        id BIGSERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        content TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        version VARCHAR(50),
        effective_date DATE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✔ policies table verified');

    // Table 21: faq
    await pool.query(`
      CREATE TABLE IF NOT EXISTS faq (
        id BIGSERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✔ faq table verified');

    // tutorials
    await pool.query(`
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
    console.log('✔ tutorials table verified');

    // updates
    await pool.query(`
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
    console.log('✔ updates table verified');

    // themes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS themes (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        preview_image VARCHAR(500),
        features JSONB DEFAULT '[]'::jsonb,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✔ themes table verified');

    // packages
    await pool.query(`
      CREATE TABLE IF NOT EXISTS packages (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        tagline VARCHAR(255),
        description TEXT,
        price_bdt NUMERIC(10,2) NOT NULL DEFAULT 0,
        price_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
        billing_cycle VARCHAR(50) DEFAULT 'monthly',
        features JSONB DEFAULT '[]'::jsonb,
        badge VARCHAR(100),
        is_popular BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✔ packages table verified');

    // tenant_modules
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenant_modules (
        id BIGSERIAL PRIMARY KEY,
        website_id BIGINT,
        module_name VARCHAR(100) NOT NULL,
        is_enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✔ tenant_modules table verified');

    // package_modules
    await pool.query(`
      CREATE TABLE IF NOT EXISTS package_modules (
        id BIGSERIAL PRIMARY KEY,
        package_id BIGINT,
        module_key VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✔ package_modules table verified');

    // allowed_modules
    await pool.query(`
      CREATE TABLE IF NOT EXISTS allowed_modules (
        id BIGSERIAL PRIMARY KEY,
        module_key VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        is_core BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✔ allowed_modules table verified');

    // career & career_application
    await pool.query(`
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
    `);
    console.log('✔ career table verified');

    await pool.query(`
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
    console.log('✔ career_application table verified');

    // Also check if any columns in schema.psql need to be executed
    const schemaPath = path.join(__dirname, '..', 'psql', 'schema.psql');
    if (fs.existsSync(schemaPath)) {
      console.log('\nRunning psql/schema.psql...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schemaSql);
      console.log('✔ psql/schema.psql executed successfully!');
    }

    const finalRes = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
    console.log(`\nMigration completed! Total tables now in DB: ${finalRes.rows.length}`);
    console.log('Tables:', finalRes.rows.map((r) => r.table_name).join(', '));

  } catch (err) {
    console.error('Database migration error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
