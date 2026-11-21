import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import pool, { query, queryDb } from './database/db';

export async function withTenantTransaction<T = unknown>(
  websiteId: string,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
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
