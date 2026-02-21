import { Router } from 'express';
import { query } from '../db/connection.js';
import { authenticate, authorize, requireInstitute, logAudit } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticate, requireInstitute);

// ── GET /api/classes ──
router.get('/', asyncHandler(async (req, res) => {
    const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
    const { academic_year_id } = req.query;

    let sql = `SELECT c.*, ay.name as academic_year_name,
               (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status = 'active') as student_count,
               (SELECT u.name FROM users u JOIN teachers t ON t.user_id = u.id WHERE t.id = c.class_teacher_id) as class_teacher_name
               FROM classes c
               JOIN academic_years ay ON c.academic_year_id = ay.id
               WHERE c.institute_id = $1`;
    const params = [instId];

    if (academic_year_id) {
        params.push(academic_year_id);
        sql += ` AND c.academic_year_id = $${params.length}`;
    } else {
        sql += ` AND ay.is_current = true`;
    }

    sql += ' ORDER BY c.name, c.section';
    const { rows } = await query(sql, params);
    res.json({ success: true, data: { classes: rows } });
}));

// ── POST /api/classes ──
router.post('/', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
    const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
    const { name, section, capacity, class_teacher_id, academic_year_id } = req.body;

    if (!name) throw new AppError('Class name is required', 400);

    // Get current academic year if not specified
    let ayId = academic_year_id;
    if (!ayId) {
        const ayResult = await query('SELECT id FROM academic_years WHERE institute_id = $1 AND is_current = true', [instId]);
        if (!ayResult.rows[0]) throw new AppError('No current academic year found', 404);
        ayId = ayResult.rows[0].id;
    }

    const { randomUUID } = await import('crypto');
    const id = `cls_${randomUUID().replace(/-/g, '').substring(0, 10)}`;

    await query(
        `INSERT INTO classes (id, institute_id, academic_year_id, name, section, capacity, class_teacher_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, instId, ayId, name, section || 'A', capacity || 60, class_teacher_id || null]
    );

    await logAudit({ instituteId: instId, userId: req.user.id, action: 'create', entityType: 'class', entityId: id, newValues: req.body, req });

    const { rows } = await query(
        `SELECT c.*, ay.name as academic_year_name FROM classes c JOIN academic_years ay ON c.academic_year_id = ay.id WHERE c.id = $1`,
        [id]
    );
    res.status(201).json({ success: true, data: { class: rows[0] } });
}));

// ── PUT /api/classes/:id ──
router.put('/:id', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, section, capacity, class_teacher_id } = req.body;

    const existing = await query('SELECT * FROM classes WHERE id = $1', [id]);
    if (!existing.rows[0]) throw new AppError('Class not found', 404);
    if (req.user.role !== 'super_admin' && existing.rows[0].institute_id !== req.instituteId) {
        throw new AppError('Access denied', 403);
    }

    await query(
        `UPDATE classes SET name = COALESCE($1, name), section = COALESCE($2, section), 
         capacity = COALESCE($3, capacity), class_teacher_id = COALESCE($4, class_teacher_id), updated_at = NOW() WHERE id = $5`,
        [name, section, capacity, class_teacher_id, id]
    );

    await logAudit({ instituteId: existing.rows[0].institute_id, userId: req.user.id, action: 'update', entityType: 'class', entityId: id, req });

    const { rows } = await query(
        `SELECT c.*, ay.name as academic_year_name FROM classes c JOIN academic_years ay ON c.academic_year_id = ay.id WHERE c.id = $1`,
        [id]
    );
    res.json({ success: true, data: { class: rows[0] } });
}));

// ── DELETE /api/classes/:id ──
router.delete('/:id', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
    const existing = await query('SELECT * FROM classes WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) throw new AppError('Class not found', 404);

    const studentCount = await query('SELECT COUNT(*) FROM students WHERE class_id = $1', [req.params.id]);
    if (parseInt(studentCount.rows[0].count) > 0) {
        throw new AppError('Cannot delete class with students. Move students first.', 400);
    }

    await query('DELETE FROM classes WHERE id = $1', [req.params.id]);
    await logAudit({ instituteId: existing.rows[0].institute_id, userId: req.user.id, action: 'delete', entityType: 'class', entityId: req.params.id, req });

    res.json({ success: true, message: 'Class deleted' });
}));

export default router;
