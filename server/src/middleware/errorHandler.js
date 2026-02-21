// Custom application error with status codes for structured error handling
export class AppError extends Error {
    constructor(message, statusCode = 500, details = null) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.details = details;
        this.isOperational = true;
    }
}

// Async route wrapper — catches promise rejections automatically
export function asyncHandler(fn) {
    return (req, res, next) => {
        try {
            const result = fn(req, res, next);
            if (result && typeof result.catch === 'function') {
                result.catch(next);
            }
        } catch (error) {
            next(error);
        }
    };
}

// Global error handler middleware
export function errorHandler(err, req, res, _next) {
    const requestId = req.requestId || 'unknown';
    const statusCode = err.statusCode || 500;
    const isProduction = process.env.NODE_ENV === 'production';

    // Log the full error for debugging
    console.error(`[ERROR] [${requestId}] ${err.name}: ${err.message}`);
    if (!isProduction && err.stack) {
        console.error(`[ERROR] [${requestId}] Stack:`, err.stack);
    }

    const response = {
        success: false,
        error: {
            message: isProduction && statusCode === 500 ? 'Internal Server Error' : err.message,
            code: err.name || 'INTERNAL_ERROR',
            requestId,
        },
    };

    // Include details in non-production
    if (!isProduction && err.details) {
        response.error.details = err.details;
    }

    // Include stack trace in development
    if (!isProduction && err.stack) {
        response.error.stack = err.stack;
    }

    res.status(statusCode).json(response);
}

// 404 handler
export function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        error: {
            message: `Route not found: ${req.method} ${req.originalUrl}`,
            code: 'NOT_FOUND',
            requestId: req.requestId || 'unknown',
        },
    });
}
