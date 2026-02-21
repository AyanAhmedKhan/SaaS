import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/connection.js';
import { generateToken, authenticate } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
    let { email, password, role } = req.body;

    if (!email || !password) {
        throw new AppError('Email and password are required', 400);
    }

    email = email.trim().toLowerCase();
    if (role) role = role.trim().toLowerCase();

    try {
        let result;

        if (role) {
            result = await query('SELECT * FROM users WHERE LOWER(email) = $1 AND role = $2', [email, role]);
        } else {
            result = await query('SELECT * FROM users WHERE LOWER(email) = $1', [email]);
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

// POST /api/auth/register
router.post('/register', asyncHandler(async (req, res) => {
    let { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
        throw new AppError('Name, email, password, and role are required', 400);
    }

    email = email.trim().toLowerCase();
    role = role.trim().toLowerCase();

    const allowedRoles = ['admin', 'teacher', 'student', 'parent'];
    if (!allowedRoles.includes(role)) {
        throw new AppError('Invalid role specified', 400);
    }

    try {
        // 1. Check if user already exists
        const existingUser = await query('SELECT id FROM users WHERE LOWER(email) = $1', [email]);
        if (existingUser.rows.length > 0) {
            throw new AppError('Email is already registered', 409);
        }

        // 2. Hash password and generate UUID
        const passwordHash = bcrypt.hashSync(password, 10);
        const { randomUUID } = await import('crypto');
        const userId = `u_${randomUUID().replace(/-/g, '').substring(0, 10)}`; // Using short format for consistency with seed data

        // 3. Start a DB transaction to ensure both user and role-profile are created
        const { getClient } = await import('../db/connection.js');
        const client = await getClient();

        try {
            await client.query('BEGIN');

            // Insert into users
            await client.query(
                'INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)',
                [userId, name, email, passwordHash, role]
            );

            // Create stub profiles based on role to prevent Foreign Key/Dashboard errors
            if (role === 'student') {
                const studentId = `s_${randomUUID().replace(/-/g, '').substring(0, 8)}`;
                await client.query(
                    'INSERT INTO students (id, user_id, name, email, class, section, roll_number) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [studentId, userId, name, email, '10th', 'A', 'TBD']
                );
            } else if (role === 'teacher') {
                const teacherId = `t_${randomUUID().replace(/-/g, '').substring(0, 8)}`;
                await client.query(
                    'INSERT INTO teachers (id, user_id, name, email, subject, classes) VALUES ($1, $2, $3, $4, $5, $6)',
                    [teacherId, userId, name, email, 'General', '[]']
                );
            }

            await client.query('COMMIT');
        } catch (txnError) {
            await client.query('ROLLBACK');
            throw txnError;
        } finally {
            client.release();
        }

        // 4. Fetch the newly created user without password
        const newUserResult = await query('SELECT id, name, email, role, avatar, created_at FROM users WHERE id = $1', [userId]);
        const userWithoutPassword = newUserResult.rows[0];

        // 5. Generate Token and Login identical to standard Login behavior
        const token = generateToken(userWithoutPassword);

        res.status(201).json({
            success: true,
            data: {
                user: userWithoutPassword,
                token,
            },
        });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Registration failed: ' + error.message, 500);
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
