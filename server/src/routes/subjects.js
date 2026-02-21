import { Router } from 'express';
import { query } from '../db/connection.js';
import { authenticate, authorize, requireInstitute, logAudit } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticate, requireInstitute);

// ── GET /api/subjects ──
router.get('/', asyncHandler(async (req, res) => {
    const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
    const { rows } = await query(
        'SELECT * FROM subjects WHERE institute_id = $1 ORDER BY name',
        [instId]
    );
    res.json({ success: true, data: { subjects: rows } });
}));

// ── GET /api/subjects/by-class/:classId ──
router.get('/by-class/:classId', asyncHandler(async (req, res) => {
    const { rows } = await query(
        `SELECT s.*, cs.teacher_id, cs.periods_per_week,
                t.name as teacher_name
         FROM class_subjects cs
         JOIN subjects s ON cs.subject_id = s.id
         LEFT JOIN teachers t ON cs.teacher_id = t.id
         WHERE cs.class_id = $1 AND s.is_active = true
         ORDER BY s.name`,
        [req.params.classId]
    );
    res.json({ success: true, data: { subjects: rows } });
}));

// ── POST /api/subjects ──
router.post('/', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
    const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
    const { name, code, description } = req.body;
    if (!name) throw new AppError('Subject name is required', 400);

    const { randomUUID } = await import('crypto');
    const id = `sub_${randomUUID().replace(/-/g, '').substring(0, 10)}`;

    await query(
        'INSERT INTO subjects (id, institute_id, name, code, description) VALUES ($1, $2, $3, $4, $5)',
        [id, instId, name, code || null, description || null]
    );

    await logAudit({ instituteId: instId, userId: req.user.id, action: 'create', entityType: 'subject', entityId: id, newValues: req.body, req });

    const { rows } = await query('SELECT * FROM subjects WHERE id = $1', [id]);
    res.status(201).json({ success: true, data: { subject: rows[0] } });
}));

// ── PUT /api/subjects/:id ──
router.put('/:id', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
    const { name, code, description, is_active } = req.body;
    const existing = await query('SELECT * FROM subjects WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) throw new AppError('Subject not found', 404);

    await query(
        `UPDATE subjects SET name = COALESCE($1, name), code = COALESCE($2, code), 
         description = COALESCE($3, description), is_active = COALESCE($4, is_active) WHERE id = $5`,
        [name, code, description, is_active, req.params.id]
    );

    const { rows } = await query('SELECT * FROM subjects WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: { subject: rows[0] } });
}));

// ── POST /api/subjects/assign – Assign subject to class with teacher ──
router.post('/assign', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
    const { class_id, subject_id, teacher_id, periods_per_week } = req.body;
    if (!class_id || !subject_id) throw new AppError('class_id and subject_id required', 400);

    const { randomUUID } = await import('crypto');
    const id = `cs_${randomUUID().replace(/-/g, '').substring(0, 10)}`;

    await query(
        `INSERT INTO class_subjects (id, class_id, subject_id, teacher_id, periods_per_week) 
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (class_id, subject_id) DO UPDATE SET teacher_id = $4, periods_per_week = $5`,
        [id, class_id, subject_id, teacher_id || null, periods_per_week || 5]
    );

    res.json({ success: true, message: 'Subject assigned to class' });
}));

// ── DELETE /api/subjects/:id ──
router.delete('/:id', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
    await query('UPDATE subjects SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Subject deactivated' });
}));

export default router;
