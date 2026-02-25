import { Router } from 'express';
import os from 'os';
import { query, getPool } from '../db/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getMetrics } from '../middleware/requestLogger.js';

const router = Router();

// All monitoring endpoints require super_admin
router.use(authenticate, authorize('super_admin'));

// ── GET /api/monitoring/health ── Enhanced health check
router.get('/health', asyncHandler(async (req, res) => {
    const dbStart = Date.now();
    let dbStatus = 'healthy';
    let dbLatency = 0;
    try {
        await query('SELECT 1');
        dbLatency = Date.now() - dbStart;
    } catch {
        dbStatus = 'unhealthy';
        dbLatency = Date.now() - dbStart;
    }

    const mem = process.memoryUsage();

    res.json({
        success: true,
        data: {
            status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            uptime_seconds: Math.round(process.uptime()),
            node_version: process.version,
            environment: process.env.NODE_ENV || 'development',
            database: {
                status: dbStatus,
                latency_ms: dbLatency,
                type: 'PostgreSQL (Neon)',
            },
            memory: {
                heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
                heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100,
                rss_mb: Math.round(mem.rss / 1024 / 1024 * 100) / 100,
                external_mb: Math.round(mem.external / 1024 / 1024 * 100) / 100,
            },
            system: {
                platform: os.platform(),
                arch: os.arch(),
                cpus: os.cpus().length,
                total_memory_mb: Math.round(os.totalmem() / 1024 / 1024),
                free_memory_mb: Math.round(os.freemem() / 1024 / 1024),
                load_avg: os.loadavg(),
            },
        },
    });
}));

// ── GET /api/monitoring/metrics ── In-memory request metrics
router.get('/metrics', asyncHandler(async (req, res) => {
    const m = getMetrics();

    // Also fetch active user count from DB
    const activeUsers = await query(
        `SELECT COUNT(DISTINCT user_id) AS count FROM request_logs
         WHERE created_at > NOW() - INTERVAL '15 minutes' AND user_id IS NOT NULL`
    );

    res.json({
        success: true,
        data: {
            ...m,
            active_users_15m: parseInt(activeUsers.rows[0]?.count || 0),
        },
    });
}));

// ── GET /api/monitoring/db-stats ── Connection pool info
router.get('/db-stats', asyncHandler(async (req, res) => {
    const pool = getPool();

    // DB table sizes
    const tableSizes = await query(`
        SELECT schemaname, tablename,
               pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size,
               pg_total_relation_size(schemaname || '.' || tablename) AS size_bytes
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
        LIMIT 20
    `);

    // Row counts for key tables
    const rowCounts = await query(`
        SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
        UNION ALL SELECT 'students', COUNT(*) FROM students
        UNION ALL SELECT 'teachers', COUNT(*) FROM teachers
        UNION ALL SELECT 'attendance_records', COUNT(*) FROM attendance_records
        UNION ALL SELECT 'exam_results', COUNT(*) FROM exam_results
        UNION ALL SELECT 'fee_payments', COUNT(*) FROM fee_payments
        UNION ALL SELECT 'request_logs', COUNT(*) FROM request_logs
        UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs
    `);

    res.json({
        success: true,
        data: {
            pool: {
                total_count: pool.totalCount,
                idle_count: pool.idleCount,
                waiting_count: pool.waitingCount,
            },
            table_sizes: tableSizes.rows,
            row_counts: rowCounts.rows.map(r => ({
                table: r.table_name,
                rows: parseInt(r.row_count),
            })),
        },
    });
}));

// ── GET /api/monitoring/logs ── Query persisted request logs
router.get('/logs', asyncHandler(async (req, res) => {
    const { status, method, url, min_duration, user_id, page = '1', limit = '50' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];

    let sql = 'SELECT * FROM request_logs WHERE 1=1';

    if (status) {
        if (status === 'error') {
            sql += ' AND status_code >= 400';
        } else if (status === 'server_error') {
            sql += ' AND status_code >= 500';
        } else {
            params.push(parseInt(status));
            sql += ` AND status_code = $${params.length}`;
        }
    }
    if (method) { params.push(method.toUpperCase()); sql += ` AND method = $${params.length}`; }
    if (url) { params.push(`%${url}%`); sql += ` AND url ILIKE $${params.length}`; }
    if (min_duration) { params.push(parseInt(min_duration)); sql += ` AND duration_ms >= $${params.length}`; }
    if (user_id) { params.push(user_id); sql += ` AND user_id = $${params.length}`; }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*)');
    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const [dataRes, countRes] = await Promise.all([
        query(sql, params),
        query(countSql, params.slice(0, -2)),
    ]);

    res.json({
        success: true,
        data: {
            logs: dataRes.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countRes.rows[0].count),
                totalPages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit)),
            },
        },
    });
}));

// ── GET /api/monitoring/metrics-history ── Historical system_metrics
router.get('/metrics-history', asyncHandler(async (req, res) => {
    const { metric_name, hours = '24' } = req.query;
    const params = [parseInt(hours)];

    let sql = `SELECT metric_name, metric_value, created_at
               FROM system_metrics
               WHERE created_at > NOW() - ($1 || ' hours')::INTERVAL`;

    if (metric_name) {
        params.push(metric_name);
        sql += ` AND metric_name = $${params.length}`;
    }

    sql += ' ORDER BY created_at DESC LIMIT 500';

    const { rows } = await query(sql, params);

    // Group by metric_name
    const grouped = {};
    for (const row of rows) {
        if (!grouped[row.metric_name]) grouped[row.metric_name] = [];
        grouped[row.metric_name].push({
            value: row.metric_value,
            time: row.created_at,
        });
    }

    res.json({ success: true, data: { metrics: grouped } });
}));

export default router;
