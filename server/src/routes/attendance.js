import { Router } from 'express';
import { query, getClient } from '../db/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/attendance — get attendance records with filters
router.get('/', authenticate, asyncHandler(async (req, res) => {
    try {
        const { student_id, date, class: cls, section, start_date, end_date } = req.query;

        let sql = `
      SELECT ar.*, s.name as student_name, s.class, s.section, s.roll_number
      FROM attendance_records ar
      JOIN students s ON ar.student_id = s.id
      WHERE 1=1
    `;
        const params = [];
        let paramIdx = 0;

        if (student_id) {
            paramIdx++;
            sql += ` AND ar.student_id = $${paramIdx}`;
            params.push(student_id);
        }

        if (date) {
            paramIdx++;
            sql += ` AND ar.date = $${paramIdx}`;
            params.push(date);
        }

        if (cls && cls !== 'all') {
            paramIdx++;
            sql += ` AND s.class = $${paramIdx}`;
            params.push(cls);
        }

        if (section && section !== 'all') {
            paramIdx++;
            sql += ` AND s.section = $${paramIdx}`;
            params.push(section);
        }

        if (start_date && end_date) {
            paramIdx++;
            sql += ` AND ar.date >= $${paramIdx}`;
            params.push(start_date);
            paramIdx++;
            sql += ` AND ar.date <= $${paramIdx}`;
            params.push(end_date);
        }

        sql += ' ORDER BY ar.date DESC, s.name ASC LIMIT 500';

        const { rows } = await query(sql, params);

        res.json({ success: true, data: { attendance: rows } });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Failed to fetch attendance: ' + error.message, 500);
    }
}));

// GET /api/attendance/summary — attendance summary by month
router.get('/summary', authenticate, asyncHandler(async (req, res) => {
    try {
        const { class: cls, section } = req.query;

        let sql = `
      SELECT 
        TO_CHAR(ar.date::date, 'YYYY-MM') as month,
        COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN ar.status = 'late' THEN 1 END) as late_count,
        COUNT(*) as total_count,
        ROUND(COUNT(CASE WHEN ar.status = 'present' THEN 1 END) * 100.0 / COUNT(*), 1) as attendance_percentage
      FROM attendance_records ar
      JOIN students s ON ar.student_id = s.id
      WHERE 1=1
    `;
        const params = [];
        let paramIdx = 0;

        if (cls && cls !== 'all') {
            paramIdx++;
            sql += ` AND s.class = $${paramIdx}`;
            params.push(cls);
        }

        if (section && section !== 'all') {
            paramIdx++;
            sql += ` AND s.section = $${paramIdx}`;
            params.push(section);
        }

        sql += ` GROUP BY TO_CHAR(ar.date::date, 'YYYY-MM') ORDER BY month ASC`;

        const { rows } = await query(sql, params);

        res.json({ success: true, data: { summary: rows } });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Failed to fetch attendance summary: ' + error.message, 500);
    }
}));

// POST /api/attendance — mark attendance (bulk)
router.post('/', authenticate, authorize('admin', 'teacher'), asyncHandler(async (req, res) => {
    try {
        const { records } = req.body;

        if (!Array.isArray(records) || records.length === 0) {
            throw new AppError('Attendance records array is required', 400);
        }

        const client = await getClient();
        try {
            await client.query('BEGIN');

            for (const record of records) {
                if (!record.student_id || !record.date || !record.status) {
                    throw new AppError('Each record must have student_id, date, and status', 400);
                }
                await client.query(
                    `INSERT INTO attendance_records (id, student_id, date, status, marked_by)
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (student_id, date)
                     DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by`,
                    [record.id || uuidv4(), record.student_id, record.date, record.status, req.user.id]
                );
            }

            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

        res.status(201).json({
            success: true,
            message: `${records.length} attendance records saved`,
        });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Failed to save attendance: ' + error.message, 500);
    }
}));

export default router;
