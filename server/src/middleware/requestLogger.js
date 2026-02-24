import { v4 as uuidv4 } from 'uuid';

// Adds a unique request ID to every request for tracing
export function requestIdMiddleware(req, res, next) {
    req.requestId = req.headers['x-request-id'] || uuidv4();
    res.setHeader('X-Request-ID', req.requestId);
    next();
}

// Structured request/response logger
export function requestLogger(req, res, next) {
    const start = Date.now();

    // Log request
    const logData = {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.headers['user-agent']?.substring(0, 100),
    };

    // Sanitize body (remove passwords from logs)
    if (req.body && Object.keys(req.body).length > 0) {
        const sanitized = { ...req.body };
        if (sanitized.password) sanitized.password = '***';
        if (sanitized.password_hash) sanitized.password_hash = '***';
        logData.body = sanitized;
    }

    console.log(`[REQ] [${logData.requestId}] ${logData.method} ${logData.url}`);

    // Log response on finish
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(
            `[RES] [${logData.requestId}] ${logData.method} ${logData.url} → ${res.statusCode} (${duration}ms)`
        );

        // Log slow requests
        if (duration > 1000) {
            console.warn(
                `[SLOW] [${logData.requestId}] ${logData.method} ${logData.url} took ${duration}ms`
            );
        }
    });

    next();
}
