const { queryDb } = require('../src/lib/database/db');

async function main() {
  const wmCols = await queryDb("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='website_modules' ORDER BY ordinal_position");
  console.log('website_modules columns:', wmCols.rows);

  const tm = await queryDb("SELECT * FROM tenant_modules LIMIT 10").catch(e => ({ error: e.message }));
  console.log('tenant_modules sample:', tm.rows || tm.error);

  const wmSample = await queryDb("SELECT * FROM website_modules LIMIT 10").catch(e => ({ error: e.message }));
  console.log('website_modules sample:', wmSample.rows || wmSample.error);
}

main().catch(console.error);
