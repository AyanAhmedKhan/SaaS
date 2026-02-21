import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, getClient } from '../db/connection.js';
import { generateToken, generateRefreshToken, authenticate, logAudit } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { sendPasswordResetEmail, sendWelcomeEmail, logEmailNotification } from '../services/email.js';
import { sendPasswordResetWhatsApp, logWhatsAppNotification } from '../services/whatsapp.js';

const router = Router();

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
    let { email, password, role, institute_code } = req.body;

    if (!email || !password) {
        throw new AppError('Email and password are required', 400);
    }

    email = email.trim().toLowerCase();
    if (role) role = role.trim().toLowerCase();

    try {
        let result;
        const params = [email];
        let sql = 'SELECT u.*, i.name as institute_name, i.code as institute_code, i.logo_url as institute_logo FROM users u LEFT JOIN institutes i ON u.institute_id = i.id WHERE LOWER(u.email) = $1';

        if (role) {
            sql += ' AND u.role = $2';
            params.push(role);
        }
        if (institute_code) {
            sql += ` AND i.code = $${params.length + 1}`;
            params.push(institute_code.trim().toUpperCase());
        }

        sql += ' AND u.is_active = true';

        result = await query(sql, params);
        const user = result.rows[0];

        if (!user) {
            throw new AppError('Invalid email or password', 401);
        }

        const isValidPassword = bcrypt.compareSync(password, user.password_hash);
        if (!isValidPassword) {
            throw new AppError('Invalid email or password', 401);
        }

        // Update last login
        await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

        const token = generateToken(user);
        const refreshToken = generateRefreshToken(user);

        const { password_hash, ...userWithoutPassword } = user;

        await logAudit({
            instituteId: user.institute_id,
            userId: user.id,
            action: 'login',
            entityType: 'user',
            entityId: user.id,
            req,
        });

        res.json({
            success: true,
            data: {
                user: userWithoutPassword,
                token,
                refreshToken,
            },
        });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Login failed: ' + error.message, 500);
    }
}));

// POST /api/auth/register (for super_admin to create institutes, or institute_admin to create users)
router.post('/register', asyncHandler(async (req, res) => {
    let { name, email, password, role, institute_code, institute_name } = req.body;

    if (!name || !email || !password || !role) {
        throw new AppError('Name, email, password, and role are required', 400);
    }

    email = email.trim().toLowerCase();
    role = role.trim().toLowerCase();

    const allowedRoles = ['super_admin', 'institute_admin', 'class_teacher', 'subject_teacher', 'student', 'parent'];
    if (!allowedRoles.includes(role)) {
        throw new AppError('Invalid role specified', 400);
    }

    const client = await getClient();
    try {
        await client.query('BEGIN');

        const { randomUUID } = await import('crypto');
        let instituteId = null;

        // If registering as institute_admin with a new institute
        if (role === 'institute_admin' && institute_name) {
            const instCode = institute_code?.trim().toUpperCase() || `INST${randomUUID().replace(/-/g, '').substring(0, 6).toUpperCase()}`;
            
            // Check if code exists
            const existingInst = await client.query('SELECT id FROM institutes WHERE code = $1', [instCode]);
            if (existingInst.rows.length > 0) {
                throw new AppError('Institute code already exists', 409);
            }

            instituteId = `inst_${randomUUID().replace(/-/g, '').substring(0, 10)}`;
            await client.query(
                `INSERT INTO institutes (id, name, code, email) VALUES ($1, $2, $3, $4)`,
                [instituteId, institute_name.trim(), instCode, email]
            );

            // Create default academic year
            const ayId = `ay_${randomUUID().replace(/-/g, '').substring(0, 10)}`;
            const currentYear = new Date().getFullYear();
            await client.query(
                `INSERT INTO academic_years (id, institute_id, name, start_date, end_date, is_current) VALUES ($1, $2, $3, $4, $5, true)`,
                [ayId, instituteId, `${currentYear}-${currentYear + 1}`, `${currentYear}-04-01`, `${currentYear + 1}-03-31`]
            );
        } else if (institute_code) {
            // Joining existing institute
            const instResult = await client.query('SELECT id FROM institutes WHERE code = $1 AND status = $2', [institute_code.trim().toUpperCase(), 'active']);
            if (instResult.rows.length === 0) {
                throw new AppError('Institute not found or inactive', 404);
            }
            instituteId = instResult.rows[0].id;
        }

        // Check if user already exists in this institute
        const existingUser = await client.query(
            'SELECT id FROM users WHERE LOWER(email) = $1 AND (institute_id = $2 OR ($2 IS NULL AND institute_id IS NULL))',
            [email, instituteId]
        );
        if (existingUser.rows.length > 0) {
            throw new AppError('Email is already registered in this institute', 409);
        }

        const passwordHash = bcrypt.hashSync(password, 12);
        const userId = `u_${randomUUID().replace(/-/g, '').substring(0, 10)}`;

        await client.query(
            'INSERT INTO users (id, institute_id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6)',
            [userId, instituteId, name, email, passwordHash, role]
        );

        // Create profile based on role
        if (role === 'student' && instituteId) {
            const ayResult = await client.query('SELECT id FROM academic_years WHERE institute_id = $1 AND is_current = true', [instituteId]);
            const ayId = ayResult.rows[0]?.id;
            if (ayId) {
                const studentId = `s_${randomUUID().replace(/-/g, '').substring(0, 8)}`;
                await client.query(
                    'INSERT INTO students (id, user_id, institute_id, academic_year_id, name, email, roll_number) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [studentId, userId, instituteId, ayId, name, email, 'TBD']
                );
            }
        } else if ((role === 'class_teacher' || role === 'subject_teacher') && instituteId) {
            const teacherId = `t_${randomUUID().replace(/-/g, '').substring(0, 8)}`;
            await client.query(
                'INSERT INTO teachers (id, user_id, institute_id, name, email) VALUES ($1, $2, $3, $4, $5)',
                [teacherId, userId, instituteId, name, email]
            );
        }

        await client.query('COMMIT');

        const newUserResult = await query(
            `SELECT u.*, i.name as institute_name, i.code as institute_code, i.logo_url as institute_logo 
             FROM users u LEFT JOIN institutes i ON u.institute_id = i.id WHERE u.id = $1`,
            [userId]
        );
        const userRow = newUserResult.rows[0];
        const { password_hash, ...userWithoutPassword } = userRow;

        const token = generateToken(userRow);
        const refreshToken = generateRefreshToken(userRow);

        await logAudit({
            instituteId,
            userId,
            action: 'register',
            entityType: 'user',
            entityId: userId,
            newValues: { name, email, role },
            req,
        });

        res.status(201).json({
            success: true,
            data: { user: userWithoutPassword, token, refreshToken },
        });

        // Fire-and-forget welcome email
        sendWelcomeEmail({ to: email, name, role }).catch(err =>
            console.error('[AUTH] Welcome email failed:', err.message)
        );
    } catch (error) {
        await client.query('ROLLBACK');
        if (error instanceof AppError) throw error;
        throw new AppError('Registration failed: ' + error.message, 500);
    } finally {
        client.release();
    }
}));

// GET /api/auth/me
router.get('/me', authenticate, asyncHandler(async (req, res) => {
    try {
        const { rows } = await query(
            `SELECT u.id, u.name, u.email, u.role, u.avatar, u.phone, u.institute_id, u.is_active, u.last_login, u.created_at,
                    i.name as institute_name, i.code as institute_code, i.logo_url as institute_logo,
                    i.modules_enabled, i.ai_insight_enabled
             FROM users u
             LEFT JOIN institutes i ON u.institute_id = i.id
             WHERE u.id = $1`,
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

// POST /api/auth/refresh
router.post('/refresh', asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        throw new AppError('Refresh token required', 400);
    }

    try {
        const jwt = (await import('jsonwebtoken')).default;
        const JWT_SECRET = process.env.JWT_SECRET || 'eduyantra-secret-key-change-in-production';
        const decoded = jwt.verify(refreshToken, JWT_SECRET);

        if (decoded.type !== 'refresh') {
            throw new AppError('Invalid token type', 401);
        }

        const { rows } = await query('SELECT * FROM users WHERE id = $1 AND is_active = true', [decoded.id]);
        if (!rows[0]) {
            throw new AppError('User not found or inactive', 401);
        }

        const token = generateToken(rows[0]);
        const newRefreshToken = generateRefreshToken(rows[0]);

        res.json({
            success: true,
            data: { token, refreshToken: newRefreshToken },
        });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Token refresh failed', 401);
    }
}));

// POST /api/auth/change-password
router.post('/change-password', authenticate, asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        throw new AppError('Current password and new password are required', 400);
    }
    if (newPassword.length < 8) {
        throw new AppError('New password must be at least 8 characters', 400);
    }

    const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!rows[0]) throw new AppError('User not found', 404);

    if (!bcrypt.compareSync(currentPassword, rows[0].password_hash)) {
        throw new AppError('Current password is incorrect', 401);
    }

    const newHash = bcrypt.hashSync(newPassword, 12);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, req.user.id]);

    await logAudit({
        instituteId: req.instituteId,
        userId: req.user.id,
        action: 'change_password',
        entityType: 'user',
        entityId: req.user.id,
        req,
    });

    res.json({ success: true, message: 'Password changed successfully' });
}));

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
});

// ═══════════════════════════════════════════════════
// FORGOT PASSWORD & RESET PASSWORD
// ═══════════════════════════════════════════════════

// POST /api/auth/forgot-password
router.post('/forgot-password', asyncHandler(async (req, res) => {
    let { email, institute_code } = req.body;

    if (!email) {
        throw new AppError('Email is required', 400);
    }

    email = email.trim().toLowerCase();

    // Find user
    let sql = `SELECT u.id, u.name, u.email, u.phone, u.whatsapp_notifications, u.institute_id
               FROM users u LEFT JOIN institutes i ON u.institute_id = i.id
               WHERE LOWER(u.email) = $1 AND u.is_active = true`;
    const params = [email];

    if (institute_code) {
        sql += ` AND i.code = $2`;
        params.push(institute_code.trim().toUpperCase());
    }

    const { rows } = await query(sql, params);
    const user = rows[0];

    // Always return success to prevent email enumeration
    if (!user) {
        return res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
    }

    // Invalidate previous tokens
    await query('UPDATE password_resets SET used = true WHERE user_id = $1 AND used = false', [user.id]);

    // Generate token
    const { randomUUID, randomBytes } = await import('crypto');
    const resetToken = randomBytes(32).toString('hex');
    const id = `pr_${randomUUID().replace(/-/g, '').substring(0, 12)}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
        'INSERT INTO password_resets (id, user_id, token, expires_at) VALUES ($1, $2, $3, $4)',
        [id, user.id, resetToken, expiresAt.toISOString()]
    );

    // Send reset link via email
    try {
        await sendPasswordResetEmail({ to: user.email, name: user.name, resetToken });
        await logEmailNotification({ userId: user.id, instituteId: user.institute_id, subject: 'Password Reset', body: 'Reset link sent', status: 'sent' });
    } catch (err) {
        console.error('[AUTH] Password reset email failed:', err.message);
        await logEmailNotification({ userId: user.id, instituteId: user.institute_id, subject: 'Password Reset', body: 'Reset link', status: 'failed', error: err.message });
    }

    // Also send via WhatsApp if enabled + phone available
    if (user.whatsapp_notifications && user.phone) {
        try {
            await sendPasswordResetWhatsApp({ to: user.phone, name: user.name, resetToken });
            await logWhatsAppNotification({ userId: user.id, instituteId: user.institute_id, body: 'Password reset link sent via WhatsApp', status: 'sent' });
        } catch (err) {
            console.error('[AUTH] Password reset WhatsApp failed:', err.message);
        }
    }

    res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
}));

// POST /api/auth/reset-password
router.post('/reset-password', asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        throw new AppError('Token and new password are required', 400);
    }
    if (newPassword.length < 8) {
        throw new AppError('Password must be at least 8 characters', 400);
    }

    // Find valid token
    const { rows } = await query(
        `SELECT pr.*, u.email FROM password_resets pr
         JOIN users u ON pr.user_id = u.id
         WHERE pr.token = $1 AND pr.used = false AND pr.expires_at > NOW()`,
        [token]
    );

    if (rows.length === 0) {
        throw new AppError('Invalid or expired reset token', 400);
    }

    const resetRecord = rows[0];
    const newHash = bcrypt.hashSync(newPassword, 12);

    // Update password
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, resetRecord.user_id]);

    // Mark token as used
    await query('UPDATE password_resets SET used = true WHERE id = $1', [resetRecord.id]);

    await logAudit({
        userId: resetRecord.user_id,
        action: 'reset_password',
        entityType: 'user',
        entityId: resetRecord.user_id,
    });

    res.json({ success: true, message: 'Password has been reset successfully. You can now log in.' });
}));

// ═══════════════════════════════════════════════════
// NOTIFICATION PREFERENCES
// ═══════════════════════════════════════════════════

// GET /api/auth/notification-preferences
router.get('/notification-preferences', authenticate, asyncHandler(async (req, res) => {
    const { rows } = await query(
        'SELECT email_notifications, whatsapp_notifications, phone FROM users WHERE id = $1',
        [req.user.id]
    );
    if (!rows[0]) throw new AppError('User not found', 404);

    res.json({
        success: true,
        data: {
            email_notifications: rows[0].email_notifications,
            whatsapp_notifications: rows[0].whatsapp_notifications,
            phone: rows[0].phone,
        },
    });
}));

// PUT /api/auth/notification-preferences
router.put('/notification-preferences', authenticate, asyncHandler(async (req, res) => {
    const { email_notifications, whatsapp_notifications, phone } = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    if (typeof email_notifications === 'boolean') {
        updates.push(`email_notifications = $${idx++}`);
        values.push(email_notifications);
    }
    if (typeof whatsapp_notifications === 'boolean') {
        updates.push(`whatsapp_notifications = $${idx++}`);
        values.push(whatsapp_notifications);
    }
    if (phone !== undefined) {
        updates.push(`phone = $${idx++}`);
        values.push(phone);
    }

    if (updates.length === 0) {
        throw new AppError('No preferences to update', 400);
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.user.id);

    await query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`,
        values
    );

    res.json({ success: true, message: 'Notification preferences updated' });
}));

export default router;
