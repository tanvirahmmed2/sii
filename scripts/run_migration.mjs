import fs from 'fs';
import path from 'path';
import pg from 'pg';

// Parse .env
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    value = value.trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const client = new pg.Client({
  user: env.PG_USER,
  password: env.PG_PASSWORD,
  host: env.PG_HOST,
  port: env.PG_PORT ? parseInt(env.PG_PORT, 10) : 5432,
  database: env.PG_DATABASE,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
});

async function run() {
  try {
    console.log('Connecting to database', env.PG_HOST, 'db:', env.PG_DATABASE);
    await client.connect();
    console.log('Connected! Reading migration file...');
    const sql = fs.readFileSync('psql/migrations/001_unified_three_gateways.psql', 'utf8');
    console.log('Executing migration (length:', sql.length, 'bytes)...');
    const res = await client.query(sql);
    console.log('Migration executed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();

