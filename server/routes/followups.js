import express from 'express';
import { pool, query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { logAudit } from '../lib/audit.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const params = [req.orgId];
    const filters = ['f.organization_id = $1'];
    if (req.query.lead_id) {
      params.push(req.query.lead_id);
      filters.push(`f.lead_id = $${params.length}`);
    }
    if (req.query.status) {
      params.push(req.query.status);
      filters.push(`f.status = $${params.length}`);
    }

    const { rows } = await query(
      `
        SELECT f.*, l.lead_number, l.event_description, p.patient_ref
        FROM follow_up_tasks f
        JOIN safety_leads l ON l.id = f.lead_id
        LEFT JOIN patients p ON p.id = f.patient_id
        WHERE ${filters.join(' AND ')}
        ORDER BY f.due_at ASC NULLS LAST, f.created_at DESC
      `,
      params,
    );

    res.json({ followups: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { rows: leads } = await query(
      'SELECT * FROM safety_leads WHERE id = $1 AND organization_id = $2',
      [req.body.lead_id, req.orgId],
    );
    const lead = leads[0];
    if (!lead) return res.status(404).json({ error: 'Lead not found.' });

    const { rows } = await query(
      `
        INSERT INTO follow_up_tasks
          (organization_id, lead_id, patient_id, reporter_id, task_type,
           question_text, channel, status, due_at, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,'reviewer')
        RETURNING *
      `,
      [
        req.orgId,
        lead.id,
        req.body.patient_id || lead.patient_id,
        req.body.reporter_id || null,
        req.body.task_type || 'question_to_patient',
        req.body.question_text,
        req.body.channel || 'app',
        req.body.due_at || null,
      ],
    );

    await logAudit({
      pool,
      userId: req.user.id,
      orgId: req.orgId,
      projectId: lead.project_id,
      action: 'lead.followup_created',
      entityType: 'follow_up_task',
      entityId: rows[0].id,
      next: rows[0],
      ip: req.ip,
    });

    res.status(201).json({ followup: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { rows: previous } = await query(
      'SELECT * FROM follow_up_tasks WHERE id = $1 AND organization_id = $2',
      [req.params.id, req.orgId],
    );
    if (!previous[0]) return res.status(404).json({ error: 'Follow-up not found.' });

    const responseReceived = req.body.response_text ? 'NOW()' : 'response_received_at';
    const { rows } = await query(
      `
        UPDATE follow_up_tasks
        SET status = COALESCE($1, status),
            response_text = COALESCE($2, response_text),
            response_received_at = ${responseReceived}
        WHERE id = $3 AND organization_id = $4
        RETURNING *
      `,
      [req.body.status || null, req.body.response_text || null, req.params.id, req.orgId],
    );

    if (req.body.response_text) {
      await query(
        `
          INSERT INTO lead_evidence (lead_id, interaction_id, evidence_type)
          SELECT f.lead_id, le.interaction_id, 'follow_up_response'
          FROM follow_up_tasks f
          JOIN lead_evidence le ON le.lead_id = f.lead_id
          WHERE f.id = $1
          LIMIT 1
        `,
        [req.params.id],
      );
    }

    await logAudit({
      pool,
      userId: req.user.id,
      orgId: req.orgId,
      projectId: null,
      action: 'followup.updated',
      entityType: 'follow_up_task',
      entityId: rows[0].id,
      prev: previous[0],
      next: rows[0],
      ip: req.ip,
    });

    res.json({ followup: rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
