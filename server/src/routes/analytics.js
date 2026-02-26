import { Router } from 'express';
import { query } from '../db/connection.js';
import { authenticate, authorize, requireInstitute } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticate, requireInstitute, authorize('institute_admin', 'super_admin'));

// ────────────────────────────────────────────────────────────
//  GET /api/analytics/overview — Institute-wide KPIs
// ────────────────────────────────────────────────────────────
router.get('/overview', asyncHandler(async (req, res) => {
    const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;

    const [students, teachers, classes, attendance, fees, exams, recentActivity] = await Promise.all([
        // Student counts
        query(`SELECT
            COUNT(*) FILTER (WHERE status='active') AS active,
            COUNT(*) FILTER (WHERE status='inactive') AS inactive,
            COUNT(*) FILTER (WHERE status='graduated') AS graduated,
            COUNT(*) AS total
            FROM students WHERE institute_id=$1`, [instId]),

        // Teacher counts
        query(`SELECT
            COUNT(*) FILTER (WHERE status='active') AS active,
            COUNT(*) AS total
            FROM teachers WHERE institute_id=$1`, [instId]),

        // Class count
        query(`SELECT COUNT(*) AS total FROM classes c
            JOIN academic_years ay ON c.academic_year_id=ay.id
            WHERE c.institute_id=$1 AND ay.is_current=true`, [instId]),

        // Today's attendance summary
        query(`SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status='present') AS present,
            COUNT(*) FILTER (WHERE status='absent') AS absent,
            COUNT(*) FILTER (WHERE status='late') AS late
            FROM attendance_records WHERE institute_id=$1 AND date=CURRENT_DATE`, [instId]),

        // Fee collection summary
        query(`SELECT
            COALESCE(SUM(paid_amount),0) AS total_collected,
            COUNT(*) FILTER (WHERE status='paid') AS paid_count,
            COUNT(*) FILTER (WHERE status='pending') AS pending_count
            FROM fee_payments WHERE institute_id=$1`, [instId]),

        // Exam stats
        query(`SELECT
            COUNT(*) AS total_exams,
            COUNT(*) FILTER (WHERE status='completed') AS completed,
            ROUND(AVG(CASE WHEN e.total_marks > 0 THEN er.marks_obtained::NUMERIC/e.total_marks*100 END)::numeric,1) AS avg_score
            FROM exams e LEFT JOIN exam_results er ON e.id=er.exam_id
            WHERE e.institute_id=$1`, [instId]),

        // Recent audit activity (last 24h)
        query(`SELECT action, COUNT(*) AS count FROM audit_logs
            WHERE institute_id=$1 AND created_at > NOW() - INTERVAL '24 hours'
            GROUP BY action ORDER BY count DESC LIMIT 10`, [instId]),
    ]);

    res.json({
        success: true,
        data: {
            students: students.rows[0],
            teachers: teachers.rows[0],
            classes: { total: parseInt(classes.rows[0].total) },
            today_attendance: attendance.rows[0],
            fees: fees.rows[0],
            exams: exams.rows[0],
            recent_activity: recentActivity.rows,
        },
    });
}));

// ────────────────────────────────────────────────────────────
//  GET /api/analytics/students/performance — Exam performance
// ────────────────────────────────────────────────────────────
router.get('/students/performance', asyncHandler(async (req, res) => {
    const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
    const { class_id, exam_id, subject_id } = req.query;
    const params = [instId];

    // Grade distribution
    let gradeSql = `SELECT er.grade, COUNT(*) AS count
        FROM exam_results er
        JOIN exams e ON er.exam_id=e.id
        WHERE er.institute_id=$1 AND er.grade IS NOT NULL`;

    if (class_id) { params.push(class_id); gradeSql += ` AND e.class_id=$${params.length}`; }
    if (exam_id) { params.push(exam_id); gradeSql += ` AND er.exam_id=$${params.length}`; }
    if (subject_id) { params.push(subject_id); gradeSql += ` AND e.subject_id=$${params.length}`; }
    gradeSql += ' GROUP BY er.grade ORDER BY er.grade';

    // Score distribution (buckets)
    const bucketParams = [instId];
    let bucketSql = `SELECT
        COUNT(*) FILTER (WHERE pct >= 90) AS excellent,
        COUNT(*) FILTER (WHERE pct >= 75 AND pct < 90) AS good,
        COUNT(*) FILTER (WHERE pct >= 60 AND pct < 75) AS average,
        COUNT(*) FILTER (WHERE pct >= 33 AND pct < 60) AS below_avg,
        COUNT(*) FILTER (WHERE pct < 33) AS failing
        FROM (
            SELECT er.marks_obtained::NUMERIC / NULLIF(e.total_marks,0) * 100 AS pct
            FROM exam_results er JOIN exams e ON er.exam_id=e.id
            WHERE er.institute_id=$1
        ) sub`;

    // Pass/fail rate
    const passFailParams = [instId];
    let passFailSql = `SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE er.marks_obtained >= e.passing_marks) AS passed,
        COUNT(*) FILTER (WHERE er.marks_obtained < e.passing_marks) AS failed
        FROM exam_results er JOIN exams e ON er.exam_id=e.id
        WHERE er.institute_id=$1`;

    // Top/bottom performers
    const topParams = [instId];
    const topSql = `SELECT s.name, s.roll_number, c.name AS class_name, c.section,
        ROUND(AVG(er.marks_obtained::NUMERIC / NULLIF(e.total_marks,0) * 100)::numeric, 1) AS avg_percentage
        FROM exam_results er
        JOIN exams e ON er.exam_id=e.id
        JOIN students s ON er.student_id=s.id
        JOIN classes c ON s.class_id=c.id
        WHERE er.institute_id=$1
        GROUP BY s.id, s.name, s.roll_number, c.name, c.section
        ORDER BY avg_percentage DESC LIMIT 10`;

    const [gradeRes, bucketRes, passFailRes, topRes] = await Promise.all([
        query(gradeSql, params),
        query(bucketSql, bucketParams),
        query(passFailSql, passFailParams),
        query(topSql, topParams),
    ]);

    res.json({
        success: true,
        data: {
            grade_distribution: gradeRes.rows,
            score_buckets: bucketRes.rows[0],
            pass_fail: passFailRes.rows[0],
            top_performers: topRes.rows,
        },
    });
}));

// ────────────────────────────────────────────────────────────
//  GET /api/analytics/students/at-risk — At-risk students
// ────────────────────────────────────────────────────────────
router.get('/students/at-risk', asyncHandler(async (req, res) => {
    const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;

    const { rows } = await query(`
        SELECT s.id, s.name, s.roll_number, c.name AS class_name, c.section,
            att.attendance_pct,
            exam.avg_score,
            CASE
                WHEN att.attendance_pct < 60 AND exam.avg_score < 40 THEN 'critical'
                WHEN att.attendance_pct < 75 OR exam.avg_score < 50 THEN 'warning'
                ELSE 'ok'
            END AS risk_level
        FROM students s
        JOIN classes c ON s.class_id=c.id
        LEFT JOIN (
            SELECT student_id,
                ROUND(COUNT(*) FILTER (WHERE status='present')::NUMERIC / NULLIF(COUNT(*),0) * 100, 1) AS attendance_pct
            FROM attendance_records WHERE institute_id=$1
            GROUP BY student_id
        ) att ON att.student_id=s.id
        LEFT JOIN (
            SELECT er.student_id,
                ROUND(AVG(er.marks_obtained::NUMERIC / NULLIF(e.total_marks,0) * 100)::numeric, 1) AS avg_score
            FROM exam_results er JOIN exams e ON er.exam_id=e.id
            WHERE er.institute_id=$1
            GROUP BY er.student_id
        ) exam ON exam.student_id=s.id
        WHERE s.institute_id=$1 AND s.status='active'
            AND (att.attendance_pct < 75 OR exam.avg_score < 50)
        ORDER BY risk_level DESC, att.attendance_pct ASC
        LIMIT 50
    `, [instId]);

    const summary = {
        critical: rows.filter(r => r.risk_level === 'critical').length,
        warning: rows.filter(r => r.risk_level === 'warning').length,
    };

    res.json({ success: true, data: { at_risk_students: rows, summary } });
}));

// ────────────────────────────────────────────────────────────
//  GET /api/analytics/attendance/trends — Attendance over time
// ────────────────────────────────────────────────────────────
router.get('/attendance/trends', asyncHandler(async (req, res) => {
    const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
    const { class_id, days = '30' } = req.query;
    const params = [instId, parseInt(days)];

    let sql = `SELECT date,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status='present') AS present,
        COUNT(*) FILTER (WHERE status='absent') AS absent,
        COUNT(*) FILTER (WHERE status='late') AS late,
        ROUND(COUNT(*) FILTER (WHERE status='present')::NUMERIC / NULLIF(COUNT(*),0) * 100, 1) AS attendance_rate
        FROM attendance_records
        WHERE institute_id=$1 AND date >= CURRENT_DATE - ($2 || ' days')::INTERVAL`;

    if (class_id) { params.push(class_id); sql += ` AND class_id=$${params.length}`; }
    sql += ' GROUP BY date ORDER BY date';

    const { rows } = await query(sql, params);
    res.json({ success: true, data: { trends: rows } });
}));

// ────────────────────────────────────────────────────────────
//  GET /api/analytics/attendance/heatmap — Day-of-week × class
// ────────────────────────────────────────────────────────────
router.get('/attendance/heatmap', asyncHandler(async (req, res) => {
    const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;

    const { rows } = await query(`
        SELECT c.name AS class_name, c.section,
            EXTRACT(DOW FROM ar.date)::INTEGER AS day_of_week,
            ROUND(COUNT(*) FILTER (WHERE ar.status='present')::NUMERIC / NULLIF(COUNT(*),0) * 100, 1) AS rate
        FROM attendance_records ar
        JOIN classes c ON ar.class_id=c.id
        WHERE ar.institute_id=$1 AND ar.date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY c.name, c.section, EXTRACT(DOW FROM ar.date)
        ORDER BY c.name, c.section, day_of_week
    `, [instId]);

    res.json({ success: true, data: { heatmap: rows } });
}));

// ────────────────────────────────────────────────────────────
//  GET /api/analytics/fees/collection — Fee revenue analytics
// ────────────────────────────────────────────────────────────
router.get('/fees/collection', asyncHandler(async (req, res) => {
    const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;

    const [byType, monthly, summary] = await Promise.all([
        // Revenue by fee type
        query(`SELECT fs.fee_type,
            SUM(fp.paid_amount) AS collected,
            fs.amount * COUNT(DISTINCT s.id) AS expected,
            COUNT(DISTINCT fp.student_id) AS paying_students
            FROM fee_structures fs
            LEFT JOIN fee_payments fp ON fp.fee_structure_id=fs.id AND fp.status='paid'
            LEFT JOIN students s ON s.class_id=fs.class_id AND s.status='active'
            WHERE fs.institute_id=$1
            GROUP BY fs.fee_type, fs.amount
            ORDER BY collected DESC`, [instId]),

        // Monthly collection trend
        query(`SELECT DATE_TRUNC('month', fp.payment_date) AS month,
            SUM(fp.paid_amount) AS amount,
            COUNT(*) AS payment_count
            FROM fee_payments fp WHERE fp.institute_id=$1 AND fp.status='paid'
            GROUP BY DATE_TRUNC('month', fp.payment_date)
            ORDER BY month DESC LIMIT 12`, [instId]),

        // Overall summary
        query(`SELECT
            COALESCE(SUM(paid_amount) FILTER (WHERE status='paid'),0) AS total_collected,
            COALESCE(SUM(paid_amount) FILTER (WHERE status='pending'),0) AS total_pending,
            COUNT(DISTINCT student_id) FILTER (WHERE status='paid') AS students_paid,
            COUNT(DISTINCT student_id) FILTER (WHERE status='pending') AS students_pending
            FROM fee_payments WHERE institute_id=$1`, [instId]),
    ]);

    res.json({
        success: true,
        data: {
            by_type: byType.rows,
            monthly_trend: monthly.rows,
            summary: summary.rows[0],
        },
    });
}));

// ────────────────────────────────────────────────────────────
//  GET /api/analytics/fees/defaulters — Fee defaulter list
// ────────────────────────────────────────────────────────────
router.get('/fees/defaulters', asyncHandler(async (req, res) => {
    const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;

    const { rows } = await query(`
        SELECT s.id, s.name, s.roll_number, c.name AS class_name, c.section,
            SUM(fs.amount) AS total_due,
            COALESCE(SUM(fp.paid_amount) FILTER (WHERE fp.status='paid'), 0) AS total_paid,
            SUM(fs.amount) - COALESCE(SUM(fp.paid_amount) FILTER (WHERE fp.status='paid'), 0) AS pending_amount
        FROM students s
        JOIN classes c ON s.class_id=c.id
        JOIN fee_structures fs ON fs.class_id=c.id AND fs.institute_id=$1 AND fs.is_active=true
        LEFT JOIN fee_payments fp ON fp.student_id=s.id AND fp.fee_structure_id=fs.id
        WHERE s.institute_id=$1 AND s.status='active'
        GROUP BY s.id, s.name, s.roll_number, c.name, c.section
        HAVING SUM(fs.amount) > COALESCE(SUM(fp.paid_amount) FILTER (WHERE fp.status='paid'), 0)
        ORDER BY pending_amount DESC
        LIMIT 50
    `, [instId]);

    res.json({ success: true, data: { defaulters: rows } });
}));

// ────────────────────────────────────────────────────────────
//  GET /api/analytics/exams/distribution — Score distributions
// ────────────────────────────────────────────────────────────
router.get('/exams/distribution', asyncHandler(async (req, res) => {
    const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
    const { exam_id } = req.query;
    if (!exam_id) throw new AppError('exam_id required', 400);

    const [distribution, stats] = await Promise.all([
        // Histogram: 10-point buckets
        query(`SELECT
            FLOOR(er.marks_obtained::NUMERIC / NULLIF(e.total_marks,0) * 10) * 10 AS bucket,
            COUNT(*) AS count
            FROM exam_results er JOIN exams e ON er.exam_id=e.id
            WHERE er.institute_id=$1 AND er.exam_id=$2
            GROUP BY bucket ORDER BY bucket`, [instId, exam_id]),

        // Stats
        query(`SELECT
            COUNT(*) AS total_students,
            ROUND(AVG(er.marks_obtained)::numeric,1) AS mean,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY er.marks_obtained) AS median,
            MIN(er.marks_obtained) AS min_score,
            MAX(er.marks_obtained) AS max_score,
            ROUND(STDDEV(er.marks_obtained)::numeric,2) AS std_dev,
            COUNT(*) FILTER (WHERE er.marks_obtained >= e.passing_marks) AS passed,
            COUNT(*) FILTER (WHERE er.marks_obtained < e.passing_marks) AS failed
            FROM exam_results er JOIN exams e ON er.exam_id=e.id
            WHERE er.institute_id=$1 AND er.exam_id=$2`, [instId, exam_id]),
    ]);

    res.json({
        success: true,
        data: {
            histogram: distribution.rows.map(r => ({
                range: `${r.bucket}-${parseInt(r.bucket) + 10}%`,
                count: parseInt(r.count),
            })),
            statistics: stats.rows[0],
        },
    });
}));

// ────────────────────────────────────────────────────────────
//  GET /api/analytics/exams/comparison — Cross-exam comparison
// ────────────────────────────────────────────────────────────
router.get('/exams/comparison', asyncHandler(async (req, res) => {
    const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
    const { class_id } = req.query;
    const params = [instId];

    let sql = `SELECT e.id, e.name, e.exam_type, e.exam_date,
        sub.name AS subject_name,
        COUNT(er.id) AS students_appeared,
        ROUND(AVG(er.marks_obtained::NUMERIC / NULLIF(e.total_marks,0) * 100)::numeric, 1) AS avg_percentage,
        ROUND(MIN(er.marks_obtained::NUMERIC / NULLIF(e.total_marks,0) * 100), 1) AS min_pct,
        ROUND(MAX(er.marks_obtained::NUMERIC / NULLIF(e.total_marks,0) * 100), 1) AS max_pct,
        COUNT(*) FILTER (WHERE er.marks_obtained >= e.passing_marks)::NUMERIC / NULLIF(COUNT(*),0) * 100 AS pass_rate
        FROM exams e
        LEFT JOIN exam_results er ON e.id=er.exam_id
        LEFT JOIN subjects sub ON e.subject_id=sub.id
        WHERE e.institute_id=$1`;

    if (class_id) { params.push(class_id); sql += ` AND e.class_id=$${params.length}`; }
    sql += ` GROUP BY e.id, e.name, e.exam_type, e.exam_date, sub.name
             ORDER BY e.exam_date DESC LIMIT 20`;

    const { rows } = await query(sql, params);
    res.json({ success: true, data: { exams: rows } });
}));

// ────────────────────────────────────────────────────────────
//  GET /api/analytics/teachers/workload — Teacher workload
// ────────────────────────────────────────────────────────────
router.get('/teachers/workload', asyncHandler(async (req, res) => {
    const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;

    const { rows } = await query(`
        SELECT t.id, t.name, t.email, t.designation,
            COUNT(DISTINCT ta.class_id) AS class_count,
            COUNT(DISTINCT ta.subject_id) AS subject_count,
            COUNT(DISTINCT ta.id) AS assignment_count,
            COALESCE(tt_data.total_periods, 0) AS weekly_periods,
            COALESCE(remark_data.remark_count, 0) AS remarks_given
        FROM teachers t
        LEFT JOIN teacher_assignments ta ON ta.teacher_id=t.id AND ta.institute_id=$1
        LEFT JOIN (
            SELECT teacher_id, COUNT(*) AS total_periods
            FROM timetable WHERE institute_id=$1
            GROUP BY teacher_id
        ) tt_data ON tt_data.teacher_id=t.id
        LEFT JOIN (
            SELECT teacher_id, COUNT(*) AS remark_count
            FROM teacher_remarks WHERE institute_id=$1
            GROUP BY teacher_id
        ) remark_data ON remark_data.teacher_id=t.id
        WHERE t.institute_id=$1 AND t.status='active'
        GROUP BY t.id, t.name, t.email, t.designation, tt_data.total_periods, remark_data.remark_count
        ORDER BY assignment_count DESC
    `, [instId]);

    res.json({ success: true, data: { teachers: rows } });
}));

// ────────────────────────────────────────────────────────────
//  GET /api/analytics/syllabus/progress — Syllabus completion
// ────────────────────────────────────────────────────────────
router.get('/syllabus/progress', asyncHandler(async (req, res) => {
    const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;

    const { rows } = await query(`
        SELECT c.name AS class_name, c.section, sub.name AS subject_name,
            COUNT(*) AS total_topics,
            COUNT(*) FILTER (WHERE sy.status='completed') AS completed,
            COUNT(*) FILTER (WHERE sy.status='in_progress') AS in_progress,
            COUNT(*) FILTER (WHERE sy.status='not_started') AS not_started,
            ROUND(AVG(sy.completion_percentage)::numeric, 1) AS avg_completion
        FROM syllabus sy
        JOIN classes c ON sy.class_id=c.id
        JOIN subjects sub ON sy.subject_id=sub.id
        WHERE sy.institute_id=$1
        GROUP BY c.name, c.section, sub.name
        ORDER BY avg_completion ASC
    `, [instId]);

    res.json({ success: true, data: { progress: rows } });
}));

// ────────────────────────────────────────────────────────────
//  GET /api/analytics/growth — Enrollment trends over time
// ────────────────────────────────────────────────────────────
router.get('/growth', asyncHandler(async (req, res) => {
    const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;

    const [studentGrowth, teacherGrowth] = await Promise.all([
        query(`SELECT DATE_TRUNC('month', created_at) AS month,
            COUNT(*) AS new_students,
            SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', created_at)) AS cumulative
            FROM students WHERE institute_id=$1
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY month DESC LIMIT 12`, [instId]),

        query(`SELECT DATE_TRUNC('month', created_at) AS month,
            COUNT(*) AS new_teachers,
            SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', created_at)) AS cumulative
            FROM teachers WHERE institute_id=$1
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY month DESC LIMIT 12`, [instId]),
    ]);

    res.json({
        success: true,
        data: {
            student_growth: studentGrowth.rows,
            teacher_growth: teacherGrowth.rows,
        },
    });
}));

// ────────────────────────────────────────────────────────────
//  GET /api/analytics/audit-trail — Filtered audit log viewer
// ────────────────────────────────────────────────────────────
router.get('/audit-trail', asyncHandler(async (req, res) => {
    const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
    const { action, entity_type, user_id, page = '1', limit = '50' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [instId];

    let sql = `SELECT al.*, u.name AS user_name, u.email AS user_email
        FROM audit_logs al LEFT JOIN users u ON al.user_id=u.id
        WHERE al.institute_id=$1`;

    if (action) { params.push(action); sql += ` AND al.action=$${params.length}`; }
    if (entity_type) { params.push(entity_type); sql += ` AND al.entity_type=$${params.length}`; }
    if (user_id) { params.push(user_id); sql += ` AND al.user_id=$${params.length}`; }

    const countSql = sql.replace(/SELECT al\.\*.*?FROM/, 'SELECT COUNT(*) FROM');
    sql += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const [dataRes, countRes] = await Promise.all([
        query(sql, params),
        query(countSql, params.slice(0, -2)),
    ]);

    res.json({
        success: true,
        data: {
            audit_logs: dataRes.rows,
            pagination: {
                page: parseInt(page), limit: parseInt(limit),
                total: parseInt(countRes.rows[0].count),
                totalPages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit)),
            },
        },
    });
}));

// ────────────────────────────────────────────────────────────
//  GET /api/analytics/export/:type — Data export (JSON/CSV)
// ────────────────────────────────────────────────────────────
router.get('/export/:type', asyncHandler(async (req, res) => {
    const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
    const { type } = req.params;
    const { format = 'json' } = req.query;

    const validTypes = ['students', 'teachers', 'attendance', 'exam_results', 'fee_payments', 'audit_logs'];
    if (!validTypes.includes(type)) {
        throw new AppError(`Invalid export type. Valid: ${validTypes.join(', ')}`, 400);
    }

    let sql;
    switch (type) {
        case 'students':
            sql = `SELECT s.name, s.email, s.roll_number, s.gender, s.phone, s.status,
                c.name AS class_name, c.section, s.admission_date, s.date_of_birth,
                s.parent_name, s.parent_email, s.parent_phone
                FROM students s LEFT JOIN classes c ON s.class_id=c.id
                WHERE s.institute_id=$1 ORDER BY c.name, s.roll_number`;
            break;
        case 'teachers':
            sql = `SELECT t.name, t.email, t.phone, t.designation, t.qualification, t.status,
                t.date_of_joining
                FROM teachers t WHERE t.institute_id=$1 ORDER BY t.name`;
            break;
        case 'attendance':
            sql = `SELECT s.name AS student_name, s.roll_number, c.name AS class_name, c.section,
                ar.date, ar.status, ar.remarks
                FROM attendance_records ar
                JOIN students s ON ar.student_id=s.id JOIN classes c ON ar.class_id=c.id
                WHERE ar.institute_id=$1 ORDER BY ar.date DESC, c.name, s.roll_number
                LIMIT 10000`;
            break;
        case 'exam_results':
            sql = `SELECT s.name AS student_name, s.roll_number, e.name AS exam_name,
                e.exam_type, sub.name AS subject_name, er.marks_obtained, e.total_marks,
                er.grade, er.rank, er.is_absent
                FROM exam_results er
                JOIN students s ON er.student_id=s.id JOIN exams e ON er.exam_id=e.id
                LEFT JOIN subjects sub ON e.subject_id=sub.id
                WHERE er.institute_id=$1 ORDER BY e.exam_date DESC, s.name
                LIMIT 10000`;
            break;
        case 'fee_payments':
            sql = `SELECT s.name AS student_name, s.roll_number, fs.name AS fee_name,
                fs.fee_type, fp.paid_amount, fp.payment_date, fp.payment_method, fp.status,
                fp.receipt_number
                FROM fee_payments fp
                JOIN students s ON fp.student_id=s.id
                JOIN fee_structures fs ON fp.fee_structure_id=fs.id
                WHERE fp.institute_id=$1 ORDER BY fp.payment_date DESC
                LIMIT 10000`;
            break;
        case 'audit_logs':
            sql = `SELECT al.action, al.entity_type, al.entity_id, u.name AS user_name,
                al.ip_address, al.created_at
                FROM audit_logs al LEFT JOIN users u ON al.user_id=u.id
                WHERE al.institute_id=$1 ORDER BY al.created_at DESC
                LIMIT 10000`;
            break;
    }

    const { rows } = await query(sql, [instId]);

    if (format === 'csv') {
        if (rows.length === 0) {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${type}_export.csv"`);
            return res.send('No data');
        }
        const headers = Object.keys(rows[0]);
        const csvRows = [headers.join(',')];
        for (const row of rows) {
            csvRows.push(headers.map(h => {
                const val = row[h];
                if (val === null || val === undefined) return '';
                const str = String(val);
                return str.includes(',') || str.includes('"') || str.includes('\n')
                    ? `"${str.replace(/"/g, '""')}"` : str;
            }).join(','));
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${type}_export.csv"`);
        return res.send(csvRows.join('\n'));
    }

    res.json({ success: true, data: { type, count: rows.length, records: rows } });
}));

export default router;
