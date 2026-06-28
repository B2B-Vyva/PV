import express from 'express';
import { pool, query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { logAudit } from '../lib/audit.js';
import { toCsv } from '../lib/csv.js';

const router = express.Router();
router.use(requireAuth);

router.post('/e2b', async (req, res, next) => {
  try {
    const params = [req.orgId];
    let projectFilter = '';
    if (req.body.project_id) {
      params.push(req.body.project_id);
      projectFilter = `AND l.project_id = $${params.length}`;
    }

    const { rows } = await query(
      `
        SELECT
          l.lead_number, l.event_description, l.suggested_meddra_pt,
          l.suggested_meddra_code, l.is_serious, l.seriousness_criteria,
          l.suspected_product, l.dose, l.onset_date, l.outcome,
          l.ai_narrative, p.patient_ref, p.age_group, p.sex, p.country,
          pr.brand_name, pr.generic_name
        FROM safety_leads l
        LEFT JOIN patients p ON p.id = l.patient_id
        LEFT JOIN products pr ON pr.id = l.product_id
        WHERE l.organization_id = $1
          ${projectFilter}
          AND l.status IN ('ready_handoff','exported','in_medical_review','urgent_review')
        ORDER BY l.received_at DESC
      `,
      params,
    );

    const payload = {
      target: req.query.target || req.body.target || 'sponsor_safety_system',
      generated_at: new Date().toISOString(),
      format: 'e2b_r3_json_mapping',
      cases: rows.map((row) => ({
        lead_number: row.lead_number,
        patient: {
          ref: row.patient_ref,
          age_group: row.age_group,
          sex: row.sex,
          country: row.country,
        },
        product: {
          brand_name: row.brand_name,
          generic_name: row.generic_name,
          suspected_product: row.suspected_product,
          dose: row.dose,
        },
        event: {
          description: row.event_description,
          meddra_pt: row.suggested_meddra_pt,
          meddra_code: row.suggested_meddra_code,
          onset_date: row.onset_date,
          outcome: row.outcome,
          serious: row.is_serious,
          seriousness_criteria: row.seriousness_criteria,
        },
        narrative: row.ai_narrative,
      })),
    };

    await logAudit({
      pool,
      userId: req.user.id,
      orgId: req.orgId,
      projectId: req.body.project_id || null,
      action: 'packet.exported',
      entityType: 'case_packet',
      entityId: null,
      next: { target: payload.target, count: payload.cases.length },
      ip: req.ip,
    });

    res.setHeader('Content-Disposition', 'attachment; filename="vigil-e2b-export.json"');
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.get('/line-listing', async (req, res, next) => {
  try {
    const params = [req.orgId];
    let projectFilter = '';
    if (req.query.project_id) {
      params.push(req.query.project_id);
      projectFilter = `AND l.project_id = $${params.length}`;
    }

    const { rows } = await query(
      `
        SELECT
          l.lead_number,
          l.status,
          l.urgency,
          p.patient_ref,
          pr.brand_name AS product,
          l.event_description,
          l.suggested_meddra_pt,
          l.suggested_meddra_code,
          l.is_serious,
          l.completeness_score,
          l.received_at,
          l.sla_due_at
        FROM safety_leads l
        LEFT JOIN patients p ON p.id = l.patient_id
        LEFT JOIN products pr ON pr.id = l.product_id
        WHERE l.organization_id = $1 ${projectFilter}
        ORDER BY l.received_at DESC
      `,
      params,
    );

    res.type('text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="vigil-line-listing.csv"');
    res.send(toCsv(rows));
  } catch (error) {
    next(error);
  }
});

router.get('/audit', async (req, res, next) => {
  try {
    const params = [req.orgId];
    const filters = ['a.organization_id = $1'];
    if (req.query.from) {
      params.push(req.query.from);
      filters.push(`a.created_at >= $${params.length}`);
    }
    if (req.query.to) {
      params.push(req.query.to);
      filters.push(`a.created_at <= $${params.length}`);
    }

    const { rows } = await query(
      `
        SELECT
          a.created_at, a.action, a.entity_type, a.entity_id,
          u.email AS user_email, a.ip_address
        FROM audit_log a
        LEFT JOIN ss_users u ON u.id = a.user_id
        WHERE ${filters.join(' AND ')}
        ORDER BY a.created_at DESC
      `,
      params,
    );

    res.type('text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="vigil-audit.csv"');
    res.send(toCsv(rows));
  } catch (error) {
    next(error);
  }
});

export default router;
