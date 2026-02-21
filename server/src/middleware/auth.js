import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';

const JWT_SECRET = process.env.JWT_SECRET || 'eduyantra-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

export { JWT_SECRET, JWT_EXPIRES_IN };

// Generate JWT token
export function generateToken(user) {
    try {
        return jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
    } catch (error) {
        throw new AppError('Failed to generate authentication token', 500);
    }
}

// Verify JWT token middleware
export function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('Authentication required. Please provide a valid token.', 401);
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        req.user = decoded;
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
