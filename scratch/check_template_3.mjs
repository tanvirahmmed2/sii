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
  try {
    const res = await pool.query('SELECT id, name, fabric_data, fabric_back_data FROM system_student_id_templates WHERE id = 3');
    if (!res.rows.length) {
      console.log('No template with id 3 found in system_student_id_templates');
      const all = await pool.query('SELECT id, name FROM system_student_id_templates');
      console.log('All templates in system_student_id_templates:', all.rows);
      return;
    }
    const row = res.rows[0];
    console.log('Template:', row.id, row.name);
    console.log('fabric_data:', JSON.stringify(row.fabric_data, null, 2).slice(0, 500));
    console.log('fabric_back_data:', JSON.stringify(row.fabric_back_data, null, 2).slice(0, 500));
    if (row.fabric_data?.objects) {
      console.log('Object types in front:', row.fabric_data.objects.map(o => ({ type: o.type, text: o.text, name: o.name })));
    }
    if (row.fabric_back_data?.objects) {
      console.log('Object types in back:', row.fabric_back_data.objects.map(o => ({ type: o.type, text: o.text, name: o.name })));
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}
main();
