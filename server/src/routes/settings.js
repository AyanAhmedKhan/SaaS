import { Router } from 'express';
import { query } from '../db/connection.js';
import { authenticate, authorize, requireInstitute } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticate, requireInstitute);
router.use(authorize('institute_admin', 'super_admin')); // Only admins can access settings

// GET /api/settings/permissions
// Get the role permissions for the institute
router.get('/permissions', asyncHandler(async (req, res) => {
    const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;

    const { rows } = await query(
        `SELECT id, role, permissions FROM institute_role_permissions WHERE institute_id = $1`,
        [instId]
    );

    // If perfectly empty (e.g. no seed or newly created institute), return sensible defaults
    const permissionsMap = {};
    rows.forEach(row => {
        permissionsMap[row.role] = row.permissions;
    });

    if (!permissionsMap['class_teacher']) {
        permissionsMap['class_teacher'] = { manage_students: true, manage_attendance: true, manage_remarks: true, manage_exams: false };
    }
    if (!permissionsMap['subject_teacher']) {
        permissionsMap['subject_teacher'] = { manage_students: false, manage_attendance: false, manage_remarks: false, manage_exams: false };
    }

    res.json({ success: true, data: { permissions: permissionsMap } });
}));

// PUT /api/settings/permissions
// Update permissions for a specific role
router.put('/permissions', asyncHandler(async (req, res) => {
    const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
    const { role, permissions } = req.body;

    if (!role || !['class_teacher', 'subject_teacher'].includes(role)) {
        throw new AppError('Invalid role specified', 400);
    }
    if (!permissions || typeof permissions !== 'object') {
        throw new AppError('Permissions must be a JSON object', 400);
    }

    const { randomUUID } = await import('crypto');

    // Upsert the permissions
    await query(
        `INSERT INTO institute_role_permissions (id, institute_id, role, permissions)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (institute_id, role) 
         DO UPDATE SET permissions = $4, updated_at = NOW()`,
        [`irp_${randomUUID().replace(/-/g, '').substring(0, 10)}`, instId, role, JSON.stringify(permissions)]
    );

    res.json({ success: true, message: 'Permissions updated successfully' });
}));

export default router;
