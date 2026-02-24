import { Router } from 'express';
import { query, getClient } from '../db/connection.js';
import { authenticate, authorize, requireInstitute, logAudit } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import bcrypt from 'bcryptjs';

const router = Router();
router.use(authenticate, requireInstitute);

// GET /api/teachers
router.get('/', asyncHandler(async (req, res) => {
    const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
    const { search, status } = req.query;

    let sql = `SELECT t.*, 
               (SELECT json_agg(json_build_object('class_id', ta.class_id, 'subject_id', ta.subject_id, 'is_class_teacher', ta.is_class_teacher, 'class_name', c.name, 'section', c.section, 'subject_name', sub.name))
                FROM teacher_assignments ta 
                JOIN classes c ON ta.class_id = c.id 
                JOIN subjects sub ON ta.subject_id = sub.id
                WHERE ta.teacher_id = t.id) as assignments
               FROM teachers t WHERE t.institute_id = $1`;
    const params = [instId];

    if (search) {
        params.push(`%${search}%`);
        sql += ` AND (t.name ILIKE $${params.length} OR t.email ILIKE $${params.length} OR t.subject_specialization ILIKE $${params.length})`;
    }
    if (status && status !== 'all') {
        params.push(status);
        sql += ` AND t.status = $${params.length}`;
    } else {
        sql += ` AND t.status = 'active'`;
    }

    sql += ' ORDER BY t.name ASC';
    const { rows } = await query(sql, params);
    res.json({ success: true, data: { teachers: rows } });
}));

// GET /api/teachers/:id
router.get('/:id', asyncHandler(async (req, res) => {
    const { rows } = await query(
        `SELECT t.* FROM teachers t WHERE t.id = $1`,
        [req.params.id]
    );
    if (!rows[0]) throw new AppError('Teacher not found', 404);
    if (req.user.role !== 'super_admin' && rows[0].institute_id !== req.instituteId) {
        throw new AppError('Access denied', 403);
    }

    // Get assignments
    const assignments = await query(
        `SELECT ta.*, c.name as class_name, c.section, sub.name as subject_name
         FROM teacher_assignments ta
         JOIN classes c ON ta.class_id = c.id
         JOIN subjects sub ON ta.subject_id = sub.id
         WHERE ta.teacher_id = $1`,
        [req.params.id]
    );

    res.json({
        success: true,
        data: { teacher: { ...rows[0], assignments: assignments.rows } },
    });
}));

// POST /api/teachers
router.post('/', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
    const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
    const { name, email, phone, subject_specialization, qualification, experience_years, create_login, password } = req.body;

    if (!name || !email) throw new AppError('Name and email are required', 400);

    const { randomUUID } = await import('crypto');
    const client = await getClient();

    try {
        await client.query('BEGIN');

        let userId = null;
        if (create_login !== false) {
            if (!password || password.length < 8) {
                throw new AppError('Password is required and must be at least 8 characters when creating login', 400);
            }
            userId = `u_${randomUUID().replace(/-/g, '').substring(0, 10)}`;
            const passwordHash = bcrypt.hashSync(password, 12);
            await client.query(
                'INSERT INTO users (id, institute_id, name, email, password_hash, role, phone) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [userId, instId, name, email, passwordHash, 'class_teacher', phone || null]
            );
        }

        const teacherId = `t_${randomUUID().replace(/-/g, '').substring(0, 8)}`;
        await client.query(
            `INSERT INTO teachers (id, user_id, institute_id, name, email, phone, subject_specialization, qualification, experience_years) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [teacherId, userId, instId, name, email, phone || null, subject_specialization || null, qualification || null, experience_years || 0]
        );

        await client.query('COMMIT');

        await logAudit({ instituteId: instId, userId: req.user.id, action: 'create', entityType: 'teacher', entityId: teacherId, newValues: { name, email }, req });

        const result = await query('SELECT * FROM teachers WHERE id = $1', [teacherId]);
        res.status(201).json({ success: true, data: { teacher: result.rows[0] } });
    } catch (error) {
        await client.query('ROLLBACK');
        if (error instanceof AppError) throw error;
        if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
            throw new AppError('A teacher with this email already exists', 409);
        }
        throw new AppError('Failed to create teacher: ' + error.message, 500);
    } finally {
        client.release();
    }
}));

// PUT /api/teachers/:id
router.put('/:id', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
    const existing = await query('SELECT * FROM teachers WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) throw new AppError('Teacher not found', 404);

    const e = existing.rows[0];
    const { name, email, phone, subject_specialization, qualification, experience_years, status } = req.body;

    await query(
        `UPDATE teachers SET name = $1, email = $2, phone = $3, subject_specialization = $4,
         qualification = $5, experience_years = $6, status = $7, updated_at = NOW() WHERE id = $8`,
        [name || e.name, email || e.email, phone ?? e.phone, subject_specialization ?? e.subject_specialization,
        qualification ?? e.qualification, experience_years ?? e.experience_years, status || e.status, req.params.id]
    );

    await logAudit({ instituteId: e.institute_id, userId: req.user.id, action: 'update', entityType: 'teacher', entityId: req.params.id, oldValues: e, newValues: req.body, req });

    const result = await query('SELECT * FROM teachers WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: { teacher: result.rows[0] } });
}));

// POST /api/teachers/:id/assign — Assign teacher to class-subject
router.post('/:id/assign', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
    const { class_id, subject_id, is_class_teacher } = req.body;
    if (!class_id || !subject_id) throw new AppError('class_id and subject_id required', 400);

    const teacher = await query('SELECT * FROM teachers WHERE id = $1', [req.params.id]);
    if (!teacher.rows[0]) throw new AppError('Teacher not found', 404);

    const ayResult = await query('SELECT id FROM academic_years WHERE institute_id = $1 AND is_current = true', [teacher.rows[0].institute_id]);
    const ayId = ayResult.rows[0]?.id;
    if (!ayId) throw new AppError('No current academic year', 404);

    const { randomUUID } = await import('crypto');
    await query(
        `INSERT INTO teacher_assignments (id, teacher_id, class_id, subject_id, academic_year_id, institute_id, is_class_teacher)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (teacher_id, class_id, subject_id, academic_year_id) 
         DO UPDATE SET is_class_teacher = $7`,
        [`ta_${randomUUID().replace(/-/g, '').substring(0, 10)}`, req.params.id, class_id, subject_id, ayId, teacher.rows[0].institute_id, is_class_teacher || false]
    );

    // If is_class_teacher, also update the class record
    if (is_class_teacher) {
        await query('UPDATE classes SET class_teacher_id = $1 WHERE id = $2', [req.params.id, class_id]);
    }

    res.json({ success: true, message: 'Teacher assigned' });
}));

// DELETE /api/teachers/:id (soft delete)
router.delete('/:id', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
    const { rows } = await query('SELECT * FROM teachers WHERE id = $1', [req.params.id]);
    if (!rows[0]) throw new AppError('Teacher not found', 404);

    await query('UPDATE teachers SET status = $1, updated_at = NOW() WHERE id = $2', ['inactive', req.params.id]);
    if (rows[0].user_id) {
        await query('UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1', [rows[0].user_id]);
    }

    await logAudit({ instituteId: rows[0].institute_id, userId: req.user.id, action: 'deactivate', entityType: 'teacher', entityId: req.params.id, req });

    res.json({ success: true, message: 'Teacher deactivated' });
}));

export default router;
