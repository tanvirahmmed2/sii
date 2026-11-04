const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Auto-load .env if environment variables are not already present
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((l) => {
      const trimmed = l.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  }
}

loadEnv();

const cleanEnv = (val) =>
  typeof val === 'string'
    ? val.replace(/\r/g, '').trim().replace(/^['"]|['"]$/g, '').trim()
    : val;

const pool = new Pool({
  user: cleanEnv(process.env.PG_USER),
  password: cleanEnv(process.env.PG_PASSWORD),
  host: cleanEnv(process.env.PG_HOST),
  port: cleanEnv(process.env.PG_PORT) ? parseInt(cleanEnv(process.env.PG_PORT), 10) : 5432,
  database: cleanEnv(process.env.PG_DATABASE),
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

pool.on('error', (err) => {
  console.error('[Postgres Pool Error in Seed]:', err?.message || err);
});

async function query(text, params) {
  return pool.query(text, params);
}

async function closePool() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  closePool,
  loadEnv,
};

