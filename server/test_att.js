import { query, closePool } from './src/db/connection.js';

async function check() {
    try {
        const res = await query('SELECT MAX(date) as max_date, MIN(date) as min_date, COUNT(*) as count FROM attendance_records');
        console.log(res.rows[0]);
    } catch (err) {
        console.error(err);
    } finally {
        await closePool();
    }
}

check();
