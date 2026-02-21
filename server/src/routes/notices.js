import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query } from '../db/connection.js';
import { authenticate, authorize, requireInstitute, logAudit } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticate, requireInstitute);

// GET /api/notices
router.get('/', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const { priority, limit = '20', page = '1' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [instId];

  let sql = `SELECT n.*, u.name AS created_by_name
             FROM notices n
             LEFT JOIN users u ON n.created_by = u.id
             WHERE n.institute_id = $1`;

  if (priority && priority !== 'all') {
    params.push(priority);
    sql += ` AND n.priority = $${params.length}`;
  }

  // filter by target_roles for non-admin roles
  if (!['super_admin', 'institute_admin'].includes(req.user.role)) {
    params.push(req.user.role);
    sql += ` AND (n.target_roles IS NULL OR $${params.length} = ANY(n.target_roles))`;
  }

  const countSql = sql.replace(/SELECT n\.\*.*?FROM/, 'SELECT COUNT(*) FROM');
  sql += ` ORDER BY n.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(parseInt(limit), offset);

  const [dataRes, countRes] = await Promise.all([
    query(sql, params),
    query(countSql, params.slice(0, -2)),
  ]);

  res.json({
    success: true,
    data: {
      notices: dataRes.rows,
      pagination: {
        page: parseInt(page), limit: parseInt(limit),
        total: parseInt(countRes.rows[0].count),
        totalPages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit)),
      },
    },
  });
}));

// GET /api/notices/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const { rows } = await query(
    `SELECT n.*, u.name AS created_by_name FROM notices n
     LEFT JOIN users u ON n.created_by = u.id
     WHERE n.id = $1 AND n.institute_id = $2`,
    [req.params.id, instId]
  );
  if (!rows[0]) throw new AppError('Notice not found', 404);
  res.json({ success: true, data: { notice: rows[0] } });
}));

// POST /api/notices
router.post('/', authorize('institute_admin', 'class_teacher', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
  const { title, content, priority, target_roles, target_class_ids, attachment_url } = req.body;
  if (!title || !content) throw new AppError('Title and content required', 400);

  const id = `ntc_${randomUUID().replace(/-/g, '').substring(0, 12)}`;
  const date = new Date().toISOString().split('T')[0];

  await query(
    `INSERT INTO notices (id, institute_id, title, content, date, priority, created_by, target_roles, target_class_ids, attachment_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [id, instId, title, content, date, priority || 'medium', req.user.id,
     target_roles ? JSON.stringify(target_roles) : null,
     target_class_ids ? JSON.stringify(target_class_ids) : null,
     attachment_url || null]
  );

  const { rows } = await query('SELECT * FROM notices WHERE id=$1', [id]);
  await logAudit({ instituteId: instId, userId: req.user.id, action: 'create_notice', entityType: 'notice', entityId: id, req });
  res.status(201).json({ success: true, data: { notice: rows[0] } });
}));

// PUT /api/notices/:id
router.put('/:id', authorize('institute_admin', 'class_teacher', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
  const existing = await query('SELECT * FROM notices WHERE id=$1 AND institute_id=$2', [req.params.id, instId]);
  if (!existing.rows[0]) throw new AppError('Notice not found', 404);

  const { title, content, priority, target_roles, target_class_ids, attachment_url } = req.body;
  await query(
    `UPDATE notices SET title=COALESCE($1,title), content=COALESCE($2,content),
     priority=COALESCE($3,priority), target_roles=COALESCE($4,target_roles),
     target_class_ids=COALESCE($5,target_class_ids), attachment_url=COALESCE($6,attachment_url),
     updated_at=NOW() WHERE id=$7 AND institute_id=$8`,
    [title, content, priority,
     target_roles ? JSON.stringify(target_roles) : null,
     target_class_ids ? JSON.stringify(target_class_ids) : null,
     attachment_url, req.params.id, instId]
  );

  const { rows } = await query('SELECT * FROM notices WHERE id=$1', [req.params.id]);
  res.json({ success: true, data: { notice: rows[0] } });
}));

// DELETE /api/notices/:id
router.delete('/:id', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const existing = await query('SELECT id FROM notices WHERE id=$1 AND institute_id=$2', [req.params.id, instId]);
  if (!existing.rows[0]) throw new AppError('Notice not found', 404);

  await query('DELETE FROM notices WHERE id=$1', [req.params.id]);
  await logAudit({ instituteId: instId, userId: req.user.id, action: 'delete_notice', entityType: 'notice', entityId: req.params.id, req });
  res.json({ success: true, message: 'Notice deleted' });
}));

export default router;
