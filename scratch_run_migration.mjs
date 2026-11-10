import * as secret from './src/lib/database/secret.js';
import pg from 'pg';
import fs from 'fs';

const pool = new pg.Pool({
  user: secret.PG_USER,
  password: secret.PG_PASSWORD,
  host: secret.PG_HOST,
  port: secret.PG_PORT || 5432,
  database: secret.PG_DATABASE,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const sql = fs.readFileSync('./psql/migrations/001_unified_three_gateways.psql', 'utf-8');
  console.log('Running 001_unified_three_gateways.psql...');
  const res = await pool.query(sql);
  console.log('Migration executed successfully!');
  await pool.end();
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});

