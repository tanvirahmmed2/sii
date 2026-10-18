import pg from 'pg';
import { TASK_CONFIGS, generateStarterFabricJSON } from '../src/lib/templates/fabricTemplates.js';

const { Pool } = pg;
const pool = new Pool({
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD,
  host: process.env.PG_HOST,
  port: process.env.PG_PORT ? parseInt(process.env.PG_PORT, 10) : 5432,
  database: process.env.PG_DATABASE,
  ssl: { rejectUnauthorized: false }
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding starter Fabric.js templates into dedicated tables...');
    for (const [key, cfg] of Object.entries(TASK_CONFIGS)) {
      const fabricJSON = generateStarterFabricJSON(key);
      const defaultSlug = `default-${cfg.slug}`;
      const defaultName = `Standard Default ${cfg.name}`;

      // Check if table has a default or rows
      const existing = await client.query(`SELECT id FROM ${cfg.systemTable} LIMIT 1`);
      if (existing.rows.length === 0) {
        await client.query(`
          INSERT INTO ${cfg.systemTable} (
            name, slug, description, dimension_width, dimension_height,
            dimension_unit, orientation, fabric_data, fabric_back_data,
            available_merge_tags, is_active, is_system_default
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, true
          )
        `, [
          defaultName,
          defaultSlug,
          `Official standard visual template for ${cfg.name}. Built with Fabric.js vector canvas.`,
          cfg.dimension_width,
          cfg.dimension_height,
          cfg.dimension_unit,
          cfg.orientation,
          JSON.stringify(fabricJSON),
          cfg.hasBackSide ? JSON.stringify({ version: '5.3.0', background: '#ffffff', objects: [] }) : '{}',
          JSON.stringify(cfg.mergeTags)
        ]);
        console.log(`Seeded default template into ${cfg.systemTable}`);
      } else {
        // If row exists but fabric_data is empty or grapesjs, update with starter fabric JSON
        await client.query(`
          UPDATE ${cfg.systemTable}
          SET fabric_data = $1,
              available_merge_tags = $2
          WHERE fabric_data = '{}'::jsonb OR fabric_data IS NULL;
        `, [
          JSON.stringify(fabricJSON),
          JSON.stringify(cfg.mergeTags)
        ]);
        console.log(`Updated empty fabric_data in ${cfg.systemTable}`);
      }
    }
    console.log('Fabric template seeding complete!');
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
