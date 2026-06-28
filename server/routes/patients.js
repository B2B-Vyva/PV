import express from 'express';
import { pool, query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { logAudit } from '../lib/audit.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const params = [req.orgId];
    const filters = ['p.organization_id = $1'];
    if (req.query.project_id) {
      params.push(req.query.project_id);
      filters.push(`p.project_id = $${params.length}`);
    }

    const { rows } = await query(
      `
        SELECT
          p.*, pr.brand_name AS product_name,
          COUNT(DISTINCT i.id)::INT AS interaction_count,
          COUNT(DISTINCT l.id)::INT AS lead_count
        FROM patients p
        LEFT JOIN products pr ON pr.id = p.product_id
        LEFT JOIN interactions i ON i.patient_id = p.id
        LEFT JOIN safety_leads l ON l.patient_id = p.id
        WHERE ${filters.join(' AND ')}
        GROUP BY p.id, pr.brand_name
        ORDER BY p.created_at DESC
      `,
      params,
    );

    res.json({ patients: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `
        INSERT INTO patients
          (organization_id, project_id, product_id, patient_ref, age_group,
           sex, country, language, condition, medication_schedule,
           preferred_channel, caregiver_name, caregiver_consent,
           consent_status, consent_date, status, risk_profile)
        VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        RETURNING *
      `,
      [
        req.orgId,
        req.body.project_id,
        req.body.product_id || null,
        req.body.patient_ref,
        req.body.age_group,
        req.body.sex || 'U',
        req.body.country,
        req.body.language || 'en',
        req.body.condition || null,
        req.body.medication_schedule || null,
        req.body.preferred_channel || 'app',
        req.body.caregiver_name || null,
        req.body.caregiver_consent ?? false,
        req.body.consent_status || 'pending',
        req.body.consent_date || null,
        req.body.status || 'active',
        req.body.risk_profile || {},
      ],
    );

    await logAudit({
      pool,
      userId: req.user.id,
      orgId: req.orgId,
      projectId: rows[0].project_id,
      action: 'patient.consented',
      entityType: 'patient',
      entityId: rows[0].id,
      next: rows[0],
      ip: req.ip,
    });

    res.status(201).json({ patient: rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
