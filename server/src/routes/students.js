import { Router } from 'express';
import { query } from '../db/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/students — list with pagination, search, filter
router.get('/', authenticate, asyncHandler(async (req, res) => {
    try {
        const { search, class: cls, section, page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let baseWhere = 'WHERE 1=1';
        const params = [];
        let paramIdx = 0;

        if (search) {
            paramIdx++;
            const searchParam = `%${search}%`;
            baseWhere += ` AND (name ILIKE $${paramIdx} OR email ILIKE $${paramIdx} OR roll_number ILIKE $${paramIdx})`;
            params.push(searchParam);
        }

        if (cls && cls !== 'all') {
            paramIdx++;
            baseWhere += ` AND class = $${paramIdx}`;
            params.push(cls);
        }

        if (section && section !== 'all') {
            paramIdx++;
            baseWhere += ` AND section = $${paramIdx}`;
            params.push(section);
        }

        const countResult = await query(`SELECT COUNT(*) as total FROM students ${baseWhere}`, params);
        const total = parseInt(countResult.rows[0].total);

        paramIdx++;
        const limitParam = paramIdx;
        paramIdx++;
        const offsetParam = paramIdx;

        const studentsResult = await query(
            `SELECT * FROM students ${baseWhere} ORDER BY name ASC LIMIT $${limitParam} OFFSET $${offsetParam}`,
            [...params, parseInt(limit), offset]
        );

        res.json({
            success: true,
            data: {
                students: studentsResult.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit)),
                },
            },
        });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Failed to fetch students: ' + error.message, 500);
    }
}));

// GET /api/students/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
    try {
        const { rows } = await query('SELECT * FROM students WHERE id = $1', [req.params.id]);

        if (!rows[0]) {
            throw new AppError('Student not found', 404);
        }

        res.json({ success: true, data: { student: rows[0] } });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Failed to fetch student: ' + error.message, 500);
    }
}));

// POST /api/students
router.post('/', authenticate, authorize('admin', 'teacher'), asyncHandler(async (req, res) => {
    try {
        const { name, email, class: cls, section, roll_number, parent_id, attendance, performance } = req.body;

        if (!name || !email || !cls || !section || !roll_number) {
            throw new AppError('Name, email, class, section, and roll number are required', 400);
        }

        const id = uuidv4();
        await query(
            'INSERT INTO students (id, name, email, class, section, roll_number, parent_id, attendance, performance) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [id, name, email, cls, section, roll_number, parent_id || null, attendance || 0, performance || 0]
        );

        const { rows } = await query('SELECT * FROM students WHERE id = $1', [id]);

        res.status(201).json({ success: true, data: { student: rows[0] } });
    } catch (error) {
        if (error instanceof AppError) throw error;
        if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
            throw new AppError('A student with this email or roll number already exists', 409);
        }
        throw new AppError('Failed to create student: ' + error.message, 500);
    }
}));

// PUT /api/students/:id
router.put('/:id', authenticate, authorize('admin', 'teacher'), asyncHandler(async (req, res) => {
    try {
        const existingResult = await query('SELECT * FROM students WHERE id = $1', [req.params.id]);
        const existing = existingResult.rows[0];

        if (!existing) {
            throw new AppError('Student not found', 404);
        }

        const { name, email, class: cls, section, roll_number, parent_id, attendance, performance } = req.body;

        await query(
            `UPDATE students SET name = $1, email = $2, class = $3, section = $4, roll_number = $5, parent_id = $6, attendance = $7, performance = $8, updated_at = NOW() WHERE id = $9`,
            [
                name || existing.name,
                email || existing.email,
                cls || existing.class,
                section || existing.section,
                roll_number || existing.roll_number,
                parent_id ?? existing.parent_id,
                attendance ?? existing.attendance,
                performance ?? existing.performance,
                req.params.id
            ]
        );

        const { rows } = await query('SELECT * FROM students WHERE id = $1', [req.params.id]);

        res.json({ success: true, data: { student: rows[0] } });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Failed to update student: ' + error.message, 500);
    }
}));

// DELETE /api/students/:id
router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    try {
        const { rows } = await query('SELECT * FROM students WHERE id = $1', [req.params.id]);

        if (!rows[0]) {
            throw new AppError('Student not found', 404);
        }

        await query('DELETE FROM students WHERE id = $1', [req.params.id]);

        res.json({ success: true, message: 'Student deleted successfully' });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Failed to delete student: ' + error.message, 500);
    }
}));

export default router;
