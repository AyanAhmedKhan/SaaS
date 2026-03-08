import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query } from '../db/connection.js';
import { authenticate, authenticateOptional, authorize, logAudit } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = Router();

const slugRegex = /^[a-z0-9_\-]+$/;

// GET /api/plans - list plans (active only for regular users)
router.get('/', authenticateOptional, asyncHandler(async (req, res) => {
  const includeInactive = req.query.include_inactive === 'true' && req.user?.role === 'super_admin';

  const params = [];
  let sql = `
    SELECT id, slug, name, tagline, monthly_price, annual_price,
           max_students, max_teachers, max_admins, max_classes,
           features, is_default, is_active, sort_order, created_at, updated_at
    FROM subscription_plans
  `;

  if (!includeInactive) {
    params.push(true);
    sql += ` WHERE is_active = $${params.length}`;
  }

  sql += ' ORDER BY sort_order ASC, created_at ASC';

  const { rows } = await query(sql, params);
  res.json({ success: true, data: { plans: rows } });
}));

// GET /api/plans/:id - get single plan (super admin)
router.get('/:id', authenticate, authorize('super_admin'), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM subscription_plans WHERE id = $1`,
    [req.params.id]
  );

  if (!rows[0]) {
    throw new AppError('Plan not found', 404);
  }

  res.json({ success: true, data: { plan: rows[0] } });
}));

// POST /api/plans - create custom plan (super admin)
router.post('/', authenticate, authorize('super_admin'), asyncHandler(async (req, res) => {
  const {
    slug,
    name,
    tagline,
    monthly_price,
    annual_price,
    max_students,
    max_teachers,
    max_admins,
    max_classes,
    features,
    sort_order,
  } = req.body;

  if (!name?.trim()) {
    throw new AppError('Plan name is required', 400);
  }

  if (!slug?.trim()) {
    throw new AppError('Plan slug is required', 400);
  }

  const normalizedSlug = String(slug).trim().toLowerCase();
  if (!slugRegex.test(normalizedSlug)) {
    throw new AppError('Plan slug can contain only lowercase letters, numbers, underscores and hyphens', 400);
  }

  const existing = await query('SELECT id FROM subscription_plans WHERE slug = $1', [normalizedSlug]);
  if (existing.rows[0]) {
    throw new AppError('Plan slug already exists', 409);
  }

  const id = `plan_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const safeFeatures = Array.isArray(features) ? features : [];

  const { rows } = await query(
    `INSERT INTO subscription_plans (
      id, slug, name, tagline, monthly_price, annual_price,
      max_students, max_teachers, max_admins, max_classes,
      features, is_default, is_active, sort_order
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10,
      $11, false, true, $12
    )
    RETURNING *`,
    [
      id,
      normalizedSlug,
      String(name).trim(),
      tagline?.trim() || null,
      Number(monthly_price ?? 0),
      Number(annual_price ?? 0),
      Number(max_students ?? 100),
      Number(max_teachers ?? 10),
      Number(max_admins ?? 1),
      Number(max_classes ?? 10),
      JSON.stringify(safeFeatures),
      Number(sort_order ?? 999),
    ]
  );

  await logAudit({
    instituteId: null,
    userId: req.user.id,
    action: 'create',
    entityType: 'subscription_plan',
    entityId: id,
    newValues: rows[0],
    req,
  });

  res.status(201).json({ success: true, data: { plan: rows[0] } });
}));

// PUT /api/plans/:id - update plan (super admin)
router.put('/:id', authenticate, authorize('super_admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await query('SELECT * FROM subscription_plans WHERE id = $1', [id]);
  if (!existing.rows[0]) {
    throw new AppError('Plan not found', 404);
  }

  const {
    slug,
    name,
    tagline,
    monthly_price,
    annual_price,
    max_students,
    max_teachers,
    max_admins,
    max_classes,
    features,
    is_active,
    sort_order,
  } = req.body;

  const fields = [];
  const values = [];
  let idx = 1;

  const addField = (column, value) => {
    if (value !== undefined) {
      fields.push(`${column} = $${idx++}`);
      values.push(value);
    }
  };

  if (slug !== undefined) {
    const normalizedSlug = String(slug).trim().toLowerCase();
    if (!normalizedSlug) {
      throw new AppError('Plan slug cannot be empty', 400);
    }
    if (!slugRegex.test(normalizedSlug)) {
      throw new AppError('Plan slug can contain only lowercase letters, numbers, underscores and hyphens', 400);
    }

    const slugConflict = await query('SELECT id FROM subscription_plans WHERE slug = $1 AND id <> $2', [normalizedSlug, id]);
    if (slugConflict.rows[0]) {
      throw new AppError('Plan slug already exists', 409);
    }

    addField('slug', normalizedSlug);
  }

  if (name !== undefined) {
    if (!String(name).trim()) {
      throw new AppError('Plan name cannot be empty', 400);
    }
    addField('name', String(name).trim());
  }

  addField('tagline', tagline === null ? null : tagline?.trim?.() ?? tagline);
  if (monthly_price !== undefined) addField('monthly_price', Number(monthly_price));
  if (annual_price !== undefined) addField('annual_price', Number(annual_price));
  if (max_students !== undefined) addField('max_students', Number(max_students));
  if (max_teachers !== undefined) addField('max_teachers', Number(max_teachers));
  if (max_admins !== undefined) addField('max_admins', Number(max_admins));
  if (max_classes !== undefined) addField('max_classes', Number(max_classes));
  if (features !== undefined) addField('features', JSON.stringify(Array.isArray(features) ? features : []));

  if (is_active !== undefined) {
    if (existing.rows[0].is_default && is_active === false) {
      throw new AppError('Default plans cannot be deactivated', 400);
    }
    addField('is_active', Boolean(is_active));
  }

  if (sort_order !== undefined) addField('sort_order', Number(sort_order));

  if (!fields.length) {
    throw new AppError('No fields to update', 400);
  }

  values.push(id);
  const { rows } = await query(
    `UPDATE subscription_plans
     SET ${fields.join(', ')}, updated_at = NOW()
     WHERE id = $${idx}
     RETURNING *`,
    values
  );

  await logAudit({
    instituteId: null,
    userId: req.user.id,
    action: 'update',
    entityType: 'subscription_plan',
    entityId: id,
    oldValues: existing.rows[0],
    newValues: rows[0],
    req,
  });

  res.json({ success: true, data: { plan: rows[0] } });
}));

// DELETE /api/plans/:id - soft delete (super admin)
router.delete('/:id', authenticate, authorize('super_admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await query('SELECT * FROM subscription_plans WHERE id = $1', [id]);
  if (!existing.rows[0]) {
    throw new AppError('Plan not found', 404);
  }

  if (existing.rows[0].is_default) {
    throw new AppError('Default plans cannot be deleted', 400);
  }

  if (!existing.rows[0].is_active) {
    res.json({ success: true, message: 'Plan already inactive' });
    return;
  }

  await query(
    'UPDATE subscription_plans SET is_active = false, updated_at = NOW() WHERE id = $1',
    [id]
  );

  await logAudit({
    instituteId: null,
    userId: req.user.id,
    action: 'deactivate',
    entityType: 'subscription_plan',
    entityId: id,
    oldValues: existing.rows[0],
    newValues: { is_active: false },
    req,
  });

  res.json({ success: true, message: 'Plan deactivated successfully' });
}));

export default router;
