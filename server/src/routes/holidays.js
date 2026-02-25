import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query } from '../db/connection.js';
import { authenticate, authorize, requireInstitute, logAudit } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticate, requireInstitute);

// GET /api/holidays — list holidays (with optional year/month filter)
router.get('/', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const { year, month, from_date, to_date } = req.query;
  const params = [instId];

  let sql = `SELECT h.*, u.name AS created_by_name
             FROM holidays h
             LEFT JOIN users u ON h.created_by = u.id
             WHERE h.institute_id = $1`;

  if (year && month) {
    const pad = String(month).padStart(2, '0');
    params.push(`${year}-${pad}-01`, `${year}-${pad}-31`);
    sql += ` AND h.date >= $${params.length - 1} AND h.date <= $${params.length}`;
  } else if (from_date) {
    params.push(from_date);
    sql += ` AND h.date >= $${params.length}`;
    if (to_date) {
      params.push(to_date);
      sql += ` AND h.date <= $${params.length}`;
    }
  }

  sql += ' ORDER BY h.date ASC';
  const { rows } = await query(sql, params);
  res.json({ success: true, data: { holidays: rows } });
}));

// GET /api/holidays/:id — get single holiday
router.get('/:id', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const { rows } = await query(
    'SELECT * FROM holidays WHERE id = $1 AND institute_id = $2',
    [req.params.id, instId]
  );
  if (!rows[0]) throw new AppError('Holiday not found', 404);
  res.json({ success: true, data: { holiday: rows[0] } });
}));

// POST /api/holidays — create holiday (admin only)
router.post('/', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
  const { date, name, description, holiday_type } = req.body;

  if (!date || !name) throw new AppError('date and name are required', 400);

  const id = `hol_${randomUUID().replace(/-/g, '').substring(0, 12)}`;

  const { rows } = await query(
    `INSERT INTO holidays (id, institute_id, date, name, description, holiday_type, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [id, instId, date, name, description || null, holiday_type || 'general', req.user.id]
  );

  await logAudit({
    instituteId: instId, userId: req.user.id, action: 'create_holiday',
    entityType: 'holiday', entityId: id, newValues: { date, name, holiday_type },
    req,
  });

  res.status(201).json({ success: true, data: { holiday: rows[0] } });
}));

// PUT /api/holidays/:id — update holiday (admin only)
router.put('/:id', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
  const { date, name, description, holiday_type } = req.body;

  const existing = await query('SELECT * FROM holidays WHERE id = $1 AND institute_id = $2', [req.params.id, instId]);
  if (!existing.rows[0]) throw new AppError('Holiday not found', 404);

  const { rows } = await query(
    `UPDATE holidays SET date = COALESCE($1, date), name = COALESCE($2, name),
     description = COALESCE($3, description), holiday_type = COALESCE($4, holiday_type),
     updated_at = NOW()
     WHERE id = $5 AND institute_id = $6 RETURNING *`,
    [date, name, description, holiday_type, req.params.id, instId]
  );

  await logAudit({
    instituteId: instId, userId: req.user.id, action: 'update_holiday',
    entityType: 'holiday', entityId: req.params.id,
    oldValues: existing.rows[0], newValues: { date, name, holiday_type },
    req,
  });

  res.json({ success: true, data: { holiday: rows[0] } });
}));

// DELETE /api/holidays/:id — remove holiday (admin only)
router.delete('/:id', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;

  const existing = await query('SELECT * FROM holidays WHERE id = $1 AND institute_id = $2', [req.params.id, instId]);
  if (!existing.rows[0]) throw new AppError('Holiday not found', 404);

  await query('DELETE FROM holidays WHERE id = $1 AND institute_id = $2', [req.params.id, instId]);

  await logAudit({
    instituteId: instId, userId: req.user.id, action: 'delete_holiday',
    entityType: 'holiday', entityId: req.params.id,
    oldValues: existing.rows[0], req,
  });

  res.json({ success: true, message: 'Holiday deleted' });
}));

export default router;
