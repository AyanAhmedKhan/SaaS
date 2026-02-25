import { randomUUID } from 'crypto';
import { query } from '../db/connection.js';

// ── In-Memory Metrics Collector ──
// These are aggregated in memory and exposed via the monitoring API
const metrics = {
    startTime: Date.now(),
    totalRequests: 0,
    totalErrors: 0,       // 4xx + 5xx
    totalServerErrors: 0, // 5xx only
    totalDurationMs: 0,
    statusCodes: {},       // { 200: count, 404: count, ... }
    endpointHits: {},      // { 'GET /api/students': count, ... }
    slowRequests: 0,       // >1000ms
    activeRequests: 0,
};

export function getMetrics() {
    const uptimeMs = Date.now() - metrics.startTime;
    const avgDuration = metrics.totalRequests > 0
        ? Math.round(metrics.totalDurationMs / metrics.totalRequests)
        : 0;
    return {
        uptime_seconds: Math.round(uptimeMs / 1000),
        total_requests: metrics.totalRequests,
        total_errors: metrics.totalErrors,
        total_server_errors: metrics.totalServerErrors,
        error_rate: metrics.totalRequests > 0
            ? Math.round((metrics.totalErrors / metrics.totalRequests) * 10000) / 100
            : 0,
        avg_response_ms: avgDuration,
        slow_requests: metrics.slowRequests,
        active_requests: metrics.activeRequests,
        requests_per_minute: metrics.totalRequests > 0
            ? Math.round((metrics.totalRequests / (uptimeMs / 60000)) * 100) / 100
            : 0,
        status_codes: { ...metrics.statusCodes },
        top_endpoints: Object.entries(metrics.endpointHits)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([endpoint, count]) => ({ endpoint, count })),
    };
}

export function resetMetrics() {
    metrics.startTime = Date.now();
    metrics.totalRequests = 0;
    metrics.totalErrors = 0;
    metrics.totalServerErrors = 0;
    metrics.totalDurationMs = 0;
    metrics.statusCodes = {};
    metrics.endpointHits = {};
    metrics.slowRequests = 0;
    metrics.activeRequests = 0;
}

// ── Request ID Middleware ──
export function requestIdMiddleware(req, res, next) {
    req.requestId = req.headers['x-request-id'] || randomUUID();
    res.setHeader('X-Request-ID', req.requestId);
    next();
}

// ── Structured Request Logger ──
export function requestLogger(req, res, next) {
    const start = Date.now();
    metrics.activeRequests++;

    // Log request arrival
    console.log(`[REQ] [${req.requestId}] ${req.method} ${req.originalUrl}`);

    // Capture user info (populated by auth middleware later in the chain)
    // We'll read req.user at response time when it's been set

    res.on('finish', () => {
        const duration = Date.now() - start;
        metrics.activeRequests--;

        // ── Update in-memory metrics ──
        metrics.totalRequests++;
        metrics.totalDurationMs += duration;

        const statusCode = res.statusCode;
        metrics.statusCodes[statusCode] = (metrics.statusCodes[statusCode] || 0) + 1;

        if (statusCode >= 400) metrics.totalErrors++;
        if (statusCode >= 500) metrics.totalServerErrors++;
        if (duration > 1000) metrics.slowRequests++;

        // Track endpoint hits (normalize dynamic params)
        const normalizedUrl = req.route
            ? `${req.method} ${req.baseUrl}${req.route.path}`
            : `${req.method} ${req.originalUrl.split('?')[0]}`;
        metrics.endpointHits[normalizedUrl] = (metrics.endpointHits[normalizedUrl] || 0) + 1;

        // ── Console log ──
        const level = statusCode >= 500 ? 'ERR' : statusCode >= 400 ? 'WARN' : 'INFO';
        console.log(
            `[RES] [${level}] [${req.requestId}] ${req.method} ${req.originalUrl} → ${statusCode} (${duration}ms)`
        );

        if (duration > 1000) {
            console.warn(
                `[SLOW] [${req.requestId}] ${req.method} ${req.originalUrl} took ${duration}ms`
            );
        }

        // ── Persist to DB (fire-and-forget, non-blocking) ──
        persistRequestLog({
            requestId: req.requestId,
            method: req.method,
            url: req.originalUrl,
            statusCode,
            duration,
            ip: req.ip,
            userId: req.user?.id || null,
            instituteId: req.user?.institute_id || req.instituteId || null,
            userAgent: req.headers['user-agent']?.substring(0, 200) || null,
            errorMessage: statusCode >= 400 ? res.statusMessage || null : null,
        });
    });

    next();
}

// ── Async DB log writer (non-blocking) ──
async function persistRequestLog(data) {
    try {
        // Skip health check and static asset requests to reduce noise
        if (data.url === '/api/health' || data.url.startsWith('/assets')) return;

        const id = `rl_${randomUUID().replace(/-/g, '').substring(0, 12)}`;
        await query(
            `INSERT INTO request_logs (id, request_id, method, url, status_code, duration_ms, ip, user_id, institute_id, user_agent, error_message)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [id, data.requestId, data.method, data.url, data.statusCode, data.duration,
                data.ip, data.userId, data.instituteId, data.userAgent, data.errorMessage]
        );
    } catch (err) {
        // Never let logging failures crash the app
        console.error('[LOG] Failed to persist request log:', err.message);
    }
}

// ── Periodic Metrics Snapshot (saves to system_metrics every 5 minutes) ──
let snapshotInterval = null;

export function startMetricsSnapshot() {
    if (snapshotInterval) return;
    snapshotInterval = setInterval(async () => {
        try {
            const m = getMetrics();
            const batch = [
                { name: 'requests_per_minute', value: m.requests_per_minute },
                { name: 'error_rate', value: m.error_rate },
                { name: 'avg_response_ms', value: m.avg_response_ms },
                { name: 'active_requests', value: m.active_requests },
                { name: 'memory_heap_mb', value: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100 },
            ];
            for (const metric of batch) {
                const id = `sm_${randomUUID().replace(/-/g, '').substring(0, 12)}`;
                await query(
                    'INSERT INTO system_metrics (id, metric_name, metric_value) VALUES ($1,$2,$3)',
                    [id, metric.name, metric.value]
                );
            }
        } catch (err) {
            console.error('[METRICS] Snapshot failed:', err.message);
        }
    }, 5 * 60 * 1000); // every 5 minutes
}

export function stopMetricsSnapshot() {
    if (snapshotInterval) {
        clearInterval(snapshotInterval);
        snapshotInterval = null;
    }
}
