import { Router } from 'express';
import { query, getClient } from '../db/connection.js';
import { authenticate, authorize, requireInstitute, logAudit } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import bcrypt from 'bcryptjs';

const router = Router();
router.use(authenticate, requireInstitute);

// GET /api/students — list with pagination, search, filter (tenant-scoped)
router.get('/', asyncHandler(async (req, res) => {
    const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
    const { search, class_id, status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let baseWhere = 'WHERE s.institute_id = $1';
    const params = [instId];

    if (search) {
        params.push(`%${search}%`);
        baseWhere += ` AND (s.name ILIKE $${params.length} OR s.email ILIKE $${params.length} OR s.roll_number ILIKE $${params.length})`;
    }
    if (class_id && class_id !== 'all') {
        params.push(class_id);
        baseWhere += ` AND s.class_id = $${params.length}`;
    }
    if (status && status !== 'all') {
        params.push(status);
        baseWhere += ` AND s.status = $${params.length}`;
    } else {
        baseWhere += ` AND s.status = 'active'`;
    }

    // For teachers, scope to their assigned classes
    if (req.user.role === 'class_teacher' || req.user.role === 'subject_teacher') {
        const teacherResult = await query('SELECT id FROM teachers WHERE user_id = $1', [req.user.id]);
        if (teacherResult.rows[0]) {
            const teacherId = teacherResult.rows[0].id;
            params.push(teacherId);
            baseWhere += ` AND s.class_id IN (SELECT class_id FROM teacher_assignments WHERE teacher_id = $${params.length})`;
        }
    }

    // For students, only see themselves
    if (req.user.role === 'student') {
        params.push(req.user.id);
        baseWhere += ` AND s.user_id = $${params.length}`;
    }

    // For parents, only see their children
    if (req.user.role === 'parent') {
        params.push(req.user.id);
        baseWhere += ` AND s.parent_id = $${params.length}`;
    }

    const countResult = await query(`SELECT COUNT(*) as total FROM students s ${baseWhere}`, params);
    const total = parseInt(countResult.rows[0].total);

    params.push(parseInt(limit));
    params.push(offset);

    const studentsResult = await query(
        `SELECT s.*, c.name as class_name, c.section as class_section, ay.name as academic_year_name
         FROM students s
         LEFT JOIN classes c ON s.class_id = c.id
         LEFT JOIN academic_years ay ON s.academic_year_id = ay.id
         ${baseWhere}
         ORDER BY c.name, c.section, s.roll_number ASC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
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
}));

// GET /api/students/:id — full profile with stats
router.get('/:id', asyncHandler(async (req, res) => {
    const { rows } = await query(
        `SELECT s.*, c.name as class_name, c.section as class_section, ay.name as academic_year_name
         FROM students s
         LEFT JOIN classes c ON s.class_id = c.id
         LEFT JOIN academic_years ay ON s.academic_year_id = ay.id
         WHERE s.id = $1`,
        [req.params.id]
    );

    if (!rows[0]) throw new AppError('Student not found', 404);
    if (req.user.role !== 'super_admin' && rows[0].institute_id !== req.instituteId) {
        throw new AppError('Access denied', 403);
    }

    // Get attendance summary
    const attendanceResult = await query(
        `SELECT 
            COUNT(*) FILTER (WHERE status = 'present') as present_count,
            COUNT(*) FILTER (WHERE status = 'absent') as absent_count,
            COUNT(*) FILTER (WHERE status = 'late') as late_count,
            COUNT(*) as total_days
         FROM attendance_records WHERE student_id = $1`,
        [req.params.id]
    );

    // Get recent exam results
    const examResults = await query(
        `SELECT er.*, e.name as exam_name, e.total_marks, e.exam_type, sub.name as subject_name
         FROM exam_results er
         JOIN exams e ON er.exam_id = e.id
         LEFT JOIN subjects sub ON e.subject_id = sub.id
         WHERE er.student_id = $1
         ORDER BY e.exam_date DESC LIMIT 10`,
        [req.params.id]
    );

    // Get remarks
    const remarks = await query(
        `SELECT tr.*, t.name as teacher_name, sub.name as subject_name
         FROM teacher_remarks tr
         JOIN teachers t ON tr.teacher_id = t.id
         LEFT JOIN subjects sub ON tr.subject_id = sub.id
         WHERE tr.student_id = $1
         ORDER BY tr.created_at DESC LIMIT 10`,
        [req.params.id]
    );

    const att = attendanceResult.rows[0];

    res.json({
        success: true,
        data: {
            student: {
                ...rows[0],
                attendance_summary: {
                    present: parseInt(att.present_count),
                    absent: parseInt(att.absent_count),
                    late: parseInt(att.late_count),
                    total: parseInt(att.total_days),
                    percentage: att.total_days > 0 ? Math.round((parseInt(att.present_count) / parseInt(att.total_days)) * 100) : 0,
                },
                recent_exam_results: examResults.rows,
                recent_remarks: remarks.rows,
            },
        },
    });
}));

// POST /api/students — create student (admin/teacher)
router.post('/', authorize('institute_admin', 'class_teacher', 'super_admin'), asyncHandler(async (req, res) => {
    const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
    const { name, email, roll_number, class_id, admission_date, date_of_birth, gender, address, phone,
            parent_name, parent_email, parent_phone, blood_group, create_login, password } = req.body;

    if (!name || !email || !roll_number) {
        throw new AppError('Name, email, and roll number are required', 400);
    }

    const { randomUUID } = await import('crypto');
    const client = await getClient();

    try {
        await client.query('BEGIN');

        // Get current academic year
        const ayResult = await client.query('SELECT id FROM academic_years WHERE institute_id = $1 AND is_current = true', [instId]);
        if (!ayResult.rows[0]) throw new AppError('No current academic year found', 404);
        const ayId = ayResult.rows[0].id;

        let userId = null;

        // Optionally create a user login for the student
        if (create_login) {
            userId = `u_${randomUUID().replace(/-/g, '').substring(0, 10)}`;
            const passwordHash = bcrypt.hashSync(password || 'Student@123', 12);
            await client.query(
                'INSERT INTO users (id, institute_id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6)',
                [userId, instId, name, email, passwordHash, 'student']
            );
        }

        // Create parent login if parent details provided and create_login enabled
        let parentUserId = null;
        if (create_login && parent_email) {
            const existingParent = await client.query(
                'SELECT id FROM users WHERE email = $1 AND institute_id = $2 AND role = $3',
                [parent_email, instId, 'parent']
            );
            if (existingParent.rows[0]) {
                parentUserId = existingParent.rows[0].id;
            } else {
                parentUserId = `u_${randomUUID().replace(/-/g, '').substring(0, 10)}`;
                const parentHash = bcrypt.hashSync(password || 'Parent@123', 12);
                await client.query(
                    'INSERT INTO users (id, institute_id, name, email, password_hash, role, phone) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [parentUserId, instId, parent_name || `Parent of ${name}`, parent_email, parentHash, 'parent', parent_phone || null]
                );
            }
        }

        const studentId = `s_${randomUUID().replace(/-/g, '').substring(0, 8)}`;
        await client.query(
            `INSERT INTO students (id, user_id, institute_id, academic_year_id, class_id, name, email, roll_number,
             admission_date, date_of_birth, gender, address, phone, parent_id, parent_name, parent_email, parent_phone, blood_group)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
            [studentId, userId, instId, ayId, class_id || null, name, email, roll_number,
             admission_date || null, date_of_birth || null, gender || null, address || null, phone || null,
             parentUserId, parent_name || null, parent_email || null, parent_phone || null, blood_group || null]
        );

        await client.query('COMMIT');

        await logAudit({ instituteId: instId, userId: req.user.id, action: 'create', entityType: 'student', entityId: studentId, newValues: { name, email, roll_number, class_id }, req });

        const result = await query(
            `SELECT s.*, c.name as class_name, c.section as class_section FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.id = $1`,
            [studentId]
        );
        res.status(201).json({ success: true, data: { student: result.rows[0] } });
    } catch (error) {
        await client.query('ROLLBACK');
        if (error instanceof AppError) throw error;
        if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
            throw new AppError('A student with this roll number already exists in this class', 409);
        }
        throw new AppError('Failed to create student: ' + error.message, 500);
    } finally {
        client.release();
    }
}));

// PUT /api/students/:id
router.put('/:id', authorize('institute_admin', 'class_teacher', 'super_admin'), asyncHandler(async (req, res) => {
    const existingResult = await query('SELECT * FROM students WHERE id = $1', [req.params.id]);
    if (!existingResult.rows[0]) throw new AppError('Student not found', 404);
    if (req.user.role !== 'super_admin' && existingResult.rows[0].institute_id !== req.instituteId) {
        throw new AppError('Access denied', 403);
    }

    const e = existingResult.rows[0];
    const { name, email, roll_number, class_id, admission_date, date_of_birth, gender, address, phone,
            parent_name, parent_email, parent_phone, blood_group, status } = req.body;

    await query(
        `UPDATE students SET name = $1, email = $2, roll_number = $3, class_id = $4, 
         admission_date = $5, date_of_birth = $6, gender = $7, address = $8, phone = $9,
         parent_name = $10, parent_email = $11, parent_phone = $12, blood_group = $13, 
         status = $14, updated_at = NOW() WHERE id = $15`,
        [
            name || e.name, email || e.email, roll_number || e.roll_number, class_id ?? e.class_id,
            admission_date ?? e.admission_date, date_of_birth ?? e.date_of_birth, gender ?? e.gender,
            address ?? e.address, phone ?? e.phone, parent_name ?? e.parent_name,
            parent_email ?? e.parent_email, parent_phone ?? e.parent_phone,
            blood_group ?? e.blood_group, status || e.status, req.params.id,
        ]
    );

    await logAudit({ instituteId: e.institute_id, userId: req.user.id, action: 'update', entityType: 'student', entityId: req.params.id, oldValues: e, newValues: req.body, req });

    const result = await query(
        `SELECT s.*, c.name as class_name, c.section as class_section FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.id = $1`,
        [req.params.id]
    );
    res.json({ success: true, data: { student: result.rows[0] } });
}));

// DELETE /api/students/:id (soft delete — deactivate)
router.delete('/:id', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
    const { rows } = await query('SELECT * FROM students WHERE id = $1', [req.params.id]);
    if (!rows[0]) throw new AppError('Student not found', 404);

    await query('UPDATE students SET status = $1, updated_at = NOW() WHERE id = $2', ['inactive', req.params.id]);
    // Also deactivate the user login
    if (rows[0].user_id) {
        await query('UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1', [rows[0].user_id]);
    }

    await logAudit({ instituteId: rows[0].institute_id, userId: req.user.id, action: 'deactivate', entityType: 'student', entityId: req.params.id, req });

    res.json({ success: true, message: 'Student deactivated' });
}));

export default router;
