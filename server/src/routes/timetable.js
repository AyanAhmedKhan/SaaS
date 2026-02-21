import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query } from '../db/connection.js';
import { authenticate, authorize, requireInstitute, logAudit } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticate, requireInstitute);

// GET /api/timetable — list entries with joins
router.get('/', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const { class_id, day, teacher_id } = req.query;

  let sql = `SELECT tt.*, c.name AS class_name, c.section,
             sub.name AS subject_name, t.name AS teacher_name
             FROM timetable tt
             JOIN classes c ON tt.class_id = c.id
             LEFT JOIN subjects sub ON tt.subject_id = sub.id
             LEFT JOIN teachers t ON tt.teacher_id = t.id
             WHERE tt.institute_id = $1`;
  const params = [instId];

  if (class_id) { params.push(class_id); sql += ` AND tt.class_id = $${params.length}`; }
  if (day) { params.push(day); sql += ` AND tt.day = $${params.length}`; }
  if (teacher_id) { params.push(teacher_id); sql += ` AND tt.teacher_id = $${params.length}`; }

  // scope for teachers
  if (req.user.role === 'class_teacher' || req.user.role === 'subject_teacher') {
    const tr = await query('SELECT id FROM teachers WHERE user_id=$1 AND institute_id=$2', [req.user.id, instId]);
    if (tr.rows[0]) { params.push(tr.rows[0].id); sql += ` AND tt.teacher_id = $${params.length}`; }
  }

  // scope for students
  if (req.user.role === 'student') {
    const sr = await query('SELECT class_id FROM students WHERE user_id=$1 AND institute_id=$2', [req.user.id, instId]);
    if (sr.rows[0]) { params.push(sr.rows[0].class_id); sql += ` AND tt.class_id = $${params.length}`; }
  }

  // scope for parents
  if (req.user.role === 'parent') {
    params.push(req.user.id);
    sql += ` AND tt.class_id IN (SELECT class_id FROM students WHERE parent_user_id = $${params.length})`;
  }

  sql += ' ORDER BY CASE tt.day WHEN \'Monday\' THEN 1 WHEN \'Tuesday\' THEN 2 WHEN \'Wednesday\' THEN 3 WHEN \'Thursday\' THEN 4 WHEN \'Friday\' THEN 5 WHEN \'Saturday\' THEN 6 ELSE 7 END, tt.period';

  const { rows } = await query(sql, params);
  res.json({ success: true, data: { timetable: rows } });
}));

// GET /api/timetable/classes — distinct class/section combos
router.get('/classes', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const { rows } = await query(
    'SELECT id, name, section FROM classes WHERE institute_id=$1 ORDER BY name, section',
    [instId]
  );
  res.json({ success: true, data: { classes: rows } });
}));

// POST /api/timetable — create entry
router.post('/', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
  const { class_id, subject_id, teacher_id, day, period, start_time, end_time, room } = req.body;
  if (!class_id || !day || period === undefined) throw new AppError('class_id, day and period required', 400);

  const id = `tt_${randomUUID().replace(/-/g, '').substring(0, 12)}`;
  await query(
    `INSERT INTO timetable (id, institute_id, class_id, subject_id, teacher_id, day, period, start_time, end_time, room)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [id, instId, class_id, subject_id || null, teacher_id || null, day, period, start_time || null, end_time || null, room || null]
  );

  const { rows } = await query('SELECT * FROM timetable WHERE id=$1', [id]);
  await logAudit({ instituteId: instId, userId: req.user.id, action: 'create_timetable', entityType: 'timetable', entityId: id, req });
  res.status(201).json({ success: true, data: { entry: rows[0] } });
}));

// POST /api/timetable/bulk — bulk upsert for a class
router.post('/bulk', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
  const { class_id, entries } = req.body;
  if (!class_id || !Array.isArray(entries)) throw new AppError('class_id and entries[] required', 400);

  // Delete existing entries for that class and re-insert
  await query('DELETE FROM timetable WHERE class_id=$1 AND institute_id=$2', [class_id, instId]);
  for (const e of entries) {
    const id = `tt_${randomUUID().replace(/-/g, '').substring(0, 12)}`;
    await query(
      `INSERT INTO timetable (id, institute_id, class_id, subject_id, teacher_id, day, period, start_time, end_time, room)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, instId, class_id, e.subject_id||null, e.teacher_id||null, e.day, e.period, e.start_time||null, e.end_time||null, e.room||null]
    );
  }

  await logAudit({ instituteId: instId, userId: req.user.id, action: 'bulk_update_timetable', entityType: 'timetable', newValues: { class_id, count: entries.length }, req });
  res.json({ success: true, message: `${entries.length} timetable entries saved` });
}));

// PUT /api/timetable/:id
router.put('/:id', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
  const { subject_id, teacher_id, day, period, start_time, end_time, room } = req.body;

  const existing = await query('SELECT * FROM timetable WHERE id=$1 AND institute_id=$2', [req.params.id, instId]);
  if (!existing.rows[0]) throw new AppError('Timetable entry not found', 404);

  await query(
    `UPDATE timetable SET subject_id=COALESCE($1,subject_id), teacher_id=COALESCE($2,teacher_id),
     day=COALESCE($3,day), period=COALESCE($4,period), start_time=COALESCE($5,start_time),
     end_time=COALESCE($6,end_time), room=COALESCE($7,room), updated_at=NOW()
     WHERE id=$8 AND institute_id=$9`,
    [subject_id, teacher_id, day, period, start_time, end_time, room, req.params.id, instId]
  );

  const { rows } = await query('SELECT * FROM timetable WHERE id=$1', [req.params.id]);
  res.json({ success: true, data: { entry: rows[0] } });
}));

// DELETE /api/timetable/:id
router.delete('/:id', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const existing = await query('SELECT id FROM timetable WHERE id=$1 AND institute_id=$2', [req.params.id, instId]);
  if (!existing.rows[0]) throw new AppError('Timetable entry not found', 404);

  await query('DELETE FROM timetable WHERE id=$1', [req.params.id]);
  res.json({ success: true, message: 'Timetable entry deleted' });
}));

export default router;
