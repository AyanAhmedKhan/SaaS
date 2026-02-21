import { Router } from 'express';
import { query } from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', authenticate, asyncHandler(async (req, res) => {
  try {
    const totalStudentsResult = await query('SELECT COUNT(*) as count FROM students');
    const totalStudents = parseInt(totalStudentsResult.rows[0].count);

    const totalTeachersResult = await query('SELECT COUNT(*) as count FROM teachers');
    const totalTeachers = parseInt(totalTeachersResult.rows[0].count);

    const totalParentsResult = await query("SELECT COUNT(*) as count FROM users WHERE role = 'parent'");
    const totalParents = parseInt(totalParentsResult.rows[0].count);

    // Average attendance from records
    const attendanceResult = await query(`
      SELECT ROUND(
        COUNT(CASE WHEN status = 'present' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0),
        1
      ) as avg_attendance
      FROM attendance_records
    `);

    const pendingFees = 45000; // Placeholder — would come from a fees table

    const upcomingEventsResult = await query(
      'SELECT COUNT(*) as count FROM notices WHERE date >= CURRENT_DATE::text'
    );
    const upcomingEvents = parseInt(upcomingEventsResult.rows[0].count);

    // Monthly attendance data
    const monthlyAttendanceResult = await query(`
      SELECT 
        EXTRACT(MONTH FROM date::date)::int as month_num,
        ROUND(COUNT(CASE WHEN status = 'present' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 0) as attendance
      FROM attendance_records
      GROUP BY EXTRACT(MONTH FROM date::date)
      ORDER BY month_num ASC
    `);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const attendanceData = monthlyAttendanceResult.rows.map(m => ({
      month: monthNames[parseInt(m.month_num) - 1],
      attendance: parseFloat(m.attendance),
    }));

    // Performance by subject
    const performanceResult = await query(`
      SELECT 
        subject,
        ROUND(AVG(score), 0) as score
      FROM exam_results
      GROUP BY subject
      ORDER BY subject ASC
    `);
    const performanceData = performanceResult.rows.map(r => ({
      subject: r.subject,
      score: parseFloat(r.score),
    }));

    // Recent students
    const recentStudentsResult = await query('SELECT * FROM students ORDER BY created_at DESC LIMIT 5');

    // Recent notices
    const recentNoticesResult = await query('SELECT * FROM notices ORDER BY date DESC LIMIT 4');

    res.json({
      success: true,
      data: {
        stats: {
          totalStudents,
          totalTeachers,
          totalParents,
          averageAttendance: parseFloat(attendanceResult.rows[0].avg_attendance) || 0,
          pendingFees,
          upcomingEvents,
        },
        attendanceData,
        performanceData,
        recentStudents: recentStudentsResult.rows,
        recentNotices: recentNoticesResult.rows,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch dashboard stats: ' + error.message, 500);
  }
}));

export default router;
