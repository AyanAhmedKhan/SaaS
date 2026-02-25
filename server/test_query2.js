import { query, closePool } from './src/db/connection.js';

async function check() {
    try {
        const res = await query(`
      SELECT student_id, COUNT(*) 
      FROM attendance_records 
      WHERE date >= '2026-02-01' AND date < '2026-03-01'
      GROUP BY student_id
    `);
        console.log(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await closePool();
    }
}

check();
