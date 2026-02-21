import { Router } from 'express';
import { query } from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/timetable
router.get('/', authenticate, asyncHandler(async (req, res) => {
    try {
        const { class: cls, section, day } = req.query;

        let sql = `
      SELECT tt.*, t.name as teacher_name, t.subject as teacher_subject
      FROM timetable tt
      LEFT JOIN teachers t ON tt.teacher_id = t.id
      WHERE 1=1
    `;
        const params = [];
        let paramIdx = 0;

        if (cls && cls !== 'all') {
            paramIdx++;
            sql += ` AND tt.class = $${paramIdx}`;
            params.push(cls);
        }

        if (section && section !== 'all') {
            paramIdx++;
            sql += ` AND tt.section = $${paramIdx}`;
            params.push(section);
        }

        if (day && day !== 'all') {
            paramIdx++;
            sql += ` AND tt.day = $${paramIdx}`;
            params.push(day);
        }

        sql += ' ORDER BY tt.day, tt.period ASC';

        const { rows } = await query(sql, params);

        res.json({ success: true, data: { timetable: rows } });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Failed to fetch timetable: ' + error.message, 500);
    }
}));

// GET /api/timetable/classes — get unique classes/sections
router.get('/classes', authenticate, asyncHandler(async (req, res) => {
    try {
        const { rows } = await query('SELECT DISTINCT class, section FROM timetable ORDER BY class, section');

        res.json({ success: true, data: { classes: rows } });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Failed to fetch classes: ' + error.message, 500);
    }
}));

export default router;
