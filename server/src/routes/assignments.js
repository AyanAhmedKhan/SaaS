import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, getClient } from '../db/connection.js';
import { authenticate, authorize, requireInstitute, logAudit } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticate, requireInstitute);

// GET /api/assignments — list assignments
router.get('/', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const { class_id, subject_id, status, page = '1', limit = '20' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [instId];

  let sql = `SELECT a.*, c.name AS class_name, c.section, sub.name AS subject_name,
             t.name AS created_by_name,
             (SELECT COUNT(*) FROM assignment_submissions asb WHERE asb.assignment_id = a.id) AS submission_count,
             (SELECT COUNT(*) FROM students s WHERE s.class_id = a.class_id AND s.status='active') AS total_students
             FROM assignments a
             JOIN classes c ON a.class_id = c.id
             LEFT JOIN subjects sub ON a.subject_id = sub.id
             LEFT JOIN teachers t ON a.teacher_id = t.id
             WHERE a.institute_id = $1`;

  if (class_id) { params.push(class_id); sql += ` AND a.class_id = $${params.length}`; }
  if (subject_id) { params.push(subject_id); sql += ` AND a.subject_id = $${params.length}`; }
  if (status) { params.push(status); sql += ` AND a.status = $${params.length}`; }

  // scope for teachers
  if (req.user.role === 'class_teacher' || req.user.role === 'subject_teacher') {
    const tr = await query('SELECT id FROM teachers WHERE user_id=$1 AND institute_id=$2', [req.user.id, instId]);
    if (tr.rows[0]) {
      params.push(tr.rows[0].id);
      sql += ` AND a.class_id IN (SELECT class_id FROM teacher_assignments WHERE teacher_id=$${params.length})`;
    }
  }

  // scope for students
  if (req.user.role === 'student') {
    const sr = await query('SELECT class_id FROM students WHERE user_id=$1 AND institute_id=$2', [req.user.id, instId]);
    if (sr.rows[0]) { params.push(sr.rows[0].class_id); sql += ` AND a.class_id = $${params.length}`; }
  }

  const countSql = sql.replace(/SELECT a\.\*.*?FROM/, 'SELECT COUNT(*) FROM').replace(/LEFT JOIN teachers.*?WHERE/, 'WHERE');
  sql += ` ORDER BY a.due_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(parseInt(limit), offset);

  const [dataRes, countRes] = await Promise.all([
    query(sql, params),
    query(countSql, params.slice(0, -2)),
  ]);

  res.json({
    success: true,
    data: {
      assignments: dataRes.rows,
      pagination: {
        page: parseInt(page), limit: parseInt(limit),
        total: parseInt(countRes.rows[0].count),
        totalPages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit)),
      },
    },
  });
}));

// GET /api/assignments/:id — with submissions
router.get('/:id', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;

  const asgn = await query(
    `SELECT a.*, c.name AS class_name, c.section, sub.name AS subject_name, t.name AS created_by_name
     FROM assignments a
     JOIN classes c ON a.class_id = c.id
     LEFT JOIN subjects sub ON a.subject_id = sub.id
     LEFT JOIN teachers t ON a.teacher_id = t.id
     WHERE a.id = $1 AND a.institute_id = $2`,
    [req.params.id, instId]
  );
  if (!asgn.rows[0]) throw new AppError('Assignment not found', 404);

  const subs = await query(
    `SELECT asb.*, s.name AS student_name, s.roll_number
     FROM assignment_submissions asb
     JOIN students s ON asb.student_id = s.id
     WHERE asb.assignment_id = $1 AND asb.institute_id = $2
     ORDER BY asb.submitted_at DESC`,
    [req.params.id, instId]
  );

  res.json({ success: true, data: { assignment: asgn.rows[0], submissions: subs.rows } });
}));

// POST /api/assignments — create
router.post('/', authorize('institute_admin', 'class_teacher', 'subject_teacher', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
  const { title, description, class_id, subject_id, due_date, max_marks, attachment_url } = req.body;
  if (!title || !class_id || !due_date) throw new AppError('title, class_id, due_date required', 400);

  const clsRec = await query('SELECT academic_year_id, class_teacher_id FROM classes WHERE id=$1', [class_id]);
  const academic_year_id = clsRec.rows[0]?.academic_year_id;

  let teacherId = null;
  if (req.user.role === 'class_teacher' || req.user.role === 'subject_teacher') {
    const tRec = await query('SELECT id FROM teachers WHERE user_id=$1', [req.user.id]);
    teacherId = tRec.rows[0]?.id;
  }
  if (!teacherId) teacherId = clsRec.rows[0]?.class_teacher_id;
  if (!teacherId) {
    const fallback = await query('SELECT id FROM teachers WHERE institute_id=$1 LIMIT 1', [instId]);
    teacherId = fallback.rows[0]?.id;
  }

  const id = `asgn_${randomUUID().replace(/-/g, '').substring(0, 10)}`;
  await query(
    `INSERT INTO assignments (id, institute_id, class_id, subject_id, teacher_id, academic_year_id, title, description, due_date, max_marks, attachment_url, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active')`,
    [id, instId, class_id, subject_id || null, teacherId, academic_year_id, title, description || null, due_date, max_marks || 100, attachment_url || null]
  );

  const { rows } = await query('SELECT * FROM assignments WHERE id=$1', [id]);
  await logAudit({ instituteId: instId, userId: req.user.id, action: 'create_assignment', entityType: 'assignment', entityId: id, req });
  res.status(201).json({ success: true, data: { assignment: rows[0] } });
}));

// PUT /api/assignments/:id — update
router.put('/:id', authorize('institute_admin', 'class_teacher', 'subject_teacher', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
  const existing = await query('SELECT * FROM assignments WHERE id=$1 AND institute_id=$2', [req.params.id, instId]);
  if (!existing.rows[0]) throw new AppError('Assignment not found', 404);

  const { title, description, due_date, max_marks, status, attachment_url } = req.body;
  await query(
    `UPDATE assignments SET title=COALESCE($1,title), description=COALESCE($2,description),
     due_date=COALESCE($3,due_date), max_marks=COALESCE($4,max_marks), status=COALESCE($5,status),
     attachment_url=COALESCE($6,attachment_url), updated_at=NOW()
     WHERE id=$7 AND institute_id=$8`,
    [title, description, due_date, max_marks, status, attachment_url, req.params.id, instId]
  );

  const { rows } = await query('SELECT * FROM assignments WHERE id=$1', [req.params.id]);
  res.json({ success: true, data: { assignment: rows[0] } });
}));

// DELETE /api/assignments/:id
router.delete('/:id', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const existing = await query('SELECT id FROM assignments WHERE id=$1 AND institute_id=$2', [req.params.id, instId]);
  if (!existing.rows[0]) throw new AppError('Assignment not found', 404);

  await query('DELETE FROM assignments WHERE id=$1', [req.params.id]);
  res.json({ success: true, message: 'Assignment deleted' });
}));

// ── Submissions ──

// POST /api/assignments/:id/submit — student submits
router.post('/:id/submit', authorize('student'), asyncHandler(async (req, res) => {
  const instId = req.instituteId;
  const sr = await query('SELECT id, class_id FROM students WHERE user_id=$1 AND institute_id=$2', [req.user.id, instId]);
  if (!sr.rows[0]) throw new AppError('Student profile not found', 404);

  const asgn = await query('SELECT * FROM assignments WHERE id=$1 AND institute_id=$2', [req.params.id, instId]);
  if (!asgn.rows[0]) throw new AppError('Assignment not found', 404);

  const { content, attachment_url } = req.body;
  const id = `sub_${randomUUID().replace(/-/g, '').substring(0, 10)}`;
  const isLate = new Date() > new Date(asgn.rows[0].due_date);

  await query(
    `INSERT INTO assignment_submissions (id, institute_id, assignment_id, student_id, content, attachment_url, status, submitted_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
     ON CONFLICT (assignment_id, student_id) DO UPDATE SET content=$5, attachment_url=$6, status=$7, submitted_at=NOW()`,
    [id, instId, req.params.id, sr.rows[0].id, content || null, attachment_url || null, isLate ? 'late' : 'submitted']
  );

  res.json({ success: true, message: 'Assignment submitted' });
}));

// PUT /api/assignments/:assignmentId/submissions/:submissionId/grade — teacher grades
router.put('/:assignmentId/submissions/:submissionId/grade',
  authorize('institute_admin', 'class_teacher', 'subject_teacher', 'super_admin'),
  asyncHandler(async (req, res) => {
    const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
    const { marks, feedback } = req.body;
    if (marks === undefined) throw new AppError('marks required', 400);

    const sub = await query('SELECT * FROM assignment_submissions WHERE id=$1 AND institute_id=$2', [req.params.submissionId, instId]);
    if (!sub.rows[0]) throw new AppError('Submission not found', 404);

    await query(
      `UPDATE assignment_submissions SET marks_obtained=$1, feedback=$2, graded_by=$3, graded_at=NOW(), status='graded', updated_at=NOW()
       WHERE id=$4 AND institute_id=$5`,
      [marks, feedback || null, req.user.id, req.params.submissionId, instId]
    );

    const { rows } = await query('SELECT * FROM assignment_submissions WHERE id=$1', [req.params.submissionId]);
    res.json({ success: true, data: { submission: rows[0] } });
  })
);

export default router;
