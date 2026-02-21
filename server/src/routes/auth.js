import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/connection.js';
import { generateToken, authenticate } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password) {
        throw new AppError('Email and password are required', 400);
    }

    try {
        let result;

        if (role) {
            result = await query('SELECT * FROM users WHERE email = $1 AND role = $2', [email, role]);
        } else {
            result = await query('SELECT * FROM users WHERE email = $1', [email]);
        }

        const user = result.rows[0];

        if (!user) {
            throw new AppError('Invalid email or password', 401);
        }

        const isValidPassword = bcrypt.compareSync(password, user.password_hash);
        if (!isValidPassword) {
            throw new AppError('Invalid email or password', 401);
        }

        const token = generateToken(user);

        const { password_hash, ...userWithoutPassword } = user;

        res.json({
            success: true,
            data: {
                user: userWithoutPassword,
                token,
            },
        });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Login failed: ' + error.message, 500);
    }
}));

// GET /api/auth/me
router.get('/me', authenticate, asyncHandler(async (req, res) => {
    try {
        const { rows } = await query(
            'SELECT id, name, email, role, avatar, created_at FROM users WHERE id = $1',
            [req.user.id]
        );

        if (!rows[0]) {
            throw new AppError('User not found', 404);
        }

        res.json({
            success: true,
            data: { user: rows[0] },
        });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Failed to fetch user profile: ' + error.message, 500);
    }
}));

// POST /api/auth/logout (client-side token removal, but log it)
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully',
    });
});

export default router;
