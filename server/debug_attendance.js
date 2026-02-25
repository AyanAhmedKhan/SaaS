import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    await client.connect();
    const students = await client.query(`SELECT id, name, user_id, institute_id FROM students WHERE status = 'active' LIMIT 10`);

    if (students.rows.length === 0) {
        console.log("No students found.");
        await client.end();
        return;
    }

    for (const s of students.rows) {
        console.log(`\nStudent: ${s.name} (${s.id}) Inst: ${s.institute_id}`);

        // Dashboard query
        const dash = await client.query(`
      SELECT COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status='present') AS present,
         ROUND(COUNT(*) FILTER (WHERE status='present')::NUMERIC/NULLIF(COUNT(*),0)*100,1) AS percentage
      FROM attendance_records WHERE student_id=$1 AND institute_id=$2
    `, [s.id, s.institute_id]);
        console.log("Dashboard:", dash.rows[0]);

        // Summary Query
        const summ = await client.query(`
      SELECT s.id AS student_id, s.name AS student_name, s.roll_number,
       COUNT(ar.id) AS total_days,
       COUNT(*) FILTER (WHERE ar.status = 'present') AS present_days,
       COUNT(*) FILTER (WHERE ar.status = 'absent') AS absent_days,
       COUNT(*) FILTER (WHERE ar.status = 'late') AS late_days,
       COUNT(*) FILTER (WHERE ar.status = 'excused') AS excused_days,
       ROUND(COUNT(*) FILTER (WHERE ar.status = 'present')::NUMERIC / NULLIF(COUNT(ar.id), 0) * 100, 1) AS attendance_percentage
     FROM students s
     LEFT JOIN attendance_records ar ON s.id = ar.student_id 
     WHERE s.institute_id = $1 AND s.status = 'active' AND s.id = $2
     GROUP BY s.id, s.name, s.roll_number
     ORDER BY s.roll_number
    `, [s.institute_id, s.id]);
        console.log("Summary API:", summ.rows[0]);
    }

    await client.end();
}
run().catch(console.error);
