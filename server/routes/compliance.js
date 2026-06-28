import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

router.get('/audit-log', async (req, res, next) => {
  try {
    const params = [req.orgId];
    const filters = ['a.organization_id = $1'];
    if (req.query.entity_type) {
      params.push(req.query.entity_type);
      filters.push(`a.entity_type = $${params.length}`);
    }
    if (req.query.action) {
      params.push(req.query.action);
      filters.push(`a.action = $${params.length}`);
    }

    const { rows } = await query(
      `
        SELECT a.*, u.full_name AS user_name, u.email AS user_email
        FROM audit_log a
        LEFT JOIN ss_users u ON u.id = a.user_id
        WHERE ${filters.join(' AND ')}
        ORDER BY a.created_at DESC
        LIMIT 200
      `,
      params,
    );

    res.json({ audit: rows });
  } catch (error) {
    next(error);
  }
});

router.get('/model-versions', async (req, res, next) => {
  try {
    const { rows } = await query(
      `
        SELECT *
        FROM model_versions
        WHERE organization_id = $1 OR organization_id IS NULL
        ORDER BY deployed_at DESC
      `,
      [req.orgId],
    );
    res.json({ model_versions: rows });
  } catch (error) {
    next(error);
  }
});

export default router;
