import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD,
  host: process.env.PG_HOST,
  port: process.env.PG_PORT ? parseInt(process.env.PG_PORT, 10) : 5432,
  database: process.env.PG_DATABASE,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('Splitting template tables and updating foreign keys to point to dedicated tables...');
    await client.query('BEGIN');

    // 1. Drop old foreign keys referencing website_document_templates if they exist
    const fks = [
      { table: 'website_student_ids', target: 'website_student_id_templates' },
      { table: 'website_teacher_ids', target: 'website_teacher_id_templates' },
      { table: 'website_officer_ids', target: 'website_officer_id_templates' },
      { table: 'website_student_tcs', target: 'website_student_tc_templates' },
      { table: 'website_student_testimonials', target: 'website_student_testimonial_templates' },
      { table: 'website_student_certificates', target: 'website_student_certificate_templates' },
    ];

    for (const item of fks) {
      // Find any constraint on template_id
      const res = await client.query(`
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = $1 
          AND kcu.column_name = 'template_id' 
          AND tc.constraint_type = 'FOREIGN KEY';
      `, [item.table]);

      for (const row of res.rows) {
        console.log(`Dropping old constraint ${row.constraint_name} on ${item.table}`);
        await client.query(`ALTER TABLE ${item.table} DROP CONSTRAINT IF EXISTS "${row.constraint_name}" CASCADE;`);
      }

      // Re-add FK referencing the separate task-specific template table
      console.log(`Adding foreign key from ${item.table}(template_id) -> ${item.target}(id)`);
      await client.query(`
        ALTER TABLE ${item.table} 
        ADD CONSTRAINT fk_${item.table}_template 
        FOREIGN KEY (template_id) REFERENCES ${item.target}(id) ON DELETE SET NULL;
      `);
    }

    // Drop the old unified tables if desired or keep as empty / drop
    console.log('Dropping old unified tables system_document_templates and website_document_templates...');
    await client.query(`DROP TABLE IF EXISTS website_document_templates CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS system_document_templates CASCADE;`);

    await client.query('COMMIT');
    console.log('Successfully completed template table split and FK re-linking!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in table splitting:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
