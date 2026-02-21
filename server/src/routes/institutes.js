import { Router } from 'express';
import { query, getClient } from '../db/connection.js';
import { authenticate, authorize, logAudit } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = Router();

// ── GET /api/institutes – List all institutes (super_admin only) ──
router.get('/', authenticate, authorize('super_admin'), asyncHandler(async (req, res) => {
    const { search, status, page = '1', limit = '20' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let sql = 'SELECT * FROM institutes WHERE 1=1';
    const params = [];

    if (search) {
        params.push(`%${search}%`);
        sql += ` AND (name ILIKE $${params.length} OR code ILIKE $${params.length})`;
    }
    if (status) {
        params.push(status);
        sql += ` AND status = $${params.length}`;
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*)');
    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const [dataResult, countResult] = await Promise.all([
        query(sql, params),
        query(countSql, params.slice(0, -2)),
    ]);

    res.json({
        success: true,
        data: {
            institutes: dataResult.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countResult.rows[0].count),
                totalPages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit)),
            },
        },
    });
}));

// ── GET /api/institutes/:id ──
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
    const { rows } = await query('SELECT * FROM institutes WHERE id = $1', [req.params.id]);
    if (!rows[0]) throw new AppError('Institute not found', 404);

    // Non-super-admins can only view their own institute
    if (req.user.role !== 'super_admin' && req.user.institute_id !== rows[0].id) {
        throw new AppError('Access denied', 403);
    }

    // Count stats
    const [studentsCount, teachersCount, classesCount] = await Promise.all([
        query('SELECT COUNT(*) FROM students WHERE institute_id = $1 AND status = $2', [rows[0].id, 'active']),
        query('SELECT COUNT(*) FROM teachers WHERE institute_id = $1 AND status = $2', [rows[0].id, 'active']),
        query(`SELECT COUNT(*) FROM classes c JOIN academic_years ay ON c.academic_year_id = ay.id WHERE c.institute_id = $1 AND ay.is_current = true`, [rows[0].id]),
    ]);

    res.json({
        success: true,
        data: {
            institute: {
                ...rows[0],
                stats: {
                    totalStudents: parseInt(studentsCount.rows[0].count),
                    totalTeachers: parseInt(teachersCount.rows[0].count),
                    totalClasses: parseInt(classesCount.rows[0].count),
                },
            },
        },
    });
}));

// ── POST /api/institutes – Create institute (super_admin) ──
router.post('/', authenticate, authorize('super_admin'), asyncHandler(async (req, res) => {
    const { name, code, address, city, state, phone, email, website, max_students, subscription_plan } = req.body;
    if (!name || !code) throw new AppError('Name and code are required', 400);

    const { randomUUID } = await import('crypto');
    const id = `inst_${randomUUID().replace(/-/g, '').substring(0, 10)}`;

    const existing = await query('SELECT id FROM institutes WHERE code = $1', [code.toUpperCase()]);
    if (existing.rows.length > 0) throw new AppError('Institute code already exists', 409);

    const client = await getClient();
    try {
        await client.query('BEGIN');

        await client.query(
            `INSERT INTO institutes (id, name, code, address, city, state, phone, email, website, max_students, subscription_plan)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [id, name, code.toUpperCase(), address, city, state, phone, email, website, max_students || 500, subscription_plan || 'basic']
        );

        // Create default academic year
        const ayId = `ay_${randomUUID().replace(/-/g, '').substring(0, 10)}`;
        const currentYear = new Date().getFullYear();
        await client.query(
            `INSERT INTO academic_years (id, institute_id, name, start_date, end_date, is_current) VALUES ($1, $2, $3, $4, $5, true)`,
            [ayId, id, `${currentYear}-${currentYear + 1}`, `${currentYear}-04-01`, `${currentYear + 1}-03-31`]
        );

        await client.query('COMMIT');

        await logAudit({ instituteId: id, userId: req.user.id, action: 'create', entityType: 'institute', entityId: id, newValues: { name, code }, req });

        const result = await query('SELECT * FROM institutes WHERE id = $1', [id]);
        res.status(201).json({ success: true, data: { institute: result.rows[0] } });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

// ── PUT /api/institutes/:id – Update institute ──
router.put('/:id', authenticate, authorize('super_admin', 'institute_admin'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (req.user.role !== 'super_admin' && req.user.institute_id !== id) {
        throw new AppError('Access denied', 403);
    }

    const { name, address, city, state, phone, email, website, logo_url, modules_enabled, ai_insight_enabled, max_students, status } = req.body;

    const oldResult = await query('SELECT * FROM institutes WHERE id = $1', [id]);
    if (!oldResult.rows[0]) throw new AppError('Institute not found', 404);

    const fields = [];
    const values = [];
    let paramIdx = 1;

    const addField = (col, val) => {
        if (val !== undefined) {
            fields.push(`${col} = $${paramIdx++}`);
            values.push(col === 'modules_enabled' ? JSON.stringify(val) : val);
        }
    };

    addField('name', name);
    addField('address', address);
    addField('city', city);
    addField('state', state);
    addField('phone', phone);
    addField('email', email);
    addField('website', website);
    addField('logo_url', logo_url);
    addField('modules_enabled', modules_enabled);
    addField('ai_insight_enabled', ai_insight_enabled);
    addField('max_students', max_students);
    if (req.user.role === 'super_admin') addField('status', status);

    if (fields.length === 0) throw new AppError('No fields to update', 400);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    await query(`UPDATE institutes SET ${fields.join(', ')} WHERE id = $${paramIdx}`, values);

    await logAudit({ instituteId: id, userId: req.user.id, action: 'update', entityType: 'institute', entityId: id, oldValues: oldResult.rows[0], newValues: req.body, req });

    const result = await query('SELECT * FROM institutes WHERE id = $1', [id]);
    res.json({ success: true, data: { institute: result.rows[0] } });
}));

// ── DELETE /api/institutes/:id (super_admin only) ──
router.delete('/:id', authenticate, authorize('super_admin'), asyncHandler(async (req, res) => {
    const { rows } = await query('SELECT id FROM institutes WHERE id = $1', [req.params.id]);
    if (!rows[0]) throw new AppError('Institute not found', 404);

    await query('UPDATE institutes SET status = $1, updated_at = NOW() WHERE id = $2', ['archived', req.params.id]);
    await logAudit({ instituteId: req.params.id, userId: req.user.id, action: 'archive', entityType: 'institute', entityId: req.params.id, req });

    res.json({ success: true, message: 'Institute archived' });
}));

export default router;
