import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query } from '../db/connection.js';
import { authenticate, authorize, requireInstitute, logAudit } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticate, requireInstitute);

// GET /api/syllabus — list with filters
router.get('/', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const { class_id, subject_id, status } = req.query;

  let sql = `SELECT sy.*, c.name AS class_name, c.section, sub.name AS subject_name
             FROM syllabus sy
             JOIN classes c ON sy.class_id = c.id
             JOIN subjects sub ON sy.subject_id = sub.id
             WHERE sy.institute_id = $1`;
  const params = [instId];

  if (class_id) { params.push(class_id); sql += ` AND sy.class_id = $${params.length}`; }
  if (subject_id) { params.push(subject_id); sql += ` AND sy.subject_id = $${params.length}`; }
  if (status && status !== 'all') { params.push(status); sql += ` AND sy.status = $${params.length}`; }

  sql += ' ORDER BY c.name, sub.name, sy.unit';
  const { rows } = await query(sql, params);
  res.json({ success: true, data: { syllabus: rows } });
}));

// GET /api/syllabus/summary — completion overview per subject
router.get('/summary', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const { class_id } = req.query;
  const params = [instId];

  let sql = `SELECT sub.name AS subject, c.name AS class_name, c.section,
             COUNT(*) AS total_topics,
             COUNT(*) FILTER (WHERE sy.status = 'completed') AS completed,
             COUNT(*) FILTER (WHERE sy.status = 'in_progress') AS in_progress,
             COUNT(*) FILTER (WHERE sy.status = 'not_started') AS not_started,
             ROUND(AVG(sy.completion_percentage), 1) AS avg_completion
             FROM syllabus sy
             JOIN subjects sub ON sy.subject_id = sub.id
             JOIN classes c ON sy.class_id = c.id
             WHERE sy.institute_id = $1`;

  if (class_id) { params.push(class_id); sql += ` AND sy.class_id = $${params.length}`; }
  sql += ' GROUP BY sub.name, c.name, c.section ORDER BY c.name, sub.name';
  const { rows } = await query(sql, params);
  res.json({ success: true, data: { summary: rows } });
}));

// POST /api/syllabus — create topic
router.post('/', authorize('institute_admin', 'class_teacher', 'subject_teacher', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
  const { class_id, subject_id, unit, topic, description, status, completion_percentage } = req.body;
  if (!class_id || !subject_id || !topic) throw new AppError('class_id, subject_id, and topic required', 400);

  const id = `syl_${randomUUID().replace(/-/g, '').substring(0, 12)}`;
  await query(
    `INSERT INTO syllabus (id, institute_id, class_id, subject_id, unit, topic, description, status, completion_percentage)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [id, instId, class_id, subject_id, unit || null, topic, description || null, status || 'not_started', completion_percentage || 0]
  );

  const { rows } = await query('SELECT * FROM syllabus WHERE id=$1', [id]);
  await logAudit({ instituteId: instId, userId: req.user.id, action: 'create_syllabus', entityType: 'syllabus', entityId: id, req });
  res.status(201).json({ success: true, data: { syllabus: rows[0] } });
}));

// PUT /api/syllabus/:id — update topic / mark progress
router.put('/:id', authorize('institute_admin', 'class_teacher', 'subject_teacher', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
  const existing = await query('SELECT * FROM syllabus WHERE id=$1 AND institute_id=$2', [req.params.id, instId]);
  if (!existing.rows[0]) throw new AppError('Syllabus entry not found', 404);

  const { unit, topic, description, status, completion_percentage } = req.body;
  await query(
    `UPDATE syllabus SET unit=COALESCE($1,unit), topic=COALESCE($2,topic), description=COALESCE($3,description),
     status=COALESCE($4,status), completion_percentage=COALESCE($5,completion_percentage), updated_at=NOW()
     WHERE id=$6 AND institute_id=$7`,
    [unit, topic, description, status, completion_percentage, req.params.id, instId]
  );

  const { rows } = await query('SELECT * FROM syllabus WHERE id=$1', [req.params.id]);
  res.json({ success: true, data: { syllabus: rows[0] } });
}));

// DELETE /api/syllabus/:id
router.delete('/:id', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const existing = await query('SELECT id FROM syllabus WHERE id=$1 AND institute_id=$2', [req.params.id, instId]);
  if (!existing.rows[0]) throw new AppError('Syllabus entry not found', 404);

  await query('DELETE FROM syllabus WHERE id=$1', [req.params.id]);
  res.json({ success: true, message: 'Syllabus entry deleted' });
}));

export default router;
