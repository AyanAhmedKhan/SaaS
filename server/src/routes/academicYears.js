import { Router } from 'express';
import { query, getClient } from '../db/connection.js';
import { authenticate, authorize, requireInstitute, logAudit } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = Router();

// All routes require authentication + institute context
router.use(authenticate, requireInstitute);

// ── GET /api/academic-years ──
router.get('/', asyncHandler(async (req, res) => {
    const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
    if (!instId) throw new AppError('Institute ID required', 400);

    const { rows } = await query(
        'SELECT * FROM academic_years WHERE institute_id = $1 ORDER BY start_date DESC',
        [instId]
    );
    res.json({ success: true, data: { academicYears: rows } });
}));

// ── GET /api/academic-years/current ──
router.get('/current', asyncHandler(async (req, res) => {
    const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
    if (!instId) throw new AppError('Institute ID required', 400);

    const { rows } = await query(
        'SELECT * FROM academic_years WHERE institute_id = $1 AND is_current = true',
        [instId]
    );
    if (!rows[0]) throw new AppError('No current academic year configured', 404);
    res.json({ success: true, data: { academicYear: rows[0] } });
}));

// ── POST /api/academic-years ──
router.post('/', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
    const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
    const { name, start_date, end_date, is_current } = req.body;

    if (!name || !start_date || !end_date) throw new AppError('Name, start_date, and end_date are required', 400);

    const { randomUUID } = await import('crypto');
    const id = `ay_${randomUUID().replace(/-/g, '').substring(0, 10)}`;

    const client = await getClient();
    try {
        await client.query('BEGIN');

        // If setting as current, unset others
        if (is_current) {
            await client.query('UPDATE academic_years SET is_current = false WHERE institute_id = $1', [instId]);
        }

        await client.query(
            `INSERT INTO academic_years (id, institute_id, name, start_date, end_date, is_current) VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, instId, name, start_date, end_date, is_current || false]
        );

        await client.query('COMMIT');

        await logAudit({ instituteId: instId, userId: req.user.id, action: 'create', entityType: 'academic_year', entityId: id, newValues: req.body, req });

        const { rows } = await query('SELECT * FROM academic_years WHERE id = $1', [id]);
        res.status(201).json({ success: true, data: { academicYear: rows[0] } });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

// ── PUT /api/academic-years/:id ──
router.put('/:id', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, start_date, end_date, is_current, is_archived } = req.body;

    const existing = await query('SELECT * FROM academic_years WHERE id = $1', [id]);
    if (!existing.rows[0]) throw new AppError('Academic year not found', 404);

    if (req.user.role !== 'super_admin' && existing.rows[0].institute_id !== req.instituteId) {
        throw new AppError('Access denied', 403);
    }

    const client = await getClient();
    try {
        await client.query('BEGIN');

        if (is_current) {
            await client.query('UPDATE academic_years SET is_current = false WHERE institute_id = $1', [existing.rows[0].institute_id]);
        }

        await client.query(
            `UPDATE academic_years SET name = COALESCE($1, name), start_date = COALESCE($2, start_date), 
             end_date = COALESCE($3, end_date), is_current = COALESCE($4, is_current), 
             is_archived = COALESCE($5, is_archived), updated_at = NOW() WHERE id = $6`,
            [name, start_date, end_date, is_current, is_archived, id]
        );

        await client.query('COMMIT');

        await logAudit({ instituteId: existing.rows[0].institute_id, userId: req.user.id, action: 'update', entityType: 'academic_year', entityId: id, req });

        const { rows } = await query('SELECT * FROM academic_years WHERE id = $1', [id]);
        res.json({ success: true, data: { academicYear: rows[0] } });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

// ── POST /api/academic-years/:id/archive ──
router.post('/:id/archive', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existing = await query('SELECT * FROM academic_years WHERE id = $1', [id]);
    if (!existing.rows[0]) throw new AppError('Academic year not found', 404);

    await query('UPDATE academic_years SET is_archived = true, is_current = false, updated_at = NOW() WHERE id = $1', [id]);
    await logAudit({ instituteId: existing.rows[0].institute_id, userId: req.user.id, action: 'archive', entityType: 'academic_year', entityId: id, req });

    res.json({ success: true, message: 'Academic year archived' });
}));

// ── POST /api/academic-years/:id/promote – Bulk promote students ──
router.post('/:id/promote', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
    const { id: fromAyId } = req.params;
    const { to_academic_year_id, promotions } = req.body;
    // promotions: [{ student_id, to_class_id, promotion_type }]

    if (!to_academic_year_id || !promotions || !promotions.length) {
        throw new AppError('Target academic year and promotions list required', 400);
    }

    const client = await getClient();
    const { randomUUID } = await import('crypto');

    try {
        await client.query('BEGIN');

        for (const p of promotions) {
            // Get current student
            const studentResult = await client.query('SELECT * FROM students WHERE id = $1', [p.student_id]);
            const student = studentResult.rows[0];
            if (!student) continue;

            // Create promotion record
            await client.query(
                `INSERT INTO student_promotions (id, institute_id, student_id, from_class_id, to_class_id, from_academic_year_id, to_academic_year_id, promotion_type, promoted_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    `promo_${randomUUID().replace(/-/g, '').substring(0, 10)}`,
                    student.institute_id, p.student_id, student.class_id,
                    p.to_class_id || null, fromAyId, to_academic_year_id,
                    p.promotion_type || 'promoted', req.user.id,
                ]
            );

            // Update student's class and academic year
            if (p.promotion_type === 'graduated') {
                await client.query('UPDATE students SET status = $1, updated_at = NOW() WHERE id = $2', ['graduated', p.student_id]);
            } else if (p.to_class_id) {
                await client.query(
                    'UPDATE students SET class_id = $1, academic_year_id = $2, updated_at = NOW() WHERE id = $3',
                    [p.to_class_id, to_academic_year_id, p.student_id]
                );
            }
        }

        await client.query('COMMIT');

        await logAudit({ instituteId: req.instituteId, userId: req.user.id, action: 'bulk_promote', entityType: 'student', newValues: { count: promotions.length, toYear: to_academic_year_id }, req });

        res.json({ success: true, message: `${promotions.length} students processed` });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

export default router;
