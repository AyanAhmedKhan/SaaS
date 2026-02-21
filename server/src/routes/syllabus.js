import { Router } from 'express';
import { query } from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/syllabus
router.get('/', authenticate, asyncHandler(async (req, res) => {
    try {
        const { class: cls, subject, status } = req.query;

        let sql = 'SELECT * FROM syllabus WHERE 1=1';
        const params = [];
        let paramIdx = 0;

        if (cls && cls !== 'all') {
            paramIdx++;
            sql += ` AND class = $${paramIdx}`;
            params.push(cls);
        }

        if (subject && subject !== 'all') {
            paramIdx++;
            sql += ` AND subject = $${paramIdx}`;
            params.push(subject);
        }

        if (status && status !== 'all') {
            paramIdx++;
            sql += ` AND status = $${paramIdx}`;
            params.push(status);
        }

        sql += ' ORDER BY class, subject, unit ASC';

        const { rows } = await query(sql, params);

        res.json({ success: true, data: { syllabus: rows } });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Failed to fetch syllabus: ' + error.message, 500);
    }
}));

// GET /api/syllabus/summary — completion summary
router.get('/summary', authenticate, asyncHandler(async (req, res) => {
    try {
        const { class: cls } = req.query;

        let sql = `
      SELECT 
        subject,
        COUNT(*) as total_topics,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'not_started' THEN 1 END) as not_started,
        ROUND(AVG(completion_percentage), 1) as avg_completion
      FROM syllabus
      WHERE 1=1
    `;
        const params = [];
        let paramIdx = 0;

        if (cls && cls !== 'all') {
            paramIdx++;
            sql += ` AND class = $${paramIdx}`;
            params.push(cls);
        }

        sql += ' GROUP BY subject ORDER BY subject ASC';

        const { rows } = await query(sql, params);

        res.json({ success: true, data: { summary: rows } });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Failed to fetch syllabus summary: ' + error.message, 500);
    }
}));

export default router;
