import { Pool, QueryResult, QueryResultRow } from 'pg';
import { PG_USER, PG_PASSWORD, PG_HOST, PG_PORT, PG_DATABASE } from './secret';

declare global {
  var _postgresPool: Pool | undefined;
}

if (!global._postgresPool) {
  global._postgresPool = new Pool({
    user: PG_USER,
    password: PG_PASSWORD,
    host: PG_HOST,
    port: PG_PORT ? parseInt(PG_PORT, 10) : 5432,
    database: PG_DATABASE,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  global._postgresPool.on('error', (err: Error) => {
    console.error('[Postgres Pool Error]:', err?.message || err);
  });
}

export const pool: Pool = global._postgresPool;

export const query = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => pool.query<T>(text, params);

export const queryDb = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => pool.query<T>(text, params);

export default pool;
