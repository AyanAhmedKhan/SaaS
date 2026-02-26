import { Router } from 'express';
import { query } from '../db/connection.js';
import { authenticate, requireInstitute } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticate, requireInstitute);

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Admin / Institute-Admin dashboard ──
router.get('/stats', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  if (!instId) throw new AppError('institute_id required', 400);

  const [students, teachers, parents, attendance, fees, notices] = await Promise.all([
    query("SELECT COUNT(*) AS c FROM students WHERE institute_id=$1 AND status='active'", [instId]),
    query("SELECT COUNT(*) AS c FROM teachers WHERE institute_id=$1 AND status='active'", [instId]),
    query("SELECT COUNT(*) AS c FROM users WHERE institute_id=$1 AND role='parent' AND is_active=true", [instId]),
    query(`SELECT ROUND(COUNT(*) FILTER (WHERE status='present')::NUMERIC*100/NULLIF(COUNT(*),0),1) AS avg
           FROM attendance_records WHERE institute_id=$1`, [instId]),
    query(`SELECT COALESCE(SUM(fs.amount)-SUM(COALESCE(fp.total_paid,0)),0) AS pending
           FROM fee_structures fs
           LEFT JOIN (SELECT fee_structure_id, SUM(paid_amount) AS total_paid FROM fee_payments WHERE institute_id=$1 AND status='paid' GROUP BY fee_structure_id) fp ON fp.fee_structure_id=fs.id
           WHERE fs.institute_id=$1`, [instId]),
    query("SELECT COUNT(*) AS c FROM notices WHERE institute_id=$1 AND created_at >= CURRENT_DATE", [instId]),
  ]);

  // Monthly attendance trend
  const monthlyAtt = await query(
    `SELECT EXTRACT(MONTH FROM date::date)::int AS m,
       ROUND(COUNT(*) FILTER (WHERE status='present')::NUMERIC*100/NULLIF(COUNT(*),0),0) AS att
     FROM attendance_records WHERE institute_id=$1
     GROUP BY EXTRACT(MONTH FROM date::date) ORDER BY m`,
    [instId]
  );
  const attendanceData = monthlyAtt.rows.map(r => ({ month: MONTH_NAMES[r.m - 1], attendance: parseFloat(r.att) }));

  // Performance by subject
  const perf = await query(
    `SELECT sub.name AS subject, ROUND(AVG(er.marks_obtained::NUMERIC/NULLIF(e.total_marks,0)*100)::numeric,0) AS score
     FROM exam_results er
     JOIN exams e ON er.exam_id=e.id
     JOIN subjects sub ON e.subject_id=sub.id
     WHERE er.institute_id=$1
     GROUP BY sub.name ORDER BY sub.name`,
    [instId]
  );
  const performanceData = perf.rows.map(r => ({ subject: r.subject, score: parseFloat(r.score) }));

  // Recent students
  const recentStudents = await query(
    `SELECT s.*, c.name AS class_name, c.section FROM students s
     LEFT JOIN classes c ON s.class_id=c.id
     WHERE s.institute_id=$1 ORDER BY s.created_at DESC LIMIT 5`, [instId]
  );

  // Recent notices
  const recentNotices = await query(
    'SELECT * FROM notices WHERE institute_id=$1 ORDER BY created_at DESC LIMIT 4', [instId]
  );

  // Class overview
  const classOverview = await query(
    `SELECT c.id, c.name, c.section,
       COUNT(DISTINCT s.id) AS student_count,
       t.name AS class_teacher_name
     FROM classes c
     LEFT JOIN students s ON s.class_id=c.id AND s.status='active'
     LEFT JOIN teachers t ON c.class_teacher_id=t.id
     WHERE c.institute_id=$1
     GROUP BY c.id, c.name, c.section, t.name
     ORDER BY c.name, c.section`, [instId]
  );

  res.json({
    success: true,
    data: {
      stats: {
        totalStudents: parseInt(students.rows[0].c),
        totalTeachers: parseInt(teachers.rows[0].c),
        totalParents: parseInt(parents.rows[0].c),
        averageAttendance: parseFloat(attendance.rows[0].avg) || 0,
        pendingFees: parseFloat(fees.rows[0].pending) || 0,
        upcomingEvents: parseInt(notices.rows[0].c),
      },
      attendanceData,
      performanceData,
      recentStudents: recentStudents.rows,
      recentNotices: recentNotices.rows,
      classOverview: classOverview.rows,
    },
  });
}));

// ── Teacher dashboard ──
router.get('/teacher', asyncHandler(async (req, res) => {
  const instId = req.instituteId;
  const teacherRes = await query('SELECT id FROM teachers WHERE user_id=$1 AND institute_id=$2', [req.user.id, instId]);
  if (!teacherRes.rows[0]) throw new AppError('Teacher profile not found', 404);
  const tid = teacherRes.rows[0].id;

  const [assignedClasses, todayAttendance, upcomingAssignments, recentNotices] = await Promise.all([
    query(
      `SELECT ta.class_id, c.name AS class_name, c.section, sub.name AS subject_name,
         COUNT(DISTINCT s.id) AS student_count
       FROM teacher_assignments ta
       JOIN classes c ON ta.class_id=c.id
       LEFT JOIN subjects sub ON ta.subject_id=sub.id
       LEFT JOIN students s ON s.class_id=c.id AND s.status='active'
       WHERE ta.teacher_id=$1 AND ta.institute_id=$2
       GROUP BY ta.class_id, c.name, c.section, sub.name`,
      [tid, instId]
    ),
    query(
      `SELECT ar.class_id, c.name AS class_name,
         COUNT(*) FILTER (WHERE ar.status='present') AS present,
         COUNT(*) FILTER (WHERE ar.status='absent') AS absent,
         COUNT(*) AS total
       FROM attendance_records ar JOIN classes c ON ar.class_id=c.id
       WHERE ar.marked_by=$1 AND ar.date=CURRENT_DATE AND ar.institute_id=$2
       GROUP BY ar.class_id, c.name`,
      [req.user.id, instId]
    ),
    query(
      `SELECT a.* FROM assignments a
       JOIN teacher_assignments ta ON a.class_id=ta.class_id AND (a.subject_id=ta.subject_id OR a.subject_id IS NULL)
       WHERE ta.teacher_id=$1 AND a.due_date >= CURRENT_DATE AND a.institute_id=$2
       ORDER BY a.due_date LIMIT 5`,
      [tid, instId]
    ),
    query('SELECT * FROM notices WHERE institute_id=$1 ORDER BY created_at DESC LIMIT 4', [instId]),
  ]);

  res.json({
    success: true,
    data: {
      assignedClasses: assignedClasses.rows,
      todayAttendance: todayAttendance.rows,
      upcomingAssignments: upcomingAssignments.rows,
      recentNotices: recentNotices.rows,
    },
  });
}));

// ── Student dashboard ──
router.get('/student', asyncHandler(async (req, res) => {
  const instId = req.instituteId;
  const stuRes = await query(
    `SELECT s.*, c.name AS class_name, c.section AS class_section, ay.name AS academic_year_name
     FROM students s
     LEFT JOIN classes c ON s.class_id = c.id
     LEFT JOIN academic_years ay ON s.academic_year_id = ay.id
     WHERE s.user_id=$1 AND s.institute_id=$2`,
    [req.user.id, instId]
  );
  if (!stuRes.rows[0]) throw new AppError('Student profile not found', 404);
  const student = stuRes.rows[0];

  const [attendance, recentExams, upcomingAssignments, remarks, notices] = await Promise.all([
    query(
      `SELECT COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status='present') AS present,
         ROUND(COUNT(*) FILTER (WHERE status='present')::NUMERIC/NULLIF(COUNT(*),0)*100,1) AS percentage
       FROM attendance_records WHERE student_id=$1 AND institute_id=$2`,
      [student.id, instId]
    ),
    query(
      `SELECT er.*, e.name AS exam_name, sub.name AS subject_name
       FROM exam_results er
       JOIN exams e ON er.exam_id=e.id
       LEFT JOIN subjects sub ON e.subject_id=sub.id
       WHERE er.student_id=$1 AND er.institute_id=$2
       ORDER BY e.exam_date DESC LIMIT 10`,
      [student.id, instId]
    ),
    query(
      `SELECT a.*, sub.name AS subject_name,
         CASE WHEN asub.id IS NOT NULL THEN 'submitted' ELSE 'pending' END AS submission_status, asub.submitted_at
       FROM assignments a
       LEFT JOIN subjects sub ON a.subject_id=sub.id
       LEFT JOIN assignment_submissions asub ON asub.assignment_id=a.id AND asub.student_id=$1
       WHERE a.class_id=$2 AND a.institute_id=$3 AND a.due_date >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY a.due_date LIMIT 10`,
      [student.id, student.class_id, instId]
    ),
    query(
      `SELECT tr.*, u.name AS teacher_name FROM teacher_remarks tr
       JOIN users u ON tr.teacher_id=(SELECT user_id FROM teachers WHERE id=tr.teacher_id)
       WHERE tr.student_id=$1 AND tr.institute_id=$2 ORDER BY tr.created_at DESC LIMIT 5`,
      [student.id, instId]
    ),
    query("SELECT * FROM notices WHERE institute_id=$1 AND (target_roles IS NULL OR 'student' = ANY(target_roles)) ORDER BY created_at DESC LIMIT 5", [instId]),
  ]);

  res.json({
    success: true,
    data: {
      student,
      attendanceSummary: attendance.rows[0],
      recentExams: recentExams.rows,
      upcomingAssignments: upcomingAssignments.rows,
      recentRemarks: remarks.rows,
      notices: notices.rows,
    },
  });
}));

// ── Parent dashboard ──
router.get('/parent', asyncHandler(async (req, res) => {
  const instId = req.instituteId;
  const children = await query(
    `SELECT s.*, c.name AS class_name, c.section FROM students s
     LEFT JOIN classes c ON s.class_id=c.id
     WHERE s.parent_id=$1 AND s.institute_id=$2 AND s.status='active'`,
    [req.user.id, instId]
  );

  const childData = [];
  for (const child of children.rows) {
    const [att, exams, remarks] = await Promise.all([
      query(
        `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='present') AS present,
           ROUND(COUNT(*) FILTER (WHERE status='present')::NUMERIC/NULLIF(COUNT(*),0)*100,1) AS pct
         FROM attendance_records WHERE student_id=$1`, [child.id]),
      query(
        `SELECT er.marks_obtained, e.total_marks, e.name AS exam_name, sub.name AS subject_name
         FROM exam_results er JOIN exams e ON er.exam_id=e.id LEFT JOIN subjects sub ON e.subject_id=sub.id
         WHERE er.student_id=$1 ORDER BY e.exam_date DESC LIMIT 5`, [child.id]),
      query(
        'SELECT * FROM teacher_remarks WHERE student_id=$1 ORDER BY created_at DESC LIMIT 3', [child.id]),
    ]);
    childData.push({
      student: child,
      attendance: att.rows[0],
      recentExams: exams.rows,
      recentRemarks: remarks.rows,
    });
  }

  const notices = await query(
    "SELECT * FROM notices WHERE institute_id=$1 AND (target_roles IS NULL OR 'parent' = ANY(target_roles)) ORDER BY created_at DESC LIMIT 5",
    [instId]
  );

  res.json({ success: true, data: { children: childData, notices: notices.rows } });
}));

// ── Super Admin overview ──
router.get('/super-admin', asyncHandler(async (req, res) => {
  if (req.user.role !== 'super_admin') throw new AppError('Forbidden', 403);

  const [institutes, users, students] = await Promise.all([
    query("SELECT status, COUNT(*) AS c FROM institutes GROUP BY status"),
    query("SELECT role, COUNT(*) AS c FROM users GROUP BY role"),
    query("SELECT COUNT(*) AS c FROM students WHERE status='active'"),
  ]);

  res.json({
    success: true,
    data: {
      instituteSummary: institutes.rows,
      userSummary: users.rows,
      totalActiveStudents: parseInt(students.rows[0]?.c || 0),
    },
  });
}));

export default router;
