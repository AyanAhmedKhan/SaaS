import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query } from '../db/connection.js';
import { authenticate, requireInstitute } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticate, requireInstitute);

// GET /api/notifications — user's notifications
router.get('/', asyncHandler(async (req, res) => {
  const { page = '1', limit = '20', unread_only } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [req.user.id];

  let sql = 'SELECT * FROM notifications WHERE user_id = $1';
  if (unread_only === 'true') sql += ' AND is_read = false';
  sql += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
  params.push(parseInt(limit), offset);

  const countSql = `SELECT COUNT(*) FROM notifications WHERE user_id = $1${unread_only === 'true' ? ' AND is_read = false' : ''}`;

  const [dataRes, countRes, unreadRes] = await Promise.all([
    query(sql, params),
    query(countSql, [req.user.id]),
    query('SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false', [req.user.id]),
  ]);

  res.json({
    success: true,
    data: {
      notifications: dataRes.rows,
      unread_count: parseInt(unreadRes.rows[0].count),
      pagination: {
        page: parseInt(page), limit: parseInt(limit),
        total: parseInt(countRes.rows[0].count),
        totalPages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit)),
      },
    },
  });
}));

// PUT /api/notifications/read-all — mark all as read (must be before /:id to avoid matching)
router.put('/read-all', asyncHandler(async (req, res) => {
  await query('UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false', [req.user.id]);
  res.json({ success: true, message: 'All notifications marked as read' });
}));

// PUT /api/notifications/:id/read — mark as read
router.put('/:id/read', asyncHandler(async (req, res) => {
  await query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ success: true, message: 'Notification marked as read' });
}));

// DELETE /api/notifications/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  await query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ success: true, message: 'Notification deleted' });
}));

// ── Helper to create notification (used by other modules) ──
export async function createNotification({ userId, instituteId, title, message, type = 'info', link }) {
  const id = `notif_${randomUUID().replace(/-/g, '').substring(0, 10)}`;
  await query(
    `INSERT INTO notifications (id, user_id, institute_id, title, message, type, link)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id, userId, instituteId, title, message, type, link || null]
  );
  return id;
}

// ── Bulk notify ──
export async function notifyUsers({ userIds, instituteId, title, message, type = 'info', link }) {
  for (const uid of userIds) {
    await createNotification({ userId: uid, instituteId, title, message, type, link });
  }
}

export default router;
