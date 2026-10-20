const path = require('path');
const { Pool } = require('pg');
require('fs');

// Read .env.local
const envContent = require('fs').readFileSync(path.join(__dirname, '.env.local'), 'utf8');
let dbUrl = '';
for (const line of envContent.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
  }
}

const pool = new Pool({ connectionString: dbUrl });

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('Tables:', res.rows.map(r => r.table_name).join(', '));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
