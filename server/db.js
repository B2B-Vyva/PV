import pg from 'pg';
import { DATABASE_URL } from './config.js';

const { Pool } = pg;

export const hasDatabase = Boolean(DATABASE_URL);

export const pool = hasDatabase
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : null;

export async function query(text, params = []) {
  if (!pool) {
    const error = new Error('DATABASE_URL is not configured.');
    error.status = 503;
    throw error;
  }
  return pool.query(text, params);
}

export async function withTransaction(work) {
  if (!pool) {
    const error = new Error('DATABASE_URL is not configured.');
    error.status = 503;
    throw error;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
