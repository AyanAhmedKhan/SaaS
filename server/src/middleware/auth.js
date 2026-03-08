import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';
import { query } from '../db/connection.js';

export const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('[AUTH] FATAL: JWT_SECRET environment variable is not set!');
    process.exit(1);
}
export const JWT_EXPIRES_IN = '24h';
const JWT_REFRESH_EXPIRES_IN = '7d';

// Generate JWT token with institute context
export function generateToken(user) {
    try {
        return jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                institute_id: user.institute_id || null,
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
    } catch (error) {
        throw new AppError('Failed to generate authentication token', 500);
    }
}

// Generate refresh token
export function generateRefreshToken(user) {
    try {
        return jwt.sign(
            { id: user.id, type: 'refresh' },
            JWT_SECRET,
            { expiresIn: JWT_REFRESH_EXPIRES_IN }
        );
    } catch (error) {
        throw new AppError('Failed to generate refresh token', 500);
    }
}

// Verify JWT token middleware — attaches user + institute context
export function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('Authentication required. Please provide a valid token.', 401);
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        req.user = decoded;
        // Attach institute_id for easy tenant scoping in all routes
        req.instituteId = decoded.institute_id || null;
        next();
    } catch (error) {
        if (error instanceof AppError) {
            return next(error);
        }
        if (error.name === 'TokenExpiredError') {
            return next(new AppError('Token has expired. Please login again.', 401));
        }
        if (error.name === 'JsonWebTokenError') {
            return next(new AppError('Invalid authentication token.', 401));
        }
        next(new AppError('Authentication failed.', 401));
    }
}

// Optional JWT auth middleware — does not fail when token is missing/invalid
export function authenticateOptional(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        req.user = decoded;
        req.instituteId = decoded.institute_id || null;
        next();
    } catch (error) {
        // Ignore invalid/expired token in optional mode and continue as guest
        next();
    }
}

// Role-based access control middleware
export function authorize(...allowedRoles) {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw new AppError('Authentication required.', 401);
            }

            if (!allowedRoles.includes(req.user.role)) {
                throw new AppError(
                    `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}`,
                    403
                );
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

// Ensure user belongs to the institute they're accessing
export function requireInstitute(req, res, next) {
    try {
        if (!req.user) {
            throw new AppError('Authentication required.', 401);
        }
        // Super admins bypass institute check
        if (req.user.role === 'super_admin') {
            return next();
        }
        if (!req.instituteId) {
            throw new AppError('Institute context required.', 403);
        }
        next();
    } catch (error) {
        next(error);
    }
}

export async function logAudit({ instituteId, userId, action, entityType, entityId, oldValues, newValues, req }) {
    try {
        const { randomUUID } = await import('crypto');
        await query(
            `INSERT INTO audit_logs (id, institute_id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
                `audit_${randomUUID().replace(/-/g, '').substring(0, 12)}`,
                instituteId || null,
                userId || null,
                action,
                entityType,
                entityId || null,
                oldValues ? JSON.stringify(oldValues) : null,
                newValues ? JSON.stringify(newValues) : null,
                req?.ip || req?.headers?.['x-forwarded-for'] || null,
                req?.headers?.['user-agent'] || null,
            ]
        );
    } catch (error) {
        console.error('[AUDIT] Failed to log audit:', error.message);
        // Don't throw — audit failure shouldn't break the main operation
    }
}

// Check if faculty has specific permission based on their assignment role (class_teacher or subject_teacher)
export async function checkFacultyPermission(req, classId, permissionKey) {
    if (['super_admin', 'institute_admin'].includes(req.user.role)) return true;
    if (req.user.role !== 'faculty') return false;

    // Check if they are class teacher or subject teacher for this class
    const { rows: assignmentRows } = await query(
        `SELECT is_class_teacher FROM teacher_assignments ta
         JOIN teachers t ON ta.teacher_id = t.id
         WHERE t.user_id = $1 AND ta.class_id = $2`,
        [req.user.id, classId]
    );

    if (assignmentRows.length === 0) return false; // Not assigned to this class at all

    // If they have multiple assignments in this class (e.g. they teach two subjects),
    // they are a 'class_teacher' if ANY assignment is is_class_teacher = true
    const isClassTeacher = assignmentRows.some(row => row.is_class_teacher);
    const assignedRole = isClassTeacher ? 'class_teacher' : 'subject_teacher';

    // Now check the institute permissions for this role
    const { rows: permRows } = await query(
        `SELECT permissions FROM institute_role_permissions 
         WHERE institute_id = $1 AND role = $2`,
        [req.instituteId, assignedRole]
    );

    // If no permission object exists yet in DB, fall back to safe defaults
    let permissions = {};
    if (permRows.length > 0) {
        permissions = permRows[0].permissions;
    } else {
        if (assignedRole === 'class_teacher') {
            permissions = { manage_students: true, manage_attendance: true, manage_remarks: true, manage_exams: false };
        } else {
            permissions = { manage_students: false, manage_attendance: false, manage_remarks: false, manage_exams: false };
        }
    }

    return permissions[permissionKey] === true;
}
