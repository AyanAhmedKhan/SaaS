import { Router } from 'express';
import { query } from '../db/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/notices
router.get('/', authenticate, asyncHandler(async (req, res) => {
    try {
        const { priority, limit = 20 } = req.query;

        let sql = 'SELECT * FROM notices WHERE 1=1';
        const params = [];
        let paramIdx = 0;

        if (priority && priority !== 'all') {
            paramIdx++;
            sql += ` AND priority = $${paramIdx}`;
            params.push(priority);
        }

        paramIdx++;
        sql += ` ORDER BY date DESC LIMIT $${paramIdx}`;
        params.push(parseInt(limit));

        const { rows } = await query(sql, params);

        res.json({ success: true, data: { notices: rows } });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Failed to fetch notices: ' + error.message, 500);
    }
}));

// POST /api/notices
router.post('/', authenticate, authorize('admin', 'teacher'), asyncHandler(async (req, res) => {
    try {
        const { title, content, priority } = req.body;

        if (!title || !content) {
            throw new AppError('Title and content are required', 400);
        }

        const id = uuidv4();
        const date = new Date().toISOString().split('T')[0];

        await query(
            'INSERT INTO notices (id, title, content, date, priority, created_by) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, title, content, date, priority || 'medium', req.user.id]
        );

        const { rows } = await query('SELECT * FROM notices WHERE id = $1', [id]);

        res.status(201).json({ success: true, data: { notice: rows[0] } });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Failed to create notice: ' + error.message, 500);
    }
}));

// PUT /api/notices/:id
router.put('/:id', authenticate, authorize('admin', 'teacher'), asyncHandler(async (req, res) => {
    try {
        const existingResult = await query('SELECT * FROM notices WHERE id = $1', [req.params.id]);

        if (!existingResult.rows[0]) {
            throw new AppError('Notice not found', 404);
        }

        const existing = existingResult.rows[0];
        const { title, content, priority } = req.body;

        await query(
            `UPDATE notices SET title = $1, content = $2, priority = $3, updated_at = NOW() WHERE id = $4`,
            [
                title || existing.title,
                content || existing.content,
                priority || existing.priority,
                req.params.id
            ]
        );

        const { rows } = await query('SELECT * FROM notices WHERE id = $1', [req.params.id]);

        res.json({ success: true, data: { notice: rows[0] } });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Failed to update notice: ' + error.message, 500);
    }
}));

// DELETE /api/notices/:id
router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    try {
        const { rows } = await query('SELECT * FROM notices WHERE id = $1', [req.params.id]);

        if (!rows[0]) {
            throw new AppError('Notice not found', 404);
        }

        await query('DELETE FROM notices WHERE id = $1', [req.params.id]);

        res.json({ success: true, message: 'Notice deleted successfully' });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Failed to delete notice: ' + error.message, 500);
    }
}));

export default router;
