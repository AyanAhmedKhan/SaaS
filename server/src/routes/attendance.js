import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, getClient } from '../db/connection.js';
import { authenticate, authorize, requireInstitute, logAudit } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticate, requireInstitute);

// ── helper: resolve teacher id if role is teacher ──
async function resolveTeacherId(user) {
  if (user.role === 'class_teacher' || user.role === 'subject_teacher') {
    const r = await query('SELECT id FROM teachers WHERE user_id = $1 AND institute_id = $2', [user.id, user.institute_id]);
    return r.rows[0]?.id || null;
  }
  return null;
}

// GET /api/attendance — list with filters (paginated)
router.get('/', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const { class_id, subject_id, date, student_id, from_date, to_date, page = '1', limit = '100' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let sql = `SELECT ar.*, s.name AS student_name, s.roll_number,
             c.name AS class_name, c.section,
             sub.name AS subject_name, u.name AS marked_by_name
             FROM attendance_records ar
             JOIN students s ON ar.student_id = s.id
             JOIN classes c ON ar.class_id = c.id
             LEFT JOIN subjects sub ON ar.subject_id = sub.id
             LEFT JOIN users u ON ar.marked_by = u.id
             WHERE ar.institute_id = $1`;
  const params = [instId];

  if (class_id) { params.push(class_id); sql += ` AND ar.class_id = $${params.length}`; }
  if (subject_id) { params.push(subject_id); sql += ` AND ar.subject_id = $${params.length}`; }
  if (date) { params.push(date); sql += ` AND ar.date = $${params.length}`; }
  if (student_id) { params.push(student_id); sql += ` AND ar.student_id = $${params.length}`; }
  if (from_date) { params.push(from_date); sql += ` AND ar.date >= $${params.length}`; }
  if (to_date) { params.push(to_date); sql += ` AND ar.date <= $${params.length}`; }

  // scope for teachers — only their assigned classes
  const teacherId = await resolveTeacherId(req.user);
  if (teacherId) {
    params.push(teacherId);
    sql += ` AND ar.class_id IN (SELECT class_id FROM teacher_assignments WHERE teacher_id = $${params.length})`;
  }

  // scope for student role
  if (req.user.role === 'student') {
    const sr = await query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    if (sr.rows[0]) { params.push(sr.rows[0].id); sql += ` AND ar.student_id = $${params.length}`; }
  }

  // scope for parent role — children only
  if (req.user.role === 'parent') {
    params.push(req.user.id);
    sql += ` AND ar.student_id IN (SELECT id FROM students WHERE parent_id = $${params.length})`;
  }

  const countSql = sql.replace(/SELECT ar\.\*.*?FROM/, 'SELECT COUNT(*) FROM');
  sql += ` ORDER BY ar.date DESC, s.roll_number`;
  sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(parseInt(limit), offset);

  const [dataRes, countRes] = await Promise.all([
    query(sql, params),
    query(countSql, params.slice(0, -2)),
  ]);

  res.json({
    success: true,
    data: {
      attendance: dataRes.rows,
      pagination: {
        page: parseInt(page), limit: parseInt(limit),
        total: parseInt(countRes.rows[0].count),
        totalPages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit)),
      },
    },
  });
}));

// GET /api/attendance/summary — per-student summary
router.get('/summary', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const { class_id, student_id, from_date, to_date } = req.query;

  let conditions = 's.institute_id = $1 AND s.status = \'active\'';
  const params = [instId];

  if (class_id) { params.push(class_id); conditions += ` AND s.class_id = $${params.length}`; }
  if (student_id) { params.push(student_id); conditions += ` AND s.id = $${params.length}`; }

  let dateCondition = '';
  if (from_date) { params.push(from_date); dateCondition += ` AND ar.date >= $${params.length}`; }
  if (to_date) { params.push(to_date); dateCondition += ` AND ar.date <= $${params.length}`; }

  const { rows } = await query(
    `SELECT s.id AS student_id, s.name AS student_name, s.roll_number,
       COUNT(ar.id) AS total_days,
       COUNT(*) FILTER (WHERE ar.status = 'present') AS present_days,
       COUNT(*) FILTER (WHERE ar.status = 'absent') AS absent_days,
       COUNT(*) FILTER (WHERE ar.status = 'late') AS late_days,
       COUNT(*) FILTER (WHERE ar.status = 'excused') AS excused_days,
       ROUND(COUNT(*) FILTER (WHERE ar.status = 'present')::NUMERIC / NULLIF(COUNT(ar.id), 0) * 100, 1) AS attendance_percentage
     FROM students s
     LEFT JOIN attendance_records ar ON s.id = ar.student_id ${dateCondition}
     WHERE ${conditions}
     GROUP BY s.id, s.name, s.roll_number
     ORDER BY s.roll_number`,
    params
  );

  res.json({ success: true, data: { summary: rows } });
}));

// GET /api/attendance/subject-wise — per-subject breakdown
router.get('/subject-wise', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const { student_id } = req.query;
  if (!student_id) throw new AppError('student_id query param required', 400);

  const { rows } = await query(
    `SELECT sub.name AS subject_name, sub.id AS subject_id,
       COUNT(*) AS total_classes,
       COUNT(*) FILTER (WHERE ar.status = 'present') AS present,
       COUNT(*) FILTER (WHERE ar.status = 'absent') AS absent,
       ROUND(COUNT(*) FILTER (WHERE ar.status = 'present')::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1) AS percentage
     FROM attendance_records ar
     JOIN subjects sub ON ar.subject_id = sub.id
     WHERE ar.student_id = $1 AND ar.institute_id = $2
     GROUP BY sub.id, sub.name ORDER BY sub.name`,
    [student_id, instId]
  );
  res.json({ success: true, data: { subjectWise: rows } });
}));

// GET /api/attendance/monthly — calendar view data
router.get('/monthly', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const { class_id, student_id, year, month } = req.query;
  const params = [instId];
  let sql = `SELECT ar.date, ar.status, ar.student_id, s.name AS student_name
             FROM attendance_records ar JOIN students s ON ar.student_id = s.id
             WHERE ar.institute_id = $1`;

  if (class_id) { params.push(class_id); sql += ` AND ar.class_id = $${params.length}`; }
  if (student_id) { params.push(student_id); sql += ` AND ar.student_id = $${params.length}`; }
  if (year && month) {
    const pad = String(month).padStart(2, '0');
    params.push(`${year}-${pad}-01`, `${year}-${pad}-31`);
    sql += ` AND ar.date >= $${params.length - 1} AND ar.date <= $${params.length}`;
  }
  sql += ' ORDER BY ar.date';
  const { rows } = await query(sql, params);
  res.json({ success: true, data: { records: rows } });
}));

// POST /api/attendance — bulk mark attendance
router.post('/', authorize('institute_admin', 'class_teacher', 'subject_teacher', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
  const { records, class_id, date, subject_id } = req.body;

  if (!Array.isArray(records) || !records.length || !class_id || !date) {
    throw new AppError('records[], class_id, and date are required', 400);
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    for (const rec of records) {
      const id = `att_${randomUUID().replace(/-/g, '').substring(0, 12)}`;
      await client.query(
        `INSERT INTO attendance_records (id, institute_id, student_id, class_id, subject_id, date, status, marked_by, remarks)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (student_id, date, COALESCE(subject_id, 'general'))
         DO UPDATE SET status=$7, marked_by=$8, remarks=$9, updated_at=NOW()`,
        [id, instId, rec.student_id, class_id, subject_id || null, date, rec.status, req.user.id, rec.remarks || null]
      );
    }
    await client.query('COMMIT');
    await logAudit({ instituteId: instId, userId: req.user.id, action: 'mark_attendance', entityType: 'attendance', newValues: { class_id, date, count: records.length }, req });
    res.json({ success: true, message: `Attendance marked for ${records.length} students` });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
}));

export default router;
