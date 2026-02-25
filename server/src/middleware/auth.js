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

// Audit logging helper
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
