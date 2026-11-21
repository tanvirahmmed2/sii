import fs from 'fs';
import path from 'path';
import { pool, query } from './db';

export async function uploadTables(): Promise<{ success: boolean; total_tables: number }> {
  console.log('\n======================================================');
  console.log('1. UPLOADING ALL DATABASE TABLES & SCHEMAS');
  console.log('======================================================');

  const schemaPath = path.resolve(process.cwd(), 'psql/schema.psql');
  const websiteTablesPath = path.resolve(process.cwd(), 'psql/website_tables.psql');

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`schema.psql not found at: ${schemaPath}`);
  }
  if (!fs.existsSync(websiteTablesPath)) {
    throw new Error(`website_tables.psql not found at: ${websiteTablesPath}`);
  }

  console.log('-> Executing psql/schema.psql (Platform & SaaS schemas)...');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await query(schemaSql);
  console.log('✓ psql/schema.psql executed successfully.');

  console.log('-> Executing psql/website_tables.psql (Tenant Educational schemas)...');
  const websiteTablesSql = fs.readFileSync(websiteTablesPath, 'utf8');
  await query(websiteTablesSql);
  console.log('✓ psql/website_tables.psql executed successfully.');

  const res = await query(`
    SELECT count(*)::int AS count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);

  const totalTables = res.rows[0]?.count || 0;
  console.log(`✓ Total base tables verified in PostgreSQL: ${totalTables}`);

  return {
    success: true,
    total_tables: totalTables,
  };
}

if (typeof require !== 'undefined' && require.main === module) {
  uploadTables()
    .then((result) => {
      console.log(`\nAll database tables successfully uploaded (${result.total_tables} tables)!`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n✗ Error uploading database tables:', err);
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}
