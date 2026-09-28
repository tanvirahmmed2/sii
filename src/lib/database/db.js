import pg from 'pg';
import { PG_USER, PG_PASSWORD, PG_HOST, PG_PORT, PG_DATABASE } from './secret.js';

const { Pool } = pg;

if (!global._postgresPool) {
  global._postgresPool = new Pool({
    user: PG_USER,
    password: PG_PASSWORD,
    host: PG_HOST,
    port: PG_PORT ? parseInt(PG_PORT, 10) : 5432,
    database: PG_DATABASE,
    ssl: { rejectUnauthorized: false }
  });
}

const pool = global._postgresPool;

export const query = (text, params) => pool.query(text, params);

export default pool;
