import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query } from '../db/connection.js';
import { authenticate, authorize, requireInstitute, logAudit } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticate, requireInstitute);

// GET /api/grading — list grading system for the institute
router.get('/', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const { rows } = await query(
    'SELECT * FROM grading_systems WHERE institute_id = $1 ORDER BY min_percentage DESC',
    [instId]
  );
  res.json({ success: true, data: { grades: rows } });
}));

// POST /api/grading — create a grade entry
router.post('/', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
  const { grade, min_percentage, max_percentage, grade_point, description } = req.body;
  if (!grade || min_percentage === undefined || max_percentage === undefined) {
    throw new AppError('grade, min_percentage, max_percentage required', 400);
  }

  const id = `grd_${randomUUID().replace(/-/g, '').substring(0, 10)}`;
  await query(
    `INSERT INTO grading_systems (id, institute_id, grade, min_percentage, max_percentage, grade_point, description)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id, instId, grade, min_percentage, max_percentage, grade_point||null, description||null]
  );

  const { rows } = await query('SELECT * FROM grading_systems WHERE id=$1', [id]);
  await logAudit({ instituteId: instId, userId: req.user.id, action: 'create_grade', entityType: 'grading_system', entityId: id, req });
  res.status(201).json({ success: true, data: { grade: rows[0] } });
}));

// POST /api/grading/bulk — bulk upsert grading system
router.post('/bulk', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
  const { grades } = req.body;
  if (!Array.isArray(grades)) throw new AppError('grades[] required', 400);

  // replace entire grading system
  await query('DELETE FROM grading_systems WHERE institute_id=$1', [instId]);
  for (const g of grades) {
    const id = `grd_${randomUUID().replace(/-/g, '').substring(0, 10)}`;
    await query(
      `INSERT INTO grading_systems (id, institute_id, grade, min_percentage, max_percentage, grade_point, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, instId, g.grade, g.min_percentage, g.max_percentage, g.grade_point||null, g.description||null]
    );
  }

  await logAudit({ instituteId: instId, userId: req.user.id, action: 'bulk_update_grading', entityType: 'grading_system', req });
  const { rows } = await query('SELECT * FROM grading_systems WHERE institute_id=$1 ORDER BY min_percentage DESC', [instId]);
  res.json({ success: true, data: { grades: rows } });
}));

// PUT /api/grading/:id — update grade entry
router.put('/:id', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
  const existing = await query('SELECT id FROM grading_systems WHERE id=$1 AND institute_id=$2', [req.params.id, instId]);
  if (!existing.rows[0]) throw new AppError('Grade entry not found', 404);

  const { grade, min_percentage, max_percentage, grade_point, description } = req.body;
  await query(
    `UPDATE grading_systems SET grade=COALESCE($1,grade), min_percentage=COALESCE($2,min_percentage),
     max_percentage=COALESCE($3,max_percentage), grade_point=COALESCE($4,grade_point),
     description=COALESCE($5,description)
     WHERE id=$6 AND institute_id=$7`,
    [grade, min_percentage, max_percentage, grade_point, description, req.params.id, instId]
  );

  const { rows } = await query('SELECT * FROM grading_systems WHERE id=$1', [req.params.id]);
  res.json({ success: true, data: { grade: rows[0] } });
}));

// DELETE /api/grading/:id
router.delete('/:id', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const existing = await query('SELECT id FROM grading_systems WHERE id=$1 AND institute_id=$2', [req.params.id, instId]);
  if (!existing.rows[0]) throw new AppError('Grade entry not found', 404);

  await query('DELETE FROM grading_systems WHERE id=$1', [req.params.id]);
  res.json({ success: true, message: 'Grade entry deleted' });
}));

export default router;
