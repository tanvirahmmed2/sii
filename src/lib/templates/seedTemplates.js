import { queryDb } from '../database/db.js';
import { TASK_CONFIGS, generateStarterFabricJSON } from './fabricTemplates.js';

export async function seedSystemTemplates(developerId = null) {
  const results = [];
  for (const [key, cfg] of Object.entries(TASK_CONFIGS)) {
    try {
      const fabricJSON = generateStarterFabricJSON(key);
      const defaultSlug = `default-${cfg.slug}`;
      const defaultName = `Standard Default ${cfg.name}`;

      const checkRes = await queryDb(
        `SELECT id FROM ${cfg.systemTable} WHERE slug = $1 LIMIT 1`,
        [defaultSlug]
      );

      if (checkRes.rows.length === 0) {
        const insertRes = await queryDb(
          `INSERT INTO ${cfg.systemTable} 
           (name, slug, description, dimension_width, dimension_height, dimension_unit, fabric_data, fabric_back_data, available_merge_tags, is_active, is_system_default, created_by_developer_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, TRUE, $10)
           RETURNING id, name, slug`,
          [
            defaultName,
            defaultSlug,
            `Official standard visual template for ${cfg.name}. Built with Fabric.js vector canvas.`,
            cfg.dimension_width,
            cfg.dimension_height,
            cfg.dimension_unit,
            JSON.stringify(fabricJSON),
            cfg.hasBackSide ? JSON.stringify({ version: '5.3.0', background: '#ffffff', objects: [] }) : '{}',
            JSON.stringify(cfg.mergeTags || []),
            developerId,
          ]
        );
        results.push({ action: 'created', table: cfg.systemTable, template: insertRes.rows[0] });
      } else {
        results.push({ action: 'already_exists', table: cfg.systemTable, slug: defaultSlug });
      }
    } catch (e) {
      console.error(`Error seeding template for ${cfg.systemTable}:`, e.message);
      results.push({ action: 'error', table: cfg.systemTable, error: e.message });
    }
  }
  return results;
}
