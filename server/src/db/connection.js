import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const { Pool } = pg;

let pool = null;

export function getPool() {
    if (!pool) {
        pool = new Pool({
            host: process.env.PGHOST || 'localhost',
            user: process.env.PGUSER || 'postgres',
            password: process.env.PGPASSWORD || 'ayan',
            database: process.env.PGDATABASE || 'eduyantra',
            port: parseInt(process.env.PGPORT || '5432'),
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
        });

        pool.on('connect', () => {
            console.log('[DB] New client connected to PostgreSQL (Local)');
        });

        pool.on('error', (err) => {
            console.error('[DB] Unexpected pool error:', err.message);
        });

        console.log('[DB] PostgreSQL pool created');
    }
    return pool;
}

/**
 * Helper to run a query. Returns the full pg Result object.
 * Usage:  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
 */
export async function query(text, params) {
    const pool = getPool();
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 500) {
        console.warn(`[DB] Slow query (${duration}ms):`, text.substring(0, 80));
    }
    return result;
}

/**
 * Get a dedicated client for transactions.
 * Usage:
 *   const client = await getClient();
 *   try {
 *     await client.query('BEGIN');
 *     ... await client.query(...) ...
 *     await client.query('COMMIT');
 *   } catch (e) {
 *     await client.query('ROLLBACK');
 *     throw e;
 *   } finally {
 *     client.release();
 *   }
 */
export async function getClient() {
    const pool = getPool();
    return pool.connect();
}

export async function closePool() {
    if (pool) {
        try {
            await pool.end();
            pool = null;
            console.log('[DB] PostgreSQL pool closed');
        } catch (error) {
            console.error('[DB] Error closing pool:', error.message);
        }
    }
}
