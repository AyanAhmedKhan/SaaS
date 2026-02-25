import { query, closePool } from './src/db/connection.js';

async function testBackend() {
    const y = 2026, m = 2;
    const firstDay = `${y}-${String(m).padStart(2, '0')}-01`;
    const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;

    const sql = `
    SELECT ar.date, ar.status, ar.student_id, ar.class_id
    FROM attendance_records ar
    WHERE ar.date >= $1 AND ar.date < $2
  `;
    try {
        const res = await query(sql, [firstDay, nextMonth]);
        console.log(`Found ${res.rows.length} records for ${firstDay} to ${nextMonth}`);
        if (res.rows.length > 0) {
            console.log('First record date:', res.rows[0].date, 'type:', typeof res.rows[0].date);
            // Let's also stringify to see what express sends
            console.log('JSON:', JSON.stringify(res.rows[0]));
        }
    } catch (err) {
        console.error(err);
    } finally {
        closePool();
    }
}
testBackend();
