import { Router } from 'express';
import { query } from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/reports/exam-results
router.get('/exam-results', authenticate, asyncHandler(async (req, res) => {
    try {
        const { student_id, exam, subject } = req.query;

        let sql = `
      SELECT er.*, s.name as student_name, s.class, s.section, s.roll_number
      FROM exam_results er
      JOIN students s ON er.student_id = s.id
      WHERE 1=1
    `;
        const params = [];
        let paramIdx = 0;

        if (student_id) {
            paramIdx++;
            sql += ` AND er.student_id = $${paramIdx}`;
            params.push(student_id);
        }

        if (exam && exam !== 'all') {
            paramIdx++;
            sql += ` AND er.exam = $${paramIdx}`;
            params.push(exam);
        }

        if (subject && subject !== 'all') {
            paramIdx++;
            sql += ` AND er.subject = $${paramIdx}`;
            params.push(subject);
        }

        sql += ' ORDER BY er.date DESC, er.subject ASC';

        const { rows } = await query(sql, params);

        res.json({ success: true, data: { results: rows } });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Failed to fetch exam results: ' + error.message, 500);
    }
}));

// GET /api/reports/performance-trend
router.get('/performance-trend', authenticate, asyncHandler(async (req, res) => {
    try {
        const { student_id } = req.query;

        let sql = `
      SELECT 
        exam,
        subject,
        ROUND(AVG(score)::numeric, 1) as avg_score,
        MIN(date) as date
      FROM exam_results
    `;
        const params = [];

        if (student_id) {
            sql += ' WHERE student_id = $1';
            params.push(student_id);
        }

        sql += ' GROUP BY exam, subject ORDER BY MIN(date) ASC';

        const { rows: trends } = await query(sql, params);

        // Pivot by exam
        const examMap = {};
        for (const t of trends) {
            if (!examMap[t.exam]) examMap[t.exam] = { exam: t.exam };
            examMap[t.exam][t.subject] = parseFloat(t.avg_score);
        }

        // Compute averages
        const performanceTrend = Object.values(examMap).map((e) => {
            const subjects = Object.keys(e).filter(k => k !== 'exam');
            const avg = subjects.reduce((sum, s) => sum + e[s], 0) / subjects.length;
            return { ...e, average: Math.round(avg * 10) / 10 };
        });

        res.json({ success: true, data: { performanceTrend } });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Failed to fetch performance trend: ' + error.message, 500);
    }
}));

// GET /api/reports/class-summary
router.get('/class-summary', authenticate, asyncHandler(async (req, res) => {
    try {
        const { rows } = await query(`
      SELECT 
        s.class,
        s.section,
        COUNT(DISTINCT s.id) as student_count,
        ROUND(AVG(s.attendance)::numeric, 1) as avg_attendance,
        ROUND(AVG(s.performance)::numeric, 1) as avg_performance
      FROM students s
      GROUP BY s.class, s.section
      ORDER BY s.class, s.section
    `);

        res.json({ success: true, data: { summary: rows } });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Failed to fetch class summary: ' + error.message, 500);
    }
}));

export default router;
