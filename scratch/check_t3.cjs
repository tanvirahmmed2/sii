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
  const tablesRes = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%template%'");
  for (const r of tablesRes.rows) {
    const tbl = r.table_name;
    try {
      const res = await pool.query(`SELECT id, name, fabric_data, fabric_back_data FROM ${tbl} WHERE id = 3`);
      if (res.rows.length) {
        console.log(`FOUND ID 3 IN TABLE: ${tbl}`);
        console.log('NAME:', res.rows[0].name);
        console.log('FRONT:', JSON.stringify(res.rows[0].fabric_data, null, 2));
        console.log('BACK:', JSON.stringify(res.rows[0].fabric_back_data, null, 2));
      }
    } catch (e) {
      // ignore table without id/name/fabric_data
    }
  }
  await pool.end();
}
main().catch(err => { console.error(err); pool.end(); });
