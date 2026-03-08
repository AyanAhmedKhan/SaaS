import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, getClient } from '../db/connection.js';
import { authenticate, authorize, requireInstitute, logAudit, checkFacultyPermission } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticate, requireInstitute);

// ── In-memory metrics cache (TTL 60 s) ──
const metricsCache = new Map();   // key → { data, ts }
const CACHE_TTL = 60_000;
function getCached(key) {
  const entry = metricsCache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  metricsCache.delete(key);
  return null;
}
function setCache(key, data) { metricsCache.set(key, { data, ts: Date.now() }); }
function invalidateCache(examId) {
  for (const k of metricsCache.keys()) { if (k.startsWith(examId + ':')) metricsCache.delete(k); }
}

// ── Exams CRUD ──

// GET /api/exams — list exams
router.get('/', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const { academic_year_id, exam_type, class_id, page = '1', limit = '20' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [instId];

  let sql = `SELECT e.*, ay.name AS academic_year,
             (SELECT COUNT(*) FROM exam_results er WHERE er.exam_id = e.id) AS result_count
             FROM exams e
             LEFT JOIN academic_years ay ON e.academic_year_id = ay.id
             WHERE e.institute_id = $1`;

  if (academic_year_id) { params.push(academic_year_id); sql += ` AND e.academic_year_id = $${params.length}`; }
  if (exam_type) { params.push(exam_type); sql += ` AND e.exam_type = $${params.length}`; }
  if (class_id) { params.push(class_id); sql += ` AND e.class_id = $${params.length}`; }

  const countSql = sql.replace(/SELECT e\.\*.*?FROM/, 'SELECT COUNT(*) FROM');
  sql += ` ORDER BY e.exam_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
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
    `SELECT e.*, ay.name AS academic_year
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
     JOIN exams e2 ON er.exam_id = e2.id
     LEFT JOIN subjects sub ON e2.subject_id = sub.id
     JOIN classes c ON s.class_id = c.id
     WHERE er.exam_id = $1 AND er.institute_id = $2
     ORDER BY sub.name, s.roll_number`,
    [req.params.id, instId]
  );

  res.json({ success: true, data: { exam: exam.rows[0], results: results.rows } });
}));

// POST /api/exams — create exam
router.post('/', authorize('institute_admin', 'faculty', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
  const { name, exam_type, class_id, academic_year_id, subject_id, exam_date, total_marks, passing_marks, weightage } = req.body;
  if (!name || !exam_type || !class_id) throw new AppError('name, exam_type, class_id required', 400);

  // Enforce dynamic manage_exams permission for faculty
  if (req.user.role === 'faculty') {
    let allowed = false;
    const hasGlobalPermission = await checkFacultyPermission(req, class_id, 'manage_exams');

    if (hasGlobalPermission) {
      allowed = true;
    } else if (subject_id) {
      const { rows: tRows } = await query('SELECT id FROM teachers WHERE user_id=$1 AND institute_id=$2', [req.user.id, instId]);
      if (tRows[0]) {
        const { rows } = await query(
          'SELECT 1 FROM teacher_assignments WHERE teacher_id = $1 AND class_id = $2 AND subject_id = $3',
          [tRows[0].id, class_id, subject_id]
        );
        if (rows.length > 0) allowed = true;
      }
    }

    if (!allowed) {
      throw new AppError('You do not have permission to create an exam for this class/subject', 403);
    }
  }

  const id = `exam_${randomUUID().replace(/-/g, '').substring(0, 10)}`;
  await query(
    `INSERT INTO exams (id, institute_id, name, exam_type, class_id, academic_year_id, subject_id, exam_date, total_marks, passing_marks, weightage, created_by, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'scheduled')`,
    [id, instId, name, exam_type, class_id, academic_year_id || null, subject_id || null, exam_date || null, total_marks || 100, passing_marks || 33, weightage || 1.0, req.user.id]
  );

  const { rows } = await query('SELECT * FROM exams WHERE id=$1', [id]);
  await logAudit({ instituteId: instId, userId: req.user.id, action: 'create_exam', entityType: 'exam', entityId: id, req });
  res.status(201).json({ success: true, data: { exam: rows[0] } });
}));

// PUT /api/exams/:id — update exam
router.put('/:id', authorize('institute_admin', 'faculty', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
  const existing = await query('SELECT id, class_id FROM exams WHERE id=$1 AND institute_id=$2', [req.params.id, instId]);
  if (!existing.rows[0]) throw new AppError('Exam not found', 404);

  const { name, exam_type, exam_date, subject_id, total_marks, passing_marks, weightage, status } = req.body;

  // Enforce dynamic manage_exams permission for faculty
  if (req.user.role === 'faculty') {
    let allowed = false;
    const classId = existing.rows[0].class_id;
    const hasGlobalPermission = await checkFacultyPermission(req, classId, 'manage_exams');

    if (hasGlobalPermission) {
      allowed = true;
    } else if (subject_id) {
      const { rows: tRows } = await query('SELECT id FROM teachers WHERE user_id=$1 AND institute_id=$2', [req.user.id, instId]);
      if (tRows[0]) {
        const { rows } = await query(
          'SELECT 1 FROM teacher_assignments WHERE teacher_id = $1 AND class_id = $2 AND subject_id = $3',
          [tRows[0].id, classId, subject_id]
        );
        if (rows.length > 0) allowed = true;
      }
    }

    if (!allowed) {
      throw new AppError('You do not have permission to edit this exam', 403);
    }
  }

  await query(
    `UPDATE exams SET name=COALESCE($1,name), exam_type=COALESCE($2,exam_type),
     exam_date=COALESCE($3,exam_date), subject_id=COALESCE($4,subject_id),
     total_marks=COALESCE($5,total_marks), passing_marks=COALESCE($6,passing_marks),
     weightage=COALESCE($7,weightage), status=COALESCE($8,status), updated_at=NOW()
     WHERE id=$9 AND institute_id=$10`,
    [name, exam_type, exam_date, subject_id, total_marks, passing_marks, weightage, status, req.params.id, instId]
  );

  const { rows } = await query('SELECT * FROM exams WHERE id=$1', [req.params.id]);
  res.json({ success: true, data: { exam: rows[0] } });
}));

// DELETE /api/exams/:id
router.delete('/:id', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const existing = await query('SELECT id, class_id, subject_id FROM exams WHERE id=$1 AND institute_id=$2', [req.params.id, instId]);
  if (!existing.rows[0]) throw new AppError('Exam not found', 404);

  // Enforce dynamic manage_exams permission for faculty
  if (req.user.role === 'faculty') {
    let allowed = false;
    const classId = existing.rows[0].class_id;
    const subjectId = existing.rows[0].subject_id;
    const hasGlobalPermission = await checkFacultyPermission(req, classId, 'manage_exams');

    if (hasGlobalPermission) {
      allowed = true;
    } else if (subjectId) {
      const { rows: tRows } = await query('SELECT id FROM teachers WHERE user_id=$1 AND institute_id=$2', [req.user.id, instId]);
      if (tRows[0]) {
        const { rows } = await query(
          'SELECT 1 FROM teacher_assignments WHERE teacher_id = $1 AND class_id = $2 AND subject_id = $3',
          [tRows[0].id, classId, subjectId]
        );
        if (rows.length > 0) allowed = true;
      }
    }

    if (!allowed) {
      throw new AppError('You do not have permission to delete this exam', 403);
    }
  }

  // cascading delete on exam_results via FK
  await query('DELETE FROM exams WHERE id=$1', [req.params.id]);
  res.json({ success: true, message: 'Exam deleted' });
}));

// ── Exam Results ──

// POST /api/exams/:id/results — bulk enter results
router.post('/:id/results', authorize('institute_admin', 'faculty', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
  const { results } = req.body;
  // results: [{ student_id, marks_obtained, remarks?, is_absent? }]

  if (!Array.isArray(results) || !results.length) throw new AppError('results[] required', 400);

  const exam = await query('SELECT * FROM exams WHERE id=$1 AND institute_id=$2', [req.params.id, instId]);
  if (!exam.rows[0]) throw new AppError('Exam not found', 404);

  // Enforce dynamic manage_exams permission for faculty
  if (req.user.role === 'faculty') {
    let allowed = false;
    const classId = exam.rows[0].class_id;
    const subjectId = exam.rows[0].subject_id;
    const hasGlobalPermission = await checkFacultyPermission(req, classId, 'manage_exams');

    if (hasGlobalPermission) {
      allowed = true;
    } else if (subjectId) {
      const { rows: tRows } = await query('SELECT id FROM teachers WHERE user_id=$1 AND institute_id=$2', [req.user.id, instId]);
      if (tRows[0]) {
        const { rows } = await query(
          'SELECT 1 FROM teacher_assignments WHERE teacher_id = $1 AND class_id = $2 AND subject_id = $3',
          [tRows[0].id, classId, subjectId]
        );
        if (rows.length > 0) allowed = true;
      }
    }

    if (!allowed) {
      throw new AppError('You do not have permission to enter results for this exam', 403);
    }
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    for (const r of results) {
      const id = `er_${randomUUID().replace(/-/g, '').substring(0, 10)}`;
      const totalMarks = exam.rows[0].total_marks || 100;
      const percentage = (r.marks_obtained / totalMarks) * 100;

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
        `INSERT INTO exam_results (id, institute_id, exam_id, student_id, marks_obtained, grade, remarks, is_absent)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (exam_id, student_id)
         DO UPDATE SET marks_obtained=$5, grade=$6, remarks=$7, is_absent=$8, updated_at=NOW()`,
        [id, instId, req.params.id, r.student_id, r.marks_obtained, grade, r.remarks || null, r.is_absent || false]
      );
    }

    // Auto-calculate ranks
    await client.query(
      `WITH ranked AS (
         SELECT id, RANK() OVER (ORDER BY marks_obtained DESC) AS rnk
         FROM exam_results WHERE exam_id=$1 AND institute_id=$2 AND is_absent=false
       )
       UPDATE exam_results er SET rank = r.rnk
       FROM ranked r WHERE er.id = r.id`,
      [req.params.id, instId]
    );

    await client.query('COMMIT');
    invalidateCache(req.params.id);
    await logAudit({ instituteId: instId, userId: req.user.id, action: 'enter_results', entityType: 'exam_results', newValues: { exam_id: req.params.id, count: results.length }, req });
    res.json({ success: true, message: `${results.length} results entered` });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
}));

// GET /api/exams/:id/rank-list — ranked results with percentile
router.get('/:id/rank-list', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;

  const { rows } = await query(
    `SELECT er.*, s.name AS student_name, s.roll_number,
       ROUND(PERCENT_RANK() OVER (ORDER BY er.marks_obtained) * 100)::int AS percentile
     FROM exam_results er
     JOIN students s ON er.student_id = s.id
     WHERE er.exam_id = $1 AND er.institute_id = $2 AND er.is_absent = false
     ORDER BY er.rank`,
    [req.params.id, instId]
  );
  res.json({ success: true, data: { rankList: rows } });
}));

// GET /api/exams/:id/class-students — all students in exam's class for roster
router.get('/:id/class-students', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const exam = await query('SELECT class_id FROM exams WHERE id=$1 AND institute_id=$2', [req.params.id, instId]);
  if (!exam.rows[0]) throw new AppError('Exam not found', 404);

  const { rows } = await query(
    `SELECT s.id AS student_id, s.name AS student_name, s.roll_number
     FROM students s
     WHERE s.class_id = $1 AND s.institute_id = $2 AND s.status = 'active'
     ORDER BY s.roll_number`,
    [exam.rows[0].class_id, instId]
  );
  res.json({ success: true, data: { students: rows } });
}));

// GET /api/exams/:id/metrics — optimised: single CTE query pushes all aggregation into Postgres
router.get('/:id/metrics', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const cacheKey = `${req.params.id}:${instId}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json({ success: true, data: cached });

  // One round-trip: exam meta + all results + window + aggregates
  const { rows } = await query(`
    WITH exam_meta AS (
      SELECT total_marks, passing_marks
      FROM exams
      WHERE id = $1 AND institute_id = $2
    ),
    ranked AS (
      SELECT
        er.student_id,
        er.marks_obtained,
        er.grade,
        er.rank,
        er.is_absent,
        s.name   AS student_name,
        s.roll_number,
        em.total_marks,
        em.passing_marks,
        CASE WHEN er.is_absent OR er.marks_obtained IS NULL THEN NULL
          ELSE ROUND(
            PERCENT_RANK() OVER (
              PARTITION BY (NOT er.is_absent AND er.marks_obtained IS NOT NULL)
              ORDER BY er.marks_obtained
            ) * 100
          )::int
        END AS percentile
      FROM exam_results er
      JOIN students s     ON er.student_id = s.id
      CROSS JOIN exam_meta em
      WHERE er.exam_id = $1 AND er.institute_id = $2
    ),
    agg AS (
      SELECT
        COUNT(*)::int                                                                     AS total_students,
        COUNT(*) FILTER (WHERE is_absent)::int                                           AS absent_cnt,
        COUNT(*) FILTER (WHERE NOT is_absent AND marks_obtained IS NOT NULL)::int        AS present_cnt,
        ROUND(AVG(marks_obtained)      FILTER (WHERE NOT is_absent AND marks_obtained IS NOT NULL)::numeric, 2) AS avg_marks,
        ROUND(STDDEV_POP(marks_obtained) FILTER (WHERE NOT is_absent AND marks_obtained IS NOT NULL)::numeric, 2) AS std_dev,
        MAX(marks_obtained) FILTER (WHERE NOT is_absent AND marks_obtained IS NOT NULL)  AS highest,
        MIN(marks_obtained) FILTER (WHERE NOT is_absent AND marks_obtained IS NOT NULL)  AS lowest,
        ROUND(
          (PERCENTILE_CONT(0.5) WITHIN GROUP (
            ORDER BY CASE WHEN NOT is_absent AND marks_obtained IS NOT NULL
                          THEN marks_obtained END
          ))::numeric, 2
        )                                                                                AS median_marks
      FROM ranked
    )
    SELECT r.*, a.total_students, a.absent_cnt, a.present_cnt,
           a.avg_marks, a.std_dev, a.highest, a.lowest, a.median_marks
    FROM ranked r CROSS JOIN agg a
    ORDER BY r.rank NULLS LAST
  `, [req.params.id, instId]);

  if (!rows.length) {
    return res.json({ success: true, data: {
      totalStudents: 0, absent: 0, present: 0, passed: 0, failed: 0,
      passPercentage: 0, avg: 0, median: 0, stdDev: 0, highest: 0, lowest: 0,
      gradeDist: {}, scoreBands: [
        { label: '0–39%', count: 0 }, { label: '40–59%', count: 0 },
        { label: '60–74%', count: 0 }, { label: '75–89%', count: 0 }, { label: '90–100%', count: 0 },
      ], rankList: [],
    }});
  }

  const { total_students, absent_cnt, present_cnt, avg_marks, std_dev, highest, lowest, median_marks,
          total_marks: totalMarks, passing_marks: passingMarks } = rows[0];

  const present = rows.filter(r => !r.is_absent && r.marks_obtained != null);
  const passed  = present.filter(r => Number(r.marks_obtained) >= Number(passingMarks)).length;

  const gradeDist = {};
  const bands = [
    { label: '0–39%', count: 0 }, { label: '40–59%', count: 0 },
    { label: '60–74%', count: 0 }, { label: '75–89%', count: 0 }, { label: '90–100%', count: 0 },
  ];
  present.forEach(r => {
    if (r.grade) gradeDist[r.grade] = (gradeDist[r.grade] || 0) + 1;
    const pct = (Number(r.marks_obtained) / Number(totalMarks || 100)) * 100;
    if (pct < 40) bands[0].count++;
    else if (pct < 60) bands[1].count++;
    else if (pct < 75) bands[2].count++;
    else if (pct < 90) bands[3].count++;
    else bands[4].count++;
  });

  const metricsData = {
      totalStudents: total_students,
      absent: absent_cnt,
      present: present_cnt,
      passed,
      failed: present_cnt - passed,
      passPercentage: present_cnt ? Math.round((passed / present_cnt) * 100) : 0,
      avg: parseFloat(avg_marks ?? 0),
      median: parseFloat(median_marks ?? 0),
      stdDev: parseFloat(std_dev ?? 0),
      highest: highest ?? 0,
      lowest: lowest ?? 0,
      gradeDist,
      scoreBands: bands,
      rankList: present.map(r => ({
        student_id: r.student_id,
        student_name: r.student_name,
        roll_number: r.roll_number,
        marks_obtained: Number(r.marks_obtained),
        grade: r.grade,
        rank: r.rank,
        percentile: r.percentile,
        percentage: parseFloat(((Number(r.marks_obtained) / Number(totalMarks || 100)) * 100).toFixed(1)),
      })),
    };

  setCache(cacheKey, metricsData);
  res.json({ success: true, data: metricsData });
}));

export default router;
