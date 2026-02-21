import { Router } from 'express';
import { query } from '../db/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/teachers
router.get('/', authenticate, asyncHandler(async (req, res) => {
    try {
        const { search, subject } = req.query;

        let sql = 'SELECT * FROM teachers WHERE 1=1';
        const params = [];
        let paramIdx = 0;

        if (search) {
            paramIdx++;
            sql += ` AND (name ILIKE $${paramIdx} OR email ILIKE $${paramIdx} OR subject ILIKE $${paramIdx})`;
            params.push(`%${search}%`);
        }

        if (subject && subject !== 'all') {
            paramIdx++;
            sql += ` AND subject = $${paramIdx}`;
            params.push(subject);
        }

        sql += ' ORDER BY name ASC';
        const { rows } = await query(sql, params);

        // Parse classes JSON
        const parsed = rows.map(t => ({
            ...t,
            classes: JSON.parse(t.classes || '[]'),
        }));

        res.json({ success: true, data: { teachers: parsed } });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Failed to fetch teachers: ' + error.message, 500);
    }
}));

// GET /api/teachers/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
    try {
        const { rows } = await query('SELECT * FROM teachers WHERE id = $1', [req.params.id]);
        const teacher = rows[0];

        if (!teacher) {
            throw new AppError('Teacher not found', 404);
        }

        teacher.classes = JSON.parse(teacher.classes || '[]');

        res.json({ success: true, data: { teacher } });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Failed to fetch teacher: ' + error.message, 500);
    }
}));

// POST /api/teachers
router.post('/', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    try {
        const { name, email, subject, classes, phone, user_id } = req.body;

        if (!name || !email || !subject) {
            throw new AppError('Name, email, and subject are required', 400);
        }

        const id = uuidv4();
        await query(
            'INSERT INTO teachers (id, user_id, name, email, subject, classes, phone) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [id, user_id || null, name, email, subject, JSON.stringify(classes || []), phone || null]
        );

        const { rows } = await query('SELECT * FROM teachers WHERE id = $1', [id]);
        rows[0].classes = JSON.parse(rows[0].classes || '[]');

        res.status(201).json({ success: true, data: { teacher: rows[0] } });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Failed to create teacher: ' + error.message, 500);
    }
}));

// PUT /api/teachers/:id
router.put('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    try {
        const existingResult = await query('SELECT * FROM teachers WHERE id = $1', [req.params.id]);
        const existing = existingResult.rows[0];

        if (!existing) {
            throw new AppError('Teacher not found', 404);
        }

        const { name, email, subject, classes, phone } = req.body;

        await query(
            `UPDATE teachers SET name = $1, email = $2, subject = $3, classes = $4, phone = $5, updated_at = NOW() WHERE id = $6`,
            [
                name || existing.name,
                email || existing.email,
                subject || existing.subject,
                classes ? JSON.stringify(classes) : existing.classes,
                phone ?? existing.phone,
                req.params.id
            ]
        );

        const { rows } = await query('SELECT * FROM teachers WHERE id = $1', [req.params.id]);
        rows[0].classes = JSON.parse(rows[0].classes || '[]');

        res.json({ success: true, data: { teacher: rows[0] } });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Failed to update teacher: ' + error.message, 500);
    }
}));

// DELETE /api/teachers/:id
router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    try {
        const { rows } = await query('SELECT * FROM teachers WHERE id = $1', [req.params.id]);

        if (!rows[0]) {
            throw new AppError('Teacher not found', 404);
        }

        await query('DELETE FROM teachers WHERE id = $1', [req.params.id]);

        res.json({ success: true, message: 'Teacher deleted successfully' });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Failed to delete teacher: ' + error.message, 500);
    }
}));

export default router;
