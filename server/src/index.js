import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { query, closePool } from './db/connection.js';
import { createSchema } from './db/schema.js';
import { requestIdMiddleware, requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import teacherRoutes from './routes/teachers.js';
import attendanceRoutes from './routes/attendance.js';
import noticeRoutes from './routes/notices.js';
import dashboardRoutes from './routes/dashboard.js';
import timetableRoutes from './routes/timetable.js';
import syllabusRoutes from './routes/syllabus.js';
import reportRoutes from './routes/reports.js';
import instituteRoutes from './routes/institutes.js';
import academicYearRoutes from './routes/academicYears.js';
import classRoutes from './routes/classes.js';
import subjectRoutes from './routes/subjects.js';
import assignmentRoutes from './routes/assignments.js';
import examRoutes from './routes/exams.js';
import feeRoutes from './routes/fees.js';
import remarkRoutes from './routes/remarks.js';
import notificationRoutes from './routes/notifications.js';
import gradingRoutes from './routes/grading.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security & parsing middleware ──
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting (scalable for 10K users) ──
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per 15 min per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: { message: 'Too many requests, please try again later.', code: 'RATE_LIMITED' },
    },
});
app.use('/api/', limiter);

// Stricter rate limit for auth
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: {
        success: false,
        error: { message: 'Too many login attempts, please try again later.', code: 'RATE_LIMITED' },
    },
});
app.use('/api/auth/login', authLimiter);

// ── Request tracking & logging ──
app.use(requestIdMiddleware);
app.use(requestLogger);

// ── Health check ──
app.get('/api/health', async (req, res) => {
    try {
        await query('SELECT 1');
        res.json({
            success: true,
            data: {
                status: 'healthy',
                database: 'PostgreSQL (Neon)',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
            },
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            error: { message: 'Database unavailable', code: 'SERVICE_UNAVAILABLE' },
        });
    }
});

// ── API Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/syllabus', syllabusRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/institutes', instituteRoutes);
app.use('/api/academic-years', academicYearRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/remarks', remarkRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/grading', gradingRoutes);

// ── 404 & Error handlers ──
app.use(notFoundHandler);
app.use(errorHandler);

// ── Initialize database & start server ──
async function startServer() {
    try {
        await createSchema();
        console.log('[SERVER] Database schema initialized (PostgreSQL)');
    } catch (error) {
        console.error('[SERVER] Failed to initialize database:', error.message);
        process.exit(1);
    }

    app.listen(PORT, () => {
        console.log(`[SERVER] EduYantra API running on http://localhost:${PORT}`);
        console.log(`[SERVER] Health check: http://localhost:${PORT}/api/health`);
        console.log(`[SERVER] Database: PostgreSQL (Neon)`);
        console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

startServer();

// ── Graceful shutdown ──
const shutdown = async (signal) => {
    console.log(`[SERVER] ${signal} received. Shutting down gracefully...`);
    await closePool();
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('uncaughtException', async (error) => {
    console.error('[SERVER] Uncaught exception:', error.message);
    console.error(error.stack);
    await closePool();
    process.exit(1);
});

process.on('unhandledRejection', async (reason) => {
    console.error('[SERVER] Unhandled rejection:', reason);
    await closePool();
    process.exit(1);
});

export default app;
