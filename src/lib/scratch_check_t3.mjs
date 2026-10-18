import { queryDb, pool } from './database/db.js';

async function main() {
  const res = await queryDb('SELECT id, name, fabric_data, fabric_back_data FROM system_student_id_templates WHERE id = 3');
  if (res.rows.length === 0) {
    console.log('Template 3 not found in system_student_id_templates');
    const all = await queryDb('SELECT id, name FROM system_student_id_templates');
    console.log('All system_student_id_templates:', all.rows);
  } else {
    console.log('Found template 3:', res.rows[0].name);
    console.log('fabric_data type:', typeof res.rows[0].fabric_data);
    const fd = res.rows[0].fabric_data;
    console.log('fabric_data stringified:', JSON.stringify(fd, null, 2));
    console.log('fabric_back_data stringified:', JSON.stringify(res.rows[0].fabric_back_data, null, 2));
  }
  await pool.end();
}
main().catch(console.error);
