import { Router } from 'express';
import { authenticate, requireInstitute, authorize } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { query } from '../db/connection.js';
import { generateText, chatWithHistory } from '../services/gemini.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// Stricter rate limit for AI endpoints (cost protection)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { success: false, error: { message: 'AI rate limit exceeded. Please wait a moment.', code: 'AI_RATE_LIMITED' } },
});

router.use(authenticate);
router.use(aiLimiter);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/chat  —  Multi-turn chat assistant
// Body: { messages: [{ role: 'user'|'assistant', content: string }] }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/chat', asyncHandler(async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new AppError('messages array is required', 400, 'VALIDATION_ERROR');
  }
  if (messages.length > 40) {
    throw new AppError('Conversation too long. Please start a new chat.', 400, 'VALIDATION_ERROR');
  }

  const todayIST = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full' });

  const systemInstruction = `You are EduYantra AI, an intelligent school management assistant for Indian schools.
You help administrators, teachers, and parents with:
- Student performance analysis and tracking
- Attendance patterns and concerns
- Academic planning and curriculum
- Fee management queries
- Exam schedules and results
- Parent-teacher communication
- General school administration

Current date (IST): ${todayIST}
User role: ${req.user?.role || 'user'}

Be concise, professional, and helpful. Use markdown formatting. 
When listing items, use bullet points. Keep answers under 300 words unless the user asks for detail.
If asked for specific student data, remind the user to use the dedicated analysis features in the dashboard.`;

  const reply = await chatWithHistory(messages, systemInstruction);

  res.json({ success: true, data: { reply } });
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/insights  —  AI-powered institute overview insights
// Requires: institute_admin or super_admin
// ─────────────────────────────────────────────────────────────────────────────
router.post('/insights', requireInstitute, authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.instituteId;

  const [students, attendance, fees, exams, topAbsentees] = await Promise.all([
    query(
      `SELECT
        COUNT(*) FILTER (WHERE status='active') AS active,
        COUNT(*) FILTER (WHERE status='inactive') AS inactive,
        COUNT(*) AS total
       FROM students WHERE institute_id=$1`,
      [instId]
    ),
    query(
      `SELECT
        COUNT(*) AS total_records,
        COUNT(*) FILTER (WHERE status='present') AS present,
        COUNT(*) FILTER (WHERE status='absent') AS absent,
        ROUND(COUNT(*) FILTER (WHERE status='present')::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS rate
       FROM attendance_records
       WHERE institute_id=$1 AND date >= CURRENT_DATE - INTERVAL '30 days'`,
      [instId]
    ),
    query(
      `SELECT
        COALESCE(SUM(total_amount), 0) AS total_fees,
        COALESCE(SUM(paid_amount), 0) AS collected,
        COALESCE(SUM(total_amount - paid_amount), 0) AS pending
       FROM fee_payments WHERE institute_id=$1`,
      [instId]
    ),
    query(
      `SELECT
        COUNT(*) AS total_exams,
        COUNT(*) FILTER (WHERE e.status='completed') AS completed,
        ROUND(AVG(CASE WHEN e.total_marks > 0 THEN er.marks_obtained::numeric/e.total_marks*100 END)::numeric, 1) AS avg_score
       FROM exams e LEFT JOIN exam_results er ON e.id=er.exam_id
       WHERE e.institute_id=$1`,
      [instId]
    ),
    query(
      `SELECT s.full_name, COUNT(*) FILTER (WHERE ar.status='absent') AS absences
       FROM students s JOIN attendance_records ar ON s.id=ar.student_id
       WHERE s.institute_id=$1 AND ar.date >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY s.id, s.full_name
       HAVING COUNT(*) FILTER (WHERE ar.status='absent') >= 5
       ORDER BY absences DESC LIMIT 5`,
      [instId]
    ),
  ]);

  const d = {
    students: students.rows[0],
    attendance: attendance.rows[0],
    fees: fees.rows[0],
    exams: exams.rows[0],
  };

  const fmtINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
  const absenteeList = topAbsentees.rows.map((r) => `  - ${r.full_name}: ${r.absences} absences`).join('\n') || '  None identified';

  const prompt = `You are a school analytics expert. Analyze the following school data and provide actionable insights for the administrator.

SCHOOL METRICS (last 30 days):
Students: ${d.students.active} active | ${d.students.inactive} inactive | ${d.students.total} total
Attendance Rate: ${d.attendance.rate || 0}% (${d.attendance.present} present, ${d.attendance.absent} absent out of ${d.attendance.total_records} records)
Fee Collection: ${fmtINR(d.fees.collected)} collected of ${fmtINR(d.fees.total_fees)} total | Pending: ${fmtINR(d.fees.pending)}
Exams: ${d.exams.total_exams} total | ${d.exams.completed} completed | Average Score: ${d.exams.avg_score || 'N/A'}%
Students with 5+ absences this month:
${absenteeList}

Provide a structured response with:
## Key Observations
(2-3 bullet points on what stands out most)

## Areas of Concern
(specific issues needing immediate action; skip if none)

## Actionable Recommendations
(3-4 concrete steps the admin can take this week)

## What's Going Well
(positive highlights worth acknowledging)

Be specific, practical, and concise. Tailor advice for an Indian school context.`;

  const insights = await generateText(prompt);

  res.json({
    success: true,
    data: {
      insights,
      metrics: d,
      top_absentees: topAbsentees.rows,
    },
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/analyze-student/:id  —  Deep per-student analysis
// ─────────────────────────────────────────────────────────────────────────────
router.post('/analyze-student/:id', requireInstitute, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const instId = req.instituteId;

  const [student, attendance, exams, assignments] = await Promise.all([
    query(
      `SELECT s.full_name, s.roll_number, c.name AS class_name, c.section
       FROM students s LEFT JOIN classes c ON s.class_id=c.id
       WHERE s.id=$1 AND s.institute_id=$2`,
      [id, instId]
    ),
    query(
      `SELECT COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status='present') AS present,
        COUNT(*) FILTER (WHERE status='absent') AS absent,
        ROUND(COUNT(*) FILTER (WHERE status='present')::numeric/NULLIF(COUNT(*),0)*100,1) AS rate
       FROM attendance_records WHERE student_id=$1 AND date >= CURRENT_DATE - INTERVAL '60 days'`,
      [id]
    ),
    query(
      `SELECT sub.name AS subject,
        ROUND(AVG(er.marks_obtained::numeric/NULLIF(e.total_marks,0)*100),1) AS avg_pct
       FROM exam_results er
       JOIN exams e ON er.exam_id=e.id
       LEFT JOIN subjects sub ON e.subject_id=sub.id
       WHERE er.student_id=$1
       GROUP BY sub.name ORDER BY avg_pct ASC`,
      [id]
    ),
    query(
      `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='submitted') AS submitted
       FROM assignment_submissions WHERE student_id=$1`,
      [id]
    ),
  ]);

  if (!student.rows[0]) throw new AppError('Student not found or not in your institute', 404);

  const s = student.rows[0];
  const att = attendance.rows[0];
  const asn = assignments.rows[0];

  const examBreakdown = exams.rows.length
    ? exams.rows.map((r) => `  - ${r.subject || 'Unknown'}: ${r.avg_pct}%`).join('\n')
    : '  - No exam data available';

  const prompt = `Analyze this student's academic performance and provide targeted insights.

STUDENT: ${s.full_name} | Class: ${s.class_name || 'N/A'} ${s.section || ''}

ATTENDANCE (last 60 days): ${att.rate || 0}% (${att.present} present | ${att.absent} absent of ${att.total} school days)

ASSIGNMENT COMPLETION: ${asn.submitted}/${asn.total || 0} submitted

SUBJECT-WISE EXAM AVERAGES:
${examBreakdown}

Provide:
## Performance Summary
(2 sentences overview)

## Strengths
(bullet points — what this student excels at)

## Areas Needing Improvement
(specific subjects/habits; be constructive not critical)

## Recommended Actions
**For Teacher:** (2-3 points)
**For Parents:** (2-3 points)

## Risk Assessment
**Level:** Low / Medium / High
**Reason:** (one sentence)

Be empathetic, specific, and actionable. Do not include the student's name in repeated mentions.`;

  const analysis = await generateText(prompt);

  res.json({
    success: true,
    data: {
      student: s,
      attendance: att,
      assignments: asn,
      exam_breakdown: exams.rows,
      analysis,
    },
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/generate-remark  —  Generate a report-card remark
// Body: { student_name, class_name, attendance_rate, avg_score, subjects_struggling, behavior_notes }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/generate-remark', requireInstitute, authorize('institute_admin', 'teacher'), asyncHandler(async (req, res) => {
  const {
    student_name,
    class_name,
    attendance_rate,
    avg_score,
    subjects_struggling = [],
    behavior_notes = '',
  } = req.body;

  if (!student_name) throw new AppError('student_name is required', 400, 'VALIDATION_ERROR');

  const prompt = `Generate a professional, empathetic, and constructive teacher's remark for a school report card.

Student: ${student_name}
Class: ${class_name || 'N/A'}
Attendance: ${attendance_rate ? attendance_rate + '%' : 'Not specified'}
Average Score: ${avg_score ? avg_score + '%' : 'Not specified'}
Subjects Needing Improvement: ${subjects_struggling.length ? subjects_struggling.join(', ') : 'None'}
Behavior / Additional Notes: ${behavior_notes || 'Well-behaved and cooperative'}

Instructions:
- Write exactly 2-3 sentences
- Be specific to the data provided (not generic)
- Balance encouragement with constructive feedback
- Address areas for improvement gently
- Avoid repeating the student's name in the remark
- Suitable for sharing with parents
- Professional tone appropriate for Indian school context`;

  const remark = await generateText(prompt);

  res.json({ success: true, data: { remark: remark.trim() } });
}));

export default router;
