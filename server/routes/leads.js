import express from 'express';
import { pool, query, withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { logAudit } from '../lib/audit.js';
import { scoreCompleteness } from '../lib/completeness.js';
import { checkForDuplicate } from '../lib/duplicates.js';
import { validateTransition } from '../lib/stateMachine.js';

const router = express.Router();
const updateFields = [
  'suspected_product',
  'dose',
  'route',
  'concomitant_meds',
  'event_description',
  'suggested_meddra_pt',
  'suggested_meddra_code',
  'onset_date',
  'event_duration',
  'outcome',
  'causality_suggestion',
  'reviewer_notes',
  'assigned_to',
  'medical_reviewer_id',
  'urgency',
];

function statusAction(status) {
  if (status === 'ready_handoff') return 'approved_handoff';
  if (status === 'urgent_review') return 'escalated_urgent';
  if (status === 'needs_followup') return 'requested_followup';
  if (status === 'in_medical_review') return 'assigned_medical';
  if (status === 'closed_non_pv') return 'closed_non_pv';
  if (status === 'closed_duplicate') return 'closed_duplicate';
  if (status === 'closed_insufficient') return 'closed_insufficient';
  return 'edited_field';
}

async function getLead(id, orgId, runner = { query }) {
  const { rows } = await runner.query(
    `
      SELECT
        l.*,
        p.patient_ref, p.age_group AS patient_age_group, p.sex AS patient_sex,
        p.country AS patient_country, p.language AS patient_language,
        pr.brand_name, pr.generic_name,
        assignee.full_name AS assigned_to_name,
        reviewer.full_name AS medical_reviewer_name
      FROM safety_leads l
      LEFT JOIN patients p ON p.id = l.patient_id
      LEFT JOIN products pr ON pr.id = l.product_id
      LEFT JOIN ss_users assignee ON assignee.id = l.assigned_to
      LEFT JOIN ss_users reviewer ON reviewer.id = l.medical_reviewer_id
      WHERE l.id = $1 AND l.organization_id = $2
    `,
    [id, orgId],
  );
  return rows[0] || null;
}

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const params = [req.orgId];
    const filters = ['l.organization_id = $1'];
    const filterMap = {
      project_id: 'l.project_id',
      status: 'l.status',
      urgency: 'l.urgency',
      assigned_to: 'l.assigned_to',
    };

    for (const [key, column] of Object.entries(filterMap)) {
      if (req.query[key]) {
        params.push(req.query[key]);
        filters.push(`${column} = $${params.length}`);
      }
    }

    const { rows } = await query(
      `
        SELECT
          l.id, l.lead_number, l.status, l.urgency, l.is_serious,
          l.seriousness_criteria, l.event_description, l.suggested_meddra_pt,
          l.suggested_meddra_code, l.completeness_score, l.missing_fields,
          l.ai_confidence, l.primary_channel, l.received_at, l.sla_due_at,
          l.assigned_to, p.patient_ref, p.age_group, p.sex, p.country,
          pr.brand_name, u.full_name AS assigned_to_name
        FROM safety_leads l
        LEFT JOIN patients p ON p.id = l.patient_id
        LEFT JOIN products pr ON pr.id = l.product_id
        LEFT JOIN ss_users u ON u.id = l.assigned_to
        WHERE ${filters.join(' AND ')}
        ORDER BY
          CASE l.urgency WHEN 'critical' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END,
          l.sla_due_at ASC NULLS LAST,
          l.received_at DESC
      `,
      params,
    );

    res.json({ leads: rows });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const lead = await getLead(req.params.id, req.orgId);
    if (!lead) return res.status(404).json({ error: 'Lead not found.' });

    const [evidence, followups, decisions] = await Promise.all([
      query(
        `
          SELECT
            le.id AS evidence_id, le.evidence_type, le.added_at,
            i.id AS interaction_id, i.channel, i.transcript_text, i.language,
            i.interaction_at, r.reporter_type,
            so.id AS observation_id, so.observation_type, so.verbatim_extract,
            so.normalized_term, so.suggested_meddra_pt, so.suggested_meddra_code,
            so.ai_confidence, so.severity_indicator, so.is_serious,
            so.seriousness_criteria, so.is_duplicate_candidate
          FROM lead_evidence le
          JOIN interactions i ON i.id = le.interaction_id
          LEFT JOIN reporters r ON r.id = i.reporter_id
          LEFT JOIN safety_observations so ON so.id = le.observation_id
          WHERE le.lead_id = $1
          ORDER BY i.interaction_at DESC
        `,
        [lead.id],
      ),
      query(
        `
          SELECT *
          FROM follow_up_tasks
          WHERE organization_id = $1 AND lead_id = $2
          ORDER BY due_at ASC NULLS LAST, created_at DESC
        `,
        [req.orgId, lead.id],
      ),
      query(
        `
          SELECT rd.*, u.full_name AS reviewer_name
          FROM review_decisions rd
          LEFT JOIN ss_users u ON u.id = rd.reviewer_id
          WHERE rd.organization_id = $1 AND rd.lead_id = $2
          ORDER BY rd.created_at DESC
        `,
        [req.orgId, lead.id],
      ),
    ]);

    res.json({
      lead,
      evidence: evidence.rows,
      followups: followups.rows,
      review_history: decisions.rows,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const interactionIds = Array.isArray(req.body.interaction_ids)
      ? req.body.interaction_ids
      : [req.body.interaction_id].filter(Boolean);

    if (!interactionIds.length) {
      return res.status(400).json({ error: 'At least one interaction_id is required.' });
    }

    const result = await withTransaction(async (client) => {
      const { rows: interactions } = await client.query(
        `
          SELECT i.*, r.reporter_type
          FROM interactions i
          LEFT JOIN reporters r ON r.id = i.reporter_id
          WHERE i.organization_id = $1 AND i.id = ANY($2::UUID[])
          ORDER BY i.interaction_at ASC
        `,
        [req.orgId, interactionIds],
      );

      if (!interactions.length) {
        const error = new Error('No matching interactions found.');
        error.status = 404;
        throw error;
      }

      const primaryInteraction = interactions[0];
      const { rows: projects } = await client.query(
        'SELECT * FROM pv_projects WHERE id = $1 AND organization_id = $2',
        [primaryInteraction.project_id, req.orgId],
      );
      const project = projects[0];

      const { rows: observations } = await client.query(
        `
          SELECT so.*, r.reporter_type
          FROM safety_observations so
          JOIN interactions i ON i.id = so.interaction_id
          LEFT JOIN reporters r ON r.id = i.reporter_id
          WHERE so.organization_id = $1 AND so.interaction_id = ANY($2::UUID[])
          ORDER BY so.is_serious DESC, so.ai_confidence DESC NULLS LAST
        `,
        [req.orgId, interactionIds],
      );

      if (!observations.length) {
        const error = new Error('No observations available for those interactions.');
        error.status = 422;
        throw error;
      }

      const primaryObservation =
        observations.find((obs) => obs.observation_type === 'adverse_event') || observations[0];

      const { rows: products } = await client.query(
        'SELECT * FROM products WHERE id = $1 AND organization_id = $2',
        [primaryObservation.product_id, req.orgId],
      );
      const product = products[0];

      const draft = {
        patient_id: primaryInteraction.patient_id,
        suspected_product: product
          ? `${product.brand_name}${product.generic_name ? ` (${product.generic_name})` : ''}`
          : null,
        dose: product?.medication_schedule || null,
        event_description: primaryObservation.normalized_term || primaryObservation.verbatim_extract,
        suggested_meddra_pt: primaryObservation.suggested_meddra_pt,
        suggested_meddra_code: primaryObservation.suggested_meddra_code,
        outcome: req.body.outcome || null,
        onset_date: req.body.onset_date || null,
        concomitant_meds: req.body.concomitant_meds || null,
      };

      const completeness = scoreCompleteness(draft, observations);
      const serious = observations.some((obs) => obs.is_serious);
      const seriousnessCriteria = [
        ...new Set(observations.flatMap((obs) => obs.seriousness_criteria || [])),
      ];
      const autoUrgent = serious && project?.auto_escalate_serious;
      const duplicate = await checkForDuplicate(
        req.orgId,
        primaryInteraction.patient_id,
        primaryObservation.suggested_meddra_code,
        client,
      );

      if (duplicate) {
        await client.query(
          `
            UPDATE safety_observations
            SET is_duplicate_candidate = TRUE
            WHERE organization_id = $1 AND interaction_id = ANY($2::UUID[])
          `,
          [req.orgId, interactionIds],
        );
      }

      const { rows: inserted } = await client.query(
        `
          INSERT INTO safety_leads
            (organization_id, project_id, product_id, patient_id,
             status, urgency, is_serious, seriousness_criteria,
             suspected_product, dose, event_description, suggested_meddra_pt,
             suggested_meddra_code, onset_date, outcome, concomitant_meds,
             completeness_score, has_identifiable_patient, has_identifiable_reporter,
             has_suspected_product, has_suspected_event, missing_fields,
             ai_narrative, ai_confidence, primary_channel, primary_language,
             assigned_to, received_at, sla_due_at)
          VALUES
            ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
             $17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,NOW(),
             NOW() + ($28::INT * INTERVAL '1 hour'))
          RETURNING *
        `,
        [
          req.orgId,
          primaryInteraction.project_id,
          primaryObservation.product_id,
          primaryInteraction.patient_id,
          autoUrgent ? 'urgent_review' : 'ai_structured',
          autoUrgent ? 'urgent' : 'standard',
          serious,
          seriousnessCriteria,
          draft.suspected_product,
          draft.dose,
          draft.event_description,
          draft.suggested_meddra_pt,
          draft.suggested_meddra_code,
          draft.onset_date,
          draft.outcome,
          draft.concomitant_meds,
          completeness.score,
          completeness.flags.has_identifiable_patient,
          completeness.flags.has_identifiable_reporter,
          completeness.flags.has_suspected_product,
          completeness.flags.has_suspected_event,
          completeness.missing,
          `${draft.event_description} was detected from patient-generated evidence. Missing fields: ${completeness.missing.join(', ') || 'none'}. Human PV review required.`,
          Math.round(Number(primaryObservation.ai_confidence || 75)),
          primaryInteraction.channel,
          primaryInteraction.language,
          req.body.assigned_to || null,
          project?.sla_hours || 72,
        ],
      );

      const lead = inserted[0];
      for (const observation of observations) {
        await client.query(
          `
            INSERT INTO lead_evidence
              (lead_id, interaction_id, observation_id, evidence_type)
            VALUES ($1,$2,$3,$4)
          `,
          [
            lead.id,
            observation.interaction_id,
            observation.id,
            observation.reporter_type === 'caregiver'
              ? 'caregiver_confirmation'
              : 'primary_interaction',
          ],
        );
      }

      await logAudit({
        client,
        userId: req.user.id,
        orgId: req.orgId,
        projectId: lead.project_id,
        action: 'lead.created',
        entityType: 'safety_lead',
        entityId: lead.id,
        next: lead,
        ip: req.ip,
      });

      return lead;
    });

    res.status(201).json({ lead: result });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const prev = await getLead(req.params.id, req.orgId);
    if (!prev) return res.status(404).json({ error: 'Lead not found.' });

    const updates = [];
    const params = [];
    for (const field of updateFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        params.push(req.body[field]);
        updates.push(`${field} = $${params.length}`);
      }
    }

    if (!updates.length) {
      return res.status(400).json({ error: 'No editable lead fields supplied.' });
    }

    params.push(req.params.id, req.orgId);
    const leadIdParam = params.length - 1;
    const orgParam = params.length;

    const { rows } = await query(
      `
        UPDATE safety_leads
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = $${leadIdParam} AND organization_id = $${orgParam}
        RETURNING *
      `,
      params,
    );

    await logAudit({
      pool,
      userId: req.user.id,
      orgId: req.orgId,
      projectId: prev.project_id,
      action: 'lead.field_edited',
      entityType: 'safety_lead',
      entityId: prev.id,
      prev,
      next: rows[0],
      ip: req.ip,
    });

    res.json({ lead: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/transition', async (req, res, next) => {
  try {
    const { new_status: newStatus, notes } = req.body;
    const result = await withTransaction(async (client) => {
      const prev = await getLead(req.params.id, req.orgId, client);
      if (!prev) {
        const error = new Error('Lead not found.');
        error.status = 404;
        throw error;
      }

      validateTransition(prev.status, newStatus);
      const { rows } = await client.query(
        `
          UPDATE safety_leads
          SET status = $1,
              first_reviewed_at = COALESCE(first_reviewed_at, NOW()),
              updated_at = NOW()
          WHERE id = $2 AND organization_id = $3
          RETURNING *
        `,
        [newStatus, req.params.id, req.orgId],
      );

      await client.query(
        `
          INSERT INTO review_decisions
            (organization_id, lead_id, reviewer_id, action, field_edited, old_value, new_value, notes)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `,
        [
          req.orgId,
          req.params.id,
          req.user.id,
          statusAction(newStatus),
          'status',
          prev.status,
          newStatus,
          notes || null,
        ],
      );

      await logAudit({
        client,
        userId: req.user.id,
        orgId: req.orgId,
        projectId: prev.project_id,
        action: 'lead.status_changed',
        entityType: 'safety_lead',
        entityId: req.params.id,
        prev,
        next: rows[0],
        ip: req.ip,
      });

      return rows[0];
    });

    res.json({ lead: result });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/approve-extraction', async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      const prev = await getLead(req.params.id, req.orgId, client);
      if (!prev) {
        const error = new Error('Lead not found.');
        error.status = 404;
        throw error;
      }

      const nextStatus = prev.status === 'new' ? 'ai_structured' : prev.status;
      if (prev.status !== nextStatus) validateTransition(prev.status, nextStatus);

      const { rows } = await client.query(
        `
          UPDATE safety_leads
          SET status = $1,
              first_reviewed_at = COALESCE(first_reviewed_at, NOW()),
              updated_at = NOW()
          WHERE id = $2 AND organization_id = $3
          RETURNING *
        `,
        [nextStatus, req.params.id, req.orgId],
      );

      await client.query(
        `
          INSERT INTO review_decisions
            (organization_id, lead_id, reviewer_id, action, notes)
          VALUES ($1,$2,$3,'approved_extraction',$4)
        `,
        [req.orgId, req.params.id, req.user.id, req.body.notes || null],
      );

      await logAudit({
        client,
        userId: req.user.id,
        orgId: req.orgId,
        projectId: prev.project_id,
        action: 'lead.approved',
        entityType: 'safety_lead',
        entityId: req.params.id,
        prev,
        next: rows[0],
        ip: req.ip,
      });

      return rows[0];
    });

    res.json({ lead: result });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/request-caregiver', async (req, res, next) => {
  try {
    const lead = await getLead(req.params.id, req.orgId);
    if (!lead) return res.status(404).json({ error: 'Lead not found.' });

    const question =
      req.body.question_text ||
      'Can you confirm the symptom timing, seriousness, and whether medical care was sought?';

    const { rows } = await query(
      `
        INSERT INTO follow_up_tasks
          (organization_id, lead_id, patient_id, task_type, question_text, channel, status, created_by, due_at)
        VALUES ($1,$2,$3,'question_to_caregiver',$4,$5,'pending','reviewer',NOW() + INTERVAL '24 hours')
        RETURNING *
      `,
      [req.orgId, lead.id, lead.patient_id, question, req.body.channel || 'caregiver_app'],
    );

    await query(
      `
        INSERT INTO review_decisions
          (organization_id, lead_id, reviewer_id, action, notes)
        VALUES ($1,$2,$3,'caregiver_prompted',$4)
      `,
      [req.orgId, lead.id, req.user.id, question],
    );

    await logAudit({
      pool,
      userId: req.user.id,
      orgId: req.orgId,
      projectId: lead.project_id,
      action: 'lead.followup_requested',
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

router.post('/:id/escalate', async (req, res, next) => {
  try {
    const lead = await getLead(req.params.id, req.orgId);
    if (!lead) return res.status(404).json({ error: 'Lead not found.' });

    if (lead.status !== 'urgent_review') {
      validateTransition(lead.status, 'urgent_review');
    }

    const { rows } = await query(
      `
        UPDATE safety_leads
        SET urgency = 'critical',
            status = 'urgent_review',
            updated_at = NOW()
        WHERE id = $1 AND organization_id = $2
        RETURNING *
      `,
      [lead.id, req.orgId],
    );

    await query(
      `
        INSERT INTO review_decisions
          (organization_id, lead_id, reviewer_id, action, notes)
        VALUES ($1,$2,$3,'escalated_urgent',$4)
      `,
      [req.orgId, lead.id, req.user.id, req.body.notes || null],
    );

    await logAudit({
      pool,
      userId: req.user.id,
      orgId: req.orgId,
      projectId: lead.project_id,
      action: 'lead.status_changed',
      entityType: 'safety_lead',
      entityId: lead.id,
      prev: lead,
      next: rows[0],
      ip: req.ip,
    });

    res.json({ lead: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/approve-handoff', async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      const lead = await getLead(req.params.id, req.orgId, client);
      if (!lead) {
        const error = new Error('Lead not found.');
        error.status = 404;
        throw error;
      }
      if (lead.status !== 'ready_handoff') validateTransition(lead.status, 'ready_handoff');

      const packetPayload = {
        lead_number: lead.lead_number,
        patient_ref: lead.patient_ref,
        product: lead.suspected_product,
        event: lead.event_description,
        meddra_pt: lead.suggested_meddra_pt,
        meddra_code: lead.suggested_meddra_code,
        seriousness: lead.is_serious ? lead.seriousness_criteria : [],
        narrative: lead.ai_narrative,
      };

      const { rows: packetRows } = await client.query(
        `
          INSERT INTO case_packets
            (organization_id, lead_id, e2b_ready_json, pdf_narrative, line_listing_row,
             export_format, exported_by)
          VALUES ($1,$2,$3,$4,$5,'e2b_r3',$6)
          RETURNING *
        `,
        [
          req.orgId,
          lead.id,
          JSON.stringify(packetPayload),
          lead.ai_narrative,
          JSON.stringify(packetPayload),
          req.user.id,
        ],
      );

      const { rows: leadRows } = await client.query(
        `
          UPDATE safety_leads
          SET status = 'ready_handoff',
              case_packet_id = $1,
              updated_at = NOW()
          WHERE id = $2 AND organization_id = $3
          RETURNING *
        `,
        [packetRows[0].id, lead.id, req.orgId],
      );

      await client.query(
        `
          INSERT INTO review_decisions
            (organization_id, lead_id, reviewer_id, action, notes)
          VALUES ($1,$2,$3,'approved_handoff',$4)
        `,
        [req.orgId, lead.id, req.user.id, req.body.notes || null],
      );

      await logAudit({
        client,
        userId: req.user.id,
        orgId: req.orgId,
        projectId: lead.project_id,
        action: 'lead.approved_handoff',
        entityType: 'case_packet',
        entityId: packetRows[0].id,
        prev: lead,
        next: leadRows[0],
        ip: req.ip,
      });

      return { lead: leadRows[0], packet: packetRows[0] };
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
