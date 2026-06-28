import express from 'express';
import { pool, query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { logAudit } from '../lib/audit.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `
        SELECT
          pj.*, pr.brand_name, pr.generic_name,
          u.full_name AS owner_name,
          COUNT(DISTINCT pa.id)::INT AS patient_count,
          COUNT(DISTINCT l.id)::INT AS lead_count
        FROM pv_projects pj
        LEFT JOIN products pr ON pr.id = pj.product_id
        LEFT JOIN ss_users u ON u.id = pj.owner_id
        LEFT JOIN patients pa ON pa.project_id = pj.id
        LEFT JOIN safety_leads l ON l.project_id = pj.id
        WHERE pj.organization_id = $1
        GROUP BY pj.id, pr.brand_name, pr.generic_name, u.full_name
        ORDER BY pj.updated_at DESC
      `,
      [req.orgId],
    );
    res.json({ projects: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `
        INSERT INTO pv_projects
          (organization_id, product_id, name, description, project_type, status,
           countries, languages, channels_enabled, patient_population,
           detect_adverse_events, detect_medication_errors, detect_therapeutic_failure,
           detect_fall_risk, min_completeness_score, sla_hours,
           auto_escalate_serious, owner_id)
        VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        RETURNING *
      `,
      [
        req.orgId,
        req.body.product_id || null,
        req.body.name,
        req.body.description || null,
        req.body.project_type || 'post_market_surveillance',
        req.body.status || 'draft',
        req.body.countries || [],
        req.body.languages || ['en'],
        req.body.channels_enabled || ['app'],
        req.body.patient_population || null,
        req.body.detect_adverse_events ?? true,
        req.body.detect_medication_errors ?? true,
        req.body.detect_therapeutic_failure ?? false,
        req.body.detect_fall_risk ?? false,
        req.body.min_completeness_score || 60,
        req.body.sla_hours || 72,
        req.body.auto_escalate_serious ?? true,
        req.body.owner_id || req.user.id,
      ],
    );

    await logAudit({
      pool,
      userId: req.user.id,
      orgId: req.orgId,
      projectId: rows[0].id,
      action: 'project.created',
      entityType: 'pv_project',
      entityId: rows[0].id,
      next: rows[0],
      ip: req.ip,
    });

    res.status(201).json({ project: rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
