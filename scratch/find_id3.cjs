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
  const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  for (const row of tables.rows) {
    const t = row.table_name;
    try {
      const res = await pool.query(`SELECT id, name FROM ${t} WHERE id = 3`);
      if (res.rows.length) {
        console.log(`FOUND ID 3 IN TABLE: ${t}`, res.rows);
      }
    } catch (e) {}
  }
  await pool.end();
}
main().catch(console.error);
