import pool, { query } from '../database/db.js';

export { pool, query };

/**
 * Standard queryDb wrapper around PostgreSQL pool.query
 * @param {string} text - SQL query string
 * @param {Array} [params] - Query parameter bindings
 * @returns {Promise<import('pg').QueryResult>}
 */
export const queryDb = async (text, params) => {
  return pool.query(text, params);
};

export default {
  query: queryDb,
  queryDb,
  pool,
};
