import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { seed } from '../db/seed.js';
import { query } from '../db/connection.js';

const router = Router();

// POST /api/seed — run the full database seed
// First-time (no users): no auth needed. After that: super_admin only.
router.post('/', async (req, res) => {
  try {
    // Check if DB has users — skip auth for first-time setup
    let hasUsers = false;
    try {
      const { rows } = await query('SELECT 1 FROM users LIMIT 1');
      hasUsers = rows.length > 0;
    } catch {
      // Table doesn't exist yet — first-time setup
    }

    if (hasUsers) {
      // Require super_admin auth
      const authResult = await new Promise((resolve) => {
        authenticate(req, res, (err) => {
          if (err) return resolve({ error: err });
          authorize('super_admin')(req, res, (err2) => {
            if (err2) return resolve({ error: err2 });
            resolve({ error: null });
          });
        });
      });
      if (authResult.error) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required. Database already has users.' },
        });
      }
    }

    const start = Date.now();
    await seed();
    const durationMs = Date.now() - start;

    res.json({
      success: true,
      data: {
        message: 'Database seeded successfully',
        duration_ms: durationMs,
        credentials: {
          super_admin: 'super@eduyantra.com',
          institute_admin: 'admin@springfield.edu (code: SPRING01)',
          class_teacher: 'priya.sharma@springfield.edu (code: SPRING01)',
          subject_teacher: 'sunita.verma@springfield.edu (code: SPRING01)',
          student: 'arjun@springfield.edu (code: SPRING01)',
          parent: 'ramesh.sharma@gmail.com (code: SPRING01)',
          password: 'demo123',
        },
      },
    });
  } catch (error) {
    console.error('[SEED ROUTE ERROR]', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
  }
});

export default router;
