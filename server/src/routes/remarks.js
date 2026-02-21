import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query } from '../db/connection.js';
import { authenticate, authorize, requireInstitute, logAudit } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticate, requireInstitute);

// GET /api/remarks — list remarks for a student
router.get('/', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const { student_id, teacher_id, category, page = '1', limit = '20' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [instId];

  let sql = `SELECT tr.*, s.name AS student_name, s.roll_number,
             t.name AS teacher_name, c.name AS class_name, c.section
             FROM teacher_remarks tr
             JOIN students s ON tr.student_id = s.id
             JOIN teachers t ON tr.teacher_id = t.id
             LEFT JOIN classes c ON s.class_id = c.id
             WHERE tr.institute_id = $1`;

  if (student_id) { params.push(student_id); sql += ` AND tr.student_id = $${params.length}`; }
  if (teacher_id) { params.push(teacher_id); sql += ` AND tr.teacher_id = $${params.length}`; }
  if (category) { params.push(category); sql += ` AND tr.category = $${params.length}`; }

  // scope for teachers
  if (req.user.role === 'class_teacher' || req.user.role === 'subject_teacher') {
    const tr = await query('SELECT id FROM teachers WHERE user_id=$1 AND institute_id=$2', [req.user.id, instId]);
    if (tr.rows[0]) { params.push(tr.rows[0].id); sql += ` AND tr.teacher_id = $${params.length}`; }
  }

  // scope for students
  if (req.user.role === 'student') {
    const sr = await query('SELECT id FROM students WHERE user_id=$1', [req.user.id]);
    if (sr.rows[0]) { params.push(sr.rows[0].id); sql += ` AND tr.student_id = $${params.length}`; }
  }

  // scope for parents
  if (req.user.role === 'parent') {
    params.push(req.user.id);
    sql += ` AND tr.student_id IN (SELECT id FROM students WHERE parent_user_id = $${params.length})`;
  }

  sql += ` ORDER BY tr.date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(parseInt(limit), offset);

  const { rows } = await query(sql, params);
  res.json({ success: true, data: { remarks: rows } });
}));

// POST /api/remarks — create remark
router.post('/', authorize('institute_admin', 'class_teacher', 'subject_teacher', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
  const { student_id, category, remark, is_positive } = req.body;
  if (!student_id || !remark) throw new AppError('student_id and remark required', 400);

  // resolve teacher_id
  let teacher_id = null;
  if (['class_teacher', 'subject_teacher'].includes(req.user.role)) {
    const tr = await query('SELECT id FROM teachers WHERE user_id=$1 AND institute_id=$2', [req.user.id, instId]);
    if (tr.rows[0]) teacher_id = tr.rows[0].id;
  }
  if (!teacher_id && req.user.role === 'super_admin') teacher_id = req.body.teacher_id;
  if (!teacher_id && req.user.role === 'institute_admin') {
    // admin can add remarks — use a generic system teacher or themselves
    const adminTeacher = await query('SELECT id FROM teachers WHERE institute_id=$1 LIMIT 1', [instId]);
    teacher_id = adminTeacher.rows[0]?.id;
  }
  if (!teacher_id) throw new AppError('Could not determine teacher_id', 400);

  const id = `rmk_${randomUUID().replace(/-/g, '').substring(0, 10)}`;
  await query(
    `INSERT INTO teacher_remarks (id, institute_id, student_id, teacher_id, date, category, remark, is_positive)
     VALUES ($1,$2,$3,$4,CURRENT_DATE,$5,$6,$7)`,
    [id, instId, student_id, teacher_id, category||'general', remark, is_positive !== undefined ? is_positive : true]
  );

  const { rows } = await query('SELECT * FROM teacher_remarks WHERE id=$1', [id]);
  await logAudit({ instituteId: instId, userId: req.user.id, action: 'create_remark', entityType: 'teacher_remark', entityId: id, req });
  res.status(201).json({ success: true, data: { remark: rows[0] } });
}));

// PUT /api/remarks/:id — update remark
router.put('/:id', authorize('institute_admin', 'class_teacher', 'subject_teacher', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
  const existing = await query('SELECT * FROM teacher_remarks WHERE id=$1 AND institute_id=$2', [req.params.id, instId]);
  if (!existing.rows[0]) throw new AppError('Remark not found', 404);

  const { category, remark, is_positive } = req.body;
  await query(
    `UPDATE teacher_remarks SET category=COALESCE($1,category), remark=COALESCE($2,remark),
     is_positive=COALESCE($3,is_positive), updated_at=NOW()
     WHERE id=$4 AND institute_id=$5`,
    [category, remark, is_positive, req.params.id, instId]
  );

  const { rows } = await query('SELECT * FROM teacher_remarks WHERE id=$1', [req.params.id]);
  res.json({ success: true, data: { remark: rows[0] } });
}));

// DELETE /api/remarks/:id
router.delete('/:id', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const existing = await query('SELECT id FROM teacher_remarks WHERE id=$1 AND institute_id=$2', [req.params.id, instId]);
  if (!existing.rows[0]) throw new AppError('Remark not found', 404);

  await query('DELETE FROM teacher_remarks WHERE id=$1', [req.params.id]);
  res.json({ success: true, message: 'Remark deleted' });
}));

export default router;
