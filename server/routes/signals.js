import express from 'express';
import { pool, query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { logAudit } from '../lib/audit.js';
import { computeSignals } from '../jobs/computeSignals.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const params = [req.orgId];
    const filters = ['s.organization_id = $1'];
    if (req.query.project_id) {
      params.push(req.query.project_id);
      filters.push(`s.project_id = $${params.length}`);
    }
    if (req.query.status) {
      params.push(req.query.status);
      filters.push(`s.signal_status = $${params.length}`);
    }

    const { rows } = await query(
      `
        SELECT s.*, p.brand_name AS product_name, u.full_name AS reviewed_by_name
        FROM signals s
        LEFT JOIN products p ON p.id = s.product_id
        LEFT JOIN ss_users u ON u.id = s.reviewed_by
        WHERE ${filters.join(' AND ')}
        ORDER BY
          CASE s.signal_status WHEN 'review' THEN 0 WHEN 'monitor' THEN 1 ELSE 2 END,
          s.prr DESC NULLS LAST
      `,
      params,
    );

    res.json({ signals: rows });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { rows: previous } = await query(
      'SELECT * FROM signals WHERE id = $1 AND organization_id = $2',
      [req.params.id, req.orgId],
    );
    if (!previous[0]) return res.status(404).json({ error: 'Signal not found.' });

    const { rows } = await query(
      `
        UPDATE signals
        SET signal_status = COALESCE($1, signal_status),
            notes = COALESCE($2, notes),
            reviewed_by = $3,
            reviewed_at = NOW()
        WHERE id = $4 AND organization_id = $5
        RETURNING *
      `,
      [
        req.body.signal_status || null,
        req.body.notes || null,
        req.user.id,
        req.params.id,
        req.orgId,
      ],
    );

    await logAudit({
      pool,
      userId: req.user.id,
      orgId: req.orgId,
      projectId: rows[0].project_id,
      action: 'signal.reviewed',
      entityType: 'signal',
      entityId: rows[0].id,
      prev: previous[0],
      next: rows[0],
      ip: req.ip,
    });

    res.json({ signal: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.post('/compute', async (req, res, next) => {
  try {
    if (!req.body.project_id) {
      return res.status(400).json({ error: 'project_id is required.' });
    }
    const rows = await computeSignals(req.orgId, req.body.project_id);
    res.json({ computed: rows.length, signals: rows });
  } catch (error) {
    next(error);
  }
});

export default router;
