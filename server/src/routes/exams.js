import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, getClient } from '../db/connection.js';
import { authenticate, authorize, requireInstitute, logAudit } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticate, requireInstitute);

// ── Exams CRUD ──

// GET /api/exams — list exams
router.get('/', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const { academic_year_id, exam_type, class_id, page = '1', limit = '20' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [instId];

  let sql = `SELECT e.*, ay.year_label AS academic_year,
             (SELECT COUNT(*) FROM exam_results er WHERE er.exam_id = e.id) AS result_count
             FROM exams e
             LEFT JOIN academic_years ay ON e.academic_year_id = ay.id
             WHERE e.institute_id = $1`;

  if (academic_year_id) { params.push(academic_year_id); sql += ` AND e.academic_year_id = $${params.length}`; }
  if (exam_type) { params.push(exam_type); sql += ` AND e.exam_type = $${params.length}`; }
  if (class_id) { params.push(class_id); sql += ` AND e.class_id = $${params.length}`; }

  const countSql = sql.replace(/SELECT e\.\*.*?FROM/, 'SELECT COUNT(*) FROM');
  sql += ` ORDER BY e.start_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(parseInt(limit), offset);

  const [dataRes, countRes] = await Promise.all([
    query(sql, params),
    query(countSql, params.slice(0, -2)),
  ]);

  res.json({
    success: true,
    data: {
      exams: dataRes.rows,
      pagination: {
        page: parseInt(page), limit: parseInt(limit),
        total: parseInt(countRes.rows[0].count),
        totalPages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit)),
      },
    },
  });
}));

// GET /api/exams/:id — detail with results
router.get('/:id', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;

  const exam = await query(
    `SELECT e.*, ay.year_label AS academic_year
     FROM exams e LEFT JOIN academic_years ay ON e.academic_year_id = ay.id
     WHERE e.id = $1 AND e.institute_id = $2`,
    [req.params.id, instId]
  );
  if (!exam.rows[0]) throw new AppError('Exam not found', 404);

  const results = await query(
    `SELECT er.*, s.name AS student_name, s.roll_number, sub.name AS subject_name,
       c.name AS class_name, c.section
     FROM exam_results er
     JOIN students s ON er.student_id = s.id
     JOIN subjects sub ON er.subject_id = sub.id
     JOIN classes c ON s.class_id = c.id
     WHERE er.exam_id = $1 AND er.institute_id = $2
     ORDER BY sub.name, s.roll_number`,
    [req.params.id, instId]
  );

  res.json({ success: true, data: { exam: exam.rows[0], results: results.rows } });
}));

// POST /api/exams — create exam
router.post('/', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
  const { name, exam_type, class_id, academic_year_id, start_date, end_date, max_marks, description } = req.body;
  if (!name || !exam_type || !class_id) throw new AppError('name, exam_type, class_id required', 400);

  const id = `exam_${randomUUID().replace(/-/g, '').substring(0, 10)}`;
  await query(
    `INSERT INTO exams (id, institute_id, name, exam_type, class_id, academic_year_id, start_date, end_date, max_marks, description, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'upcoming')`,
    [id, instId, name, exam_type, class_id, academic_year_id||null, start_date||null, end_date||null, max_marks||100, description||null]
  );

  const { rows } = await query('SELECT * FROM exams WHERE id=$1', [id]);
  await logAudit({ instituteId: instId, userId: req.user.id, action: 'create_exam', entityType: 'exam', entityId: id, req });
  res.status(201).json({ success: true, data: { exam: rows[0] } });
}));

// PUT /api/exams/:id — update exam
router.put('/:id', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
  const existing = await query('SELECT id FROM exams WHERE id=$1 AND institute_id=$2', [req.params.id, instId]);
  if (!existing.rows[0]) throw new AppError('Exam not found', 404);

  const { name, exam_type, start_date, end_date, max_marks, status, description } = req.body;
  await query(
    `UPDATE exams SET name=COALESCE($1,name), exam_type=COALESCE($2,exam_type),
     start_date=COALESCE($3,start_date), end_date=COALESCE($4,end_date),
     max_marks=COALESCE($5,max_marks), status=COALESCE($6,status),
     description=COALESCE($7,description), updated_at=NOW()
     WHERE id=$8 AND institute_id=$9`,
    [name, exam_type, start_date, end_date, max_marks, status, description, req.params.id, instId]
  );

  const { rows } = await query('SELECT * FROM exams WHERE id=$1', [req.params.id]);
  res.json({ success: true, data: { exam: rows[0] } });
}));

// DELETE /api/exams/:id
router.delete('/:id', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const existing = await query('SELECT id FROM exams WHERE id=$1 AND institute_id=$2', [req.params.id, instId]);
  if (!existing.rows[0]) throw new AppError('Exam not found', 404);

  // cascading delete on exam_results via FK
  await query('DELETE FROM exams WHERE id=$1', [req.params.id]);
  res.json({ success: true, message: 'Exam deleted' });
}));

// ── Exam Results ──

// POST /api/exams/:id/results — bulk enter results
router.post('/:id/results', authorize('institute_admin', 'class_teacher', 'subject_teacher', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
  const { results } = req.body;
  // results: [{ student_id, subject_id, marks_obtained, max_marks?, remarks? }]

  if (!Array.isArray(results) || !results.length) throw new AppError('results[] required', 400);

  const exam = await query('SELECT * FROM exams WHERE id=$1 AND institute_id=$2', [req.params.id, instId]);
  if (!exam.rows[0]) throw new AppError('Exam not found', 404);

  const client = await getClient();
  try {
    await client.query('BEGIN');

    for (const r of results) {
      const id = `er_${randomUUID().replace(/-/g, '').substring(0, 10)}`;
      const maxMarks = r.max_marks || exam.rows[0].max_marks || 100;
      const percentage = (r.marks_obtained / maxMarks) * 100;

      // Auto-determine grade from grading_systems
      let grade = null;
      const gradeRes = await client.query(
        `SELECT grade FROM grading_systems
         WHERE institute_id=$1 AND $2 >= min_percentage AND $2 <= max_percentage
         ORDER BY min_percentage DESC LIMIT 1`,
        [instId, percentage]
      );
      if (gradeRes.rows[0]) grade = gradeRes.rows[0].grade;

      await client.query(
        `INSERT INTO exam_results (id, institute_id, exam_id, student_id, subject_id, marks_obtained, max_marks, percentage, grade, remarks)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (exam_id, student_id, subject_id)
         DO UPDATE SET marks_obtained=$6, max_marks=$7, percentage=$8, grade=$9, remarks=$10, updated_at=NOW()`,
        [id, instId, req.params.id, r.student_id, r.subject_id, r.marks_obtained, maxMarks, Math.round(percentage * 10) / 10, grade, r.remarks || null]
      );
    }

    // Auto-calculate ranks per subject
    await client.query(
      `WITH ranked AS (
         SELECT id, RANK() OVER (PARTITION BY subject_id ORDER BY marks_obtained DESC) AS rnk
         FROM exam_results WHERE exam_id=$1 AND institute_id=$2
       )
       UPDATE exam_results er SET rank = r.rnk
       FROM ranked r WHERE er.id = r.id`,
      [req.params.id, instId]
    );

    await client.query('COMMIT');
    await logAudit({ instituteId: instId, userId: req.user.id, action: 'enter_results', entityType: 'exam_results', newValues: { exam_id: req.params.id, count: results.length }, req });
    res.json({ success: true, message: `${results.length} results entered` });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
}));

// GET /api/exams/:id/rank-list — ranked results per subject
router.get('/:id/rank-list', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const { subject_id } = req.query;
  const params = [req.params.id, instId];

  let sql = `SELECT er.*, s.name AS student_name, s.roll_number, sub.name AS subject_name
             FROM exam_results er
             JOIN students s ON er.student_id = s.id
             JOIN subjects sub ON er.subject_id = sub.id
             WHERE er.exam_id = $1 AND er.institute_id = $2`;

  if (subject_id) { params.push(subject_id); sql += ` AND er.subject_id = $${params.length}`; }
  sql += ' ORDER BY er.rank';

  const { rows } = await query(sql, params);
  res.json({ success: true, data: { rankList: rows } });
}));

export default router;
