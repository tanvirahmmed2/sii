import { queryDb } from '../database/db.js';
import { DEFAULT_TEMPLATES } from './defaultTemplates.js';

export async function seedSystemTemplates(developerId = null) {
  const results = [];
  for (const tpl of DEFAULT_TEMPLATES) {
    try {
      const checkRes = await queryDb(
        `SELECT id FROM system_document_templates WHERE slug = $1 LIMIT 1`,
        [tpl.slug]
      );

      if (checkRes.rows.length === 0) {
        const insertRes = await queryDb(
          `INSERT INTO system_document_templates 
           (name, slug, category, description, dimension_width, dimension_height, dimension_unit, orientation, grapes_data, html_content, css_content, available_merge_tags, is_active, is_system_default, created_by_developer_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE, TRUE, $13)
           RETURNING id, name, slug, category`,
          [
            tpl.name,
            tpl.slug,
            tpl.category,
            tpl.description,
            tpl.dimension_width,
            tpl.dimension_height,
            tpl.dimension_unit,
            tpl.orientation,
            JSON.stringify(tpl.grapes_data || {}),
            tpl.html_content,
            tpl.css_content,
            JSON.stringify(tpl.available_merge_tags || []),
            developerId,
          ]
        );
        results.push({ action: 'created', template: insertRes.rows[0] });
      } else {
        results.push({ action: 'already_exists', slug: tpl.slug });
      }
    } catch (e) {
      console.error(`Error seeding template ${tpl.slug}:`, e.message);
      results.push({ action: 'error', slug: tpl.slug, error: e.message });
    }
  }
  return results;
}
