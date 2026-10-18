import { JSDOM } from 'jsdom';
import pg from 'pg';

const dom = new JSDOM(`<!DOCTYPE html><html><body><canvas id="c" width="600" height="400"></canvas></body></html>`);
global.window = dom.window;
global.document = dom.window.document;
global.HTMLCanvasElement = dom.window.HTMLCanvasElement;

import fabricModule from 'fabric';
const fabric = fabricModule.fabric || fabricModule.default || fabricModule;

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
    const template = res.rows[0];
    console.log('Template loaded:', template.name);

    const canvas = new fabric.Canvas('c', { width: 600, height: 400 });

    canvas.on('object:added', (e) => {
      console.log('object:added:', e.target?.type, e.target?.name);
      try {
        const json = canvas.toJSON(['id', 'name', 'mergeTag', 'isLocked']);
        console.log('toJSON success, objects count:', json.objects?.length);
      } catch (err) {
        console.error('ERROR inside object:added toJSON:', err);
      }
    });

    console.log('Calling loadFromJSON...');
    canvas.loadFromJSON(template.fabric_data, () => {
      console.log('loadFromJSON finished!');
      try {
        const json = canvas.toJSON(['id', 'name', 'mergeTag', 'isLocked']);
        console.log('Final toJSON success!');
      } catch (err) {
        console.error('ERROR in final toJSON:', err);
      }
    });
  } catch (err) {
    console.error('Fatal err:', err);
  } finally {
    await pool.end();
  }
}

main();
