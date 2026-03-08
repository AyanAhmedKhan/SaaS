import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { seed } from '../db/seed.js';

const router = Router();

// POST /api/seed — run the full database seed
// Restricted to super_admin only
router.post(
  '/',
  authenticate,
  authorize('super_admin'),
  async (req, res, next) => {
    try {
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
      next(error);
    }
  }
);

export default router;
