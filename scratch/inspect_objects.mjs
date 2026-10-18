import pg from 'pg';

const pool = new pg.Pool({
  user: 'postgres.sqxdooluvklbffbkunxe',
  password: 'tanvir483469',
  host: 'aws-0-ap-northeast-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const res = await pool.query('SELECT id, name, fabric_data, fabric_back_data FROM system_student_id_templates WHERE id = 3');
  const template = res.rows[0];
  console.log('Template 3 objects:');
  const objs = template.fabric_data?.objects || [];
  objs.forEach((o, i) => {
    console.log(`[${i}] type: ${o.type}, name: ${o.name}`);
    if (o.type === 'path' || o.type === 'polyline' || o.type === 'polygon' || o.type === 'group') {
      console.log('   details:', JSON.stringify(o).slice(0, 200));
    }
    // Check all array properties
    for (const [k, v] of Object.entries(o)) {
      if (Array.isArray(v)) {
        console.log(`   Array prop: ${k}, length: ${v.length}`);
      }
    }
  });
  await pool.end();
}
main();
