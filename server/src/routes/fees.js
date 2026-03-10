import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, getClient } from '../db/connection.js';
import { authenticate, authorize, requireInstitute, logAudit } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticate, requireInstitute);

// ── Fee Structures ──

// GET /api/fees/structures — list fee structures
router.get('/structures', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const { class_id, academic_year_id, fee_type } = req.query;
  const params = [instId];

  let sql = `SELECT fs.*, fs.frequency, c.name AS class_name, c.section, ay.name AS academic_year
             FROM fee_structures fs
             LEFT JOIN classes c ON fs.class_id = c.id
             LEFT JOIN academic_years ay ON fs.academic_year_id = ay.id
             WHERE fs.institute_id = $1`;

  if (class_id) { params.push(class_id); sql += ` AND fs.class_id = $${params.length}`; }
  if (academic_year_id) { params.push(academic_year_id); sql += ` AND fs.academic_year_id = $${params.length}`; }
  if (fee_type) { params.push(fee_type); sql += ` AND fs.fee_type = $${params.length}`; }

  sql += ' ORDER BY c.name, fs.fee_type';
  const { rows } = await query(sql, params);
  res.json({ success: true, data: { structures: rows } });
}));

// POST /api/fees/structures — create
router.post('/structures', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
  const { name, class_id, academic_year_id, fee_type, amount, frequency, due_date, description, installments_allowed } = req.body;
  if (!fee_type || !amount || !name) throw new AppError('name, fee_type, amount required', 400);

  // Auto-resolve academic_year_id from current year if not provided
  let ayId = academic_year_id;
  if (!ayId) {
    const ayRes = await query("SELECT id FROM academic_years WHERE institute_id=$1 AND is_current=true LIMIT 1", [instId]);
    ayId = ayRes.rows[0]?.id;
  }
  if (!ayId) throw new AppError('academic_year_id required (no current academic year found)', 400);

  const id = `fs_${randomUUID().replace(/-/g, '').substring(0, 10)}`;
  await query(
    `INSERT INTO fee_structures (id, institute_id, class_id, academic_year_id, name, fee_type, amount, frequency, due_date, description, installments_allowed)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [id, instId, class_id || null, ayId, name, fee_type, amount, frequency || 'one_time', due_date || null, description || null, installments_allowed || false]
  );

  const { rows } = await query('SELECT * FROM fee_structures WHERE id=$1', [id]);
  await logAudit({ instituteId: instId, userId: req.user.id, action: 'create_fee_structure', entityType: 'fee_structure', entityId: id, req });
  res.status(201).json({ success: true, data: { structure: rows[0] } });
}));

// PUT /api/fees/structures/:id — update
router.put('/structures/:id', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
  const existing = await query('SELECT id FROM fee_structures WHERE id=$1 AND institute_id=$2', [req.params.id, instId]);
  if (!existing.rows[0]) throw new AppError('Fee structure not found', 404);

  const { name, class_id, fee_type, amount, frequency, due_date, description, installments_allowed } = req.body;
  await query(
    `UPDATE fee_structures SET name=COALESCE($1,name), class_id=COALESCE($2,class_id),
     fee_type=COALESCE($3,fee_type), amount=COALESCE($4,amount), frequency=COALESCE($5,frequency),
     due_date=COALESCE($6,due_date), description=COALESCE($7,description),
     installments_allowed=COALESCE($8,installments_allowed), updated_at=NOW()
     WHERE id=$9 AND institute_id=$10`,
    [name, class_id, fee_type, amount, frequency, due_date, description, installments_allowed, req.params.id, instId]
  );

  const { rows } = await query('SELECT * FROM fee_structures WHERE id=$1', [req.params.id]);
  res.json({ success: true, data: { structure: rows[0] } });
}));

// DELETE /api/fees/structures/:id
router.delete('/structures/:id', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const existing = await query('SELECT id FROM fee_structures WHERE id=$1 AND institute_id=$2', [req.params.id, instId]);
  if (!existing.rows[0]) throw new AppError('Fee structure not found', 404);

  await query('DELETE FROM fee_structures WHERE id=$1', [req.params.id]);
  res.json({ success: true, message: 'Fee structure deleted' });
}));

// ── Fee Payments ──

// GET /api/fees/payments — list payments with filters
router.get('/payments', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const { student_id, class_id, fee_structure_id, status, page = '1', limit = '50' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [instId];

  let sql = `SELECT fp.*, s.name AS student_name, s.roll_number,
             c.name AS class_name, c.section,
             fs.fee_type, fs.amount AS total_fee_amount,
             u.name AS recorded_by_name
             FROM fee_payments fp
             JOIN students s ON fp.student_id = s.id
             JOIN classes c ON s.class_id = c.id
             JOIN fee_structures fs ON fp.fee_structure_id = fs.id
             LEFT JOIN users u ON fp.recorded_by = u.id
             WHERE fp.institute_id = $1`;

  if (student_id) { params.push(student_id); sql += ` AND fp.student_id = $${params.length}`; }
  if (class_id) { params.push(class_id); sql += ` AND s.class_id = $${params.length}`; }
  if (fee_structure_id) { params.push(fee_structure_id); sql += ` AND fp.fee_structure_id = $${params.length}`; }
  if (status) { params.push(status); sql += ` AND fp.status = $${params.length}`; }

  // scope for students/parents
  if (req.user.role === 'student') {
    const sr = await query('SELECT id FROM students WHERE user_id=$1', [req.user.id]);
    if (sr.rows[0]) { params.push(sr.rows[0].id); sql += ` AND fp.student_id = $${params.length}`; }
  }
  if (req.user.role === 'parent') {
    params.push(req.user.id);
    sql += ` AND fp.student_id IN (SELECT id FROM students WHERE parent_id = $${params.length})`;
  }

  const countSql = sql.replace(/SELECT fp\.\*.*?FROM/, 'SELECT COUNT(*) FROM');
  sql += ` ORDER BY fp.paid_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(parseInt(limit), offset);

  const [dataRes, countRes] = await Promise.all([
    query(sql, params),
    query(countSql, params.slice(0, -2)),
  ]);

  res.json({
    success: true,
    data: {
      payments: dataRes.rows,
      pagination: {
        page: parseInt(page), limit: parseInt(limit),
        total: parseInt(countRes.rows[0].count),
        totalPages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit)),
      },
    },
  });
}));

// POST /api/fees/payments — record a payment (manual cash/cheque/UPI)
router.post('/payments', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
  const { student_id, fee_structure_id, paid_amount, payment_method, receipt_number, remarks, due_date, academic_year_id, status } = req.body;
  if (!student_id || !fee_structure_id || paid_amount === undefined) throw new AppError('student_id, fee_structure_id, paid_amount required', 400);

  // Resolve academic_year_id if not provided
  let ayId = academic_year_id;
  if (!ayId) {
    const ayRes = await query("SELECT id FROM academic_years WHERE institute_id=$1 AND is_current=true LIMIT 1", [instId]);
    ayId = ayRes.rows[0]?.id;
  }
  if (!ayId) throw new AppError('academic_year_id required', 400);

  // Get the actual fee structure amount
  const structureRes = await query("SELECT amount FROM fee_structures WHERE id=$1 AND institute_id=$2", [fee_structure_id, instId]);
  if (!structureRes.rows[0]) throw new AppError('Fee structure not found', 404);
  const actualAmount = structureRes.rows[0].amount;

  const id = `pay_${randomUUID().replace(/-/g, '').substring(0, 10)}`;
  await query(
    `INSERT INTO fee_payments (id, institute_id, student_id, fee_structure_id, academic_year_id, amount, paid_amount, due_date, paid_date, payment_method, receipt_number, remarks, recorded_by, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_DATE,$9,$10,$11,$12,$13)`,
    [id, instId, student_id, fee_structure_id, ayId, actualAmount, paid_amount, due_date || new Date().toISOString().split('T')[0], payment_method || 'cash', receipt_number || null, remarks || null, req.user.id, status || 'paid']
  );

  const { rows } = await query('SELECT * FROM fee_payments WHERE id=$1', [id]);
  await logAudit({ instituteId: instId, userId: req.user.id, action: 'record_payment', entityType: 'fee_payment', entityId: id, newValues: { student_id, paid_amount, status }, req });
  res.status(201).json({ success: true, data: { payment: rows[0] } });
}));

// PUT /api/fees/payments/:id — update a payment
router.put('/payments/:id', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.body.institute_id : req.instituteId;
  const existing = await query('SELECT id FROM fee_payments WHERE id=$1 AND institute_id=$2', [req.params.id, instId]);
  if (!existing.rows[0]) throw new AppError('Fee payment not found', 404);

  const { paid_amount, payment_method, receipt_number, remarks, due_date, status } = req.body;

  await query(
    `UPDATE fee_payments SET paid_amount=COALESCE($1,paid_amount), payment_method=COALESCE($2,payment_method),
     receipt_number=COALESCE($3,receipt_number), remarks=COALESCE($4,remarks),
     due_date=COALESCE($5,due_date), status=COALESCE($6,status), updated_at=NOW()
     WHERE id=$7 AND institute_id=$8`,
    [paid_amount, payment_method, receipt_number, remarks, due_date, status, req.params.id, instId]
  );

  const { rows } = await query('SELECT * FROM fee_payments WHERE id=$1', [req.params.id]);
  res.json({ success: true, data: { payment: rows[0] } });
}));

// DELETE /api/fees/payments/:id — delete a payment
router.delete('/payments/:id', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const existing = await query('SELECT id FROM fee_payments WHERE id=$1 AND institute_id=$2', [req.params.id, instId]);
  if (!existing.rows[0]) throw new AppError('Fee payment not found', 404);

  await query('DELETE FROM fee_payments WHERE id=$1', [req.params.id]);
  res.json({ success: true, message: 'Fee payment deleted' });
}));

// GET /api/fees/student/:studentId — student fee overview (dues & payments)
router.get('/student/:studentId', asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const { studentId } = req.params;

  const student = await query('SELECT * FROM students WHERE id=$1 AND institute_id=$2', [studentId, instId]);
  if (!student.rows[0]) throw new AppError('Student not found', 404);

  const dues = await query(
    `SELECT fs.*,
       COALESCE((SELECT SUM(paid_amount) FROM fee_payments WHERE fee_structure_id=fs.id AND student_id=$1 AND status='paid'), 0) AS total_paid,
       fs.amount - COALESCE((SELECT SUM(paid_amount) FROM fee_payments WHERE fee_structure_id=fs.id AND student_id=$1 AND status='paid'), 0) AS pending_amount
     FROM fee_structures fs
     WHERE (fs.class_id = $2 OR fs.class_id IS NULL) AND fs.institute_id = $3
     ORDER BY fs.fee_type`,
    [studentId, student.rows[0].class_id, instId]
  );

  const payments = await query(
    `SELECT fp.*, fs.fee_type FROM fee_payments fp
     JOIN fee_structures fs ON fp.fee_structure_id = fs.id
     WHERE fp.student_id = $1 AND fp.institute_id = $2
     ORDER BY fp.paid_date DESC`,
    [studentId, instId]
  );

  const totalDue = dues.rows.reduce((s, d) => s + parseFloat(d.pending_amount), 0);
  const totalPaid = dues.rows.reduce((s, d) => s + parseFloat(d.total_paid), 0);

  res.json({
    success: true,
    data: {
      student: student.rows[0],
      feeBreakdown: dues.rows,
      payments: payments.rows,
      summary: { totalDue, totalPaid, totalFee: totalDue + totalPaid },
    },
  });
}));

// GET /api/fees/defaulters — list students with pending fees
router.get('/defaulters', authorize('institute_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const instId = req.user.role === 'super_admin' ? req.query.institute_id : req.instituteId;
  const { class_id } = req.query;
  const params = [instId];

  let sql = `SELECT s.id, s.name, s.roll_number, c.name AS class_name, c.section,
             SUM(fs.amount) AS total_fee,
             COALESCE(SUM(paid.total_paid), 0) AS total_paid,
             SUM(fs.amount) - COALESCE(SUM(paid.total_paid), 0) AS pending_amount
             FROM students s
             JOIN classes c ON s.class_id = c.id
             JOIN fee_structures fs ON (fs.class_id = c.id OR fs.class_id IS NULL) AND fs.institute_id = $1
             LEFT JOIN (
               SELECT student_id, fee_structure_id, SUM(paid_amount) AS total_paid
               FROM fee_payments WHERE institute_id = $1 AND status = 'paid'
               GROUP BY student_id, fee_structure_id
             ) paid ON paid.student_id = s.id AND paid.fee_structure_id = fs.id
             WHERE s.institute_id = $1 AND s.status = 'active'`;

  if (class_id) { params.push(class_id); sql += ` AND s.class_id = $${params.length}`; }

  sql += ` GROUP BY s.id, s.name, s.roll_number, c.name, c.section
           HAVING SUM(fs.amount) - COALESCE(SUM(paid.total_paid), 0) > 0
           ORDER BY pending_amount DESC`;

  const { rows } = await query(sql, params);
  res.json({ success: true, data: { defaulters: rows } });
}));

export default router;
