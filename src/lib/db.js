import pool, { query, queryDb } from './database/db.js';

export async function withTenantTransaction(websiteId, callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
    throw error;
  } finally {
    client.release();
  }
}

export { pool, query, queryDb };
export default pool;
