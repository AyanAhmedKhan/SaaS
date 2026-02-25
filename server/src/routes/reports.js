import { Router } from 'express';
import { query } from '../db/connection.js';
import { authenticate, requireInstitute } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticate, requireInstitute);

// GET /api/reports/exam-results — with proper FK joins
router.get('/exam-results', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const { student_id, exam_id, subject_id, class_id } = req.query;
  const params = [instId];

  let sql = `SELECT er.*, s.name AS student_name, s.roll_number,
             c.name AS class_name, c.section,
             sub.name AS subject_name, e.name AS exam_name, e.exam_type
             FROM exam_results er
             JOIN students s ON er.student_id = s.id
             JOIN classes c ON s.class_id = c.id
             JOIN exams e ON er.exam_id = e.id
             LEFT JOIN subjects sub ON e.subject_id = sub.id
             WHERE er.institute_id = $1`;

  if (student_id) { params.push(student_id); sql += ` AND er.student_id = $${params.length}`; }
  if (exam_id) { params.push(exam_id); sql += ` AND er.exam_id = $${params.length}`; }
  if (subject_id) { params.push(subject_id); sql += ` AND e.subject_id = $${params.length}`; }
  if (class_id) { params.push(class_id); sql += ` AND s.class_id = $${params.length}`; }

  sql += ' ORDER BY e.exam_date DESC, sub.name';
  const { rows } = await query(sql, params);
  res.json({ success: true, data: { results: rows } });
}));

// GET /api/reports/performance-trend — exam-over-exam trend
router.get('/performance-trend', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const { student_id, class_id } = req.query;
  const params = [instId];

  let where = 'er.institute_id = $1';
  if (student_id) { params.push(student_id); where += ` AND er.student_id = $${params.length}`; }
  if (class_id) { params.push(class_id); where += ` AND s.class_id = $${params.length}`; }

  const { rows } = await query(
    `SELECT e.name AS exam, sub.name AS subject,
       ROUND(AVG(er.marks_obtained::NUMERIC / NULLIF(e.total_marks,0) * 100), 1) AS avg_score,
       MIN(e.exam_date) AS exam_date
     FROM exam_results er
     JOIN exams e ON er.exam_id = e.id
     LEFT JOIN subjects sub ON e.subject_id = sub.id
     JOIN students s ON er.student_id = s.id
     WHERE ${where}
     GROUP BY e.name, sub.name, e.exam_date ORDER BY e.exam_date`,
    params
  );

  // pivot by exam
  const examMap = {};
  for (const r of rows) {
    if (!examMap[r.exam]) examMap[r.exam] = { exam: r.exam };
    examMap[r.exam][r.subject] = parseFloat(r.avg_score);
  }
  const performanceTrend = Object.values(examMap).map(e => {
    const subjects = Object.keys(e).filter(k => k !== 'exam');
    const avg = subjects.reduce((s, k) => s + e[k], 0) / (subjects.length || 1);
    return { ...e, average: Math.round(avg * 10) / 10 };
  });

  res.json({ success: true, data: { performanceTrend } });
}));

// GET /api/reports/class-summary — per-class multi-tenant overview
router.get('/class-summary', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;

  const { rows } = await query(
    `SELECT c.id, c.name AS class_name, c.section,
       COUNT(DISTINCT s.id) AS student_count,
       (SELECT ROUND(COUNT(*) FILTER (WHERE ar.status='present')::NUMERIC/NULLIF(COUNT(*),0)*100,1)
        FROM attendance_records ar WHERE ar.class_id=c.id) AS avg_attendance,
       (SELECT ROUND(AVG(er.marks_obtained::NUMERIC/NULLIF(e2.total_marks,0)*100),1)
        FROM exam_results er JOIN exams e2 ON er.exam_id=e2.id JOIN students st ON er.student_id=st.id WHERE st.class_id=c.id) AS avg_performance
     FROM classes c
     LEFT JOIN students s ON s.class_id=c.id AND s.status='active'
     WHERE c.institute_id=$1
     GROUP BY c.id, c.name, c.section ORDER BY c.name, c.section`,
    [instId]
  );

  res.json({ success: true, data: { summary: rows } });
}));

// GET /api/reports/report-card/:studentId — full report card
router.get('/report-card/:studentId', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const { studentId } = req.params;
  const { exam_id } = req.query;

  const student = await query(
    `SELECT s.*, c.name AS class_name, c.section FROM students s
     JOIN classes c ON s.class_id = c.id
     WHERE s.id = $1 AND s.institute_id = $2`,
    [studentId, instId]
  );
  if (!student.rows[0]) throw new AppError('Student not found', 404);

  let examWhere = 'er.student_id = $1 AND er.institute_id = $2';
  const params = [studentId, instId];
  if (exam_id) { params.push(exam_id); examWhere += ` AND er.exam_id = $${params.length}`; }

  const results = await query(
    `SELECT er.*, sub.name AS subject_name, e.name AS exam_name, e.exam_type
     FROM exam_results er
     JOIN exams e ON er.exam_id = e.id
     LEFT JOIN subjects sub ON e.subject_id = sub.id
     WHERE ${examWhere}
     ORDER BY e.exam_date DESC, sub.name`,
    params
  );

  const attendance = await query(
    `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='present') AS present,
       ROUND(COUNT(*) FILTER (WHERE status='present')::NUMERIC/NULLIF(COUNT(*),0)*100,1) AS percentage
     FROM attendance_records WHERE student_id=$1 AND institute_id=$2`,
    [studentId, instId]
  );

  const remarks = await query(
    'SELECT * FROM teacher_remarks WHERE student_id=$1 AND institute_id=$2 ORDER BY created_at DESC LIMIT 5',
    [studentId, instId]
  );

  res.json({
    success: true,
    data: {
      student: student.rows[0],
      examResults: results.rows,
      attendance: attendance.rows[0],
      remarks: remarks.rows,
    },
  });
}));

// GET /api/reports/fee-summary — institute-wide fee overview
router.get('/fee-summary', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;

  const { rows } = await query(
    `SELECT fs.fee_type, fs.class_id, COALESCE(c.name, 'All Classes') AS class_name,
       COUNT(DISTINCT s.id) AS total_students,
       fs.amount AS fee_amount,
       COALESCE(SUM(fp.paid_amount),0) AS total_collected,
       fs.amount * COUNT(DISTINCT s.id) - COALESCE(SUM(fp.paid_amount),0) AS total_pending
     FROM fee_structures fs
     LEFT JOIN classes c ON fs.class_id = c.id
     LEFT JOIN students s ON (s.class_id = c.id OR fs.class_id IS NULL) AND s.institute_id = fs.institute_id AND s.status='active'
     LEFT JOIN fee_payments fp ON fp.fee_structure_id = fs.id AND fp.student_id = s.id AND fp.status='paid'
     WHERE fs.institute_id = $1
     GROUP BY fs.id, fs.fee_type, fs.class_id, c.name, fs.amount
     ORDER BY c.name NULLS LAST, fs.fee_type`,
    [instId]
  );
  res.json({ success: true, data: { feeSummary: rows } });
}));

export default router;
