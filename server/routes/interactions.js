import express from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { logAudit } from '../lib/audit.js';
import { processInteraction } from '../lib/pvAIEngine.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const params = [req.orgId];
    const filters = ['i.organization_id = $1'];
    if (req.query.project_id) {
      params.push(req.query.project_id);
      filters.push(`i.project_id = $${params.length}`);
    }
    if (req.query.channel) {
      params.push(req.query.channel);
      filters.push(`i.channel = $${params.length}`);
    }
    if (req.query.ai_processed) {
      params.push(req.query.ai_processed === 'true');
      filters.push(`i.ai_processed = $${params.length}`);
    }

    const { rows } = await query(
      `
        SELECT
          i.*, p.patient_ref, r.reporter_type,
          pr.brand_name AS product_name,
          COUNT(so.id)::INT AS observation_count_actual
        FROM interactions i
        LEFT JOIN patients p ON p.id = i.patient_id
        LEFT JOIN reporters r ON r.id = i.reporter_id
        LEFT JOIN pv_projects pj ON pj.id = i.project_id
        LEFT JOIN products pr ON pr.id = pj.product_id
        LEFT JOIN safety_observations so ON so.interaction_id = i.id
        WHERE ${filters.join(' AND ')}
        GROUP BY i.id, p.patient_ref, r.reporter_type, pr.brand_name
        ORDER BY i.interaction_at DESC
        LIMIT 100
      `,
      params,
    );

    res.json({ interactions: rows });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await query(
      `
        SELECT i.*, p.patient_ref, r.reporter_type
        FROM interactions i
        LEFT JOIN patients p ON p.id = i.patient_id
        LEFT JOIN reporters r ON r.id = i.reporter_id
        WHERE i.id = $1 AND i.organization_id = $2
      `,
      [req.params.id, req.orgId],
    );
    const interaction = rows[0];
    if (!interaction) return res.status(404).json({ error: 'Interaction not found.' });

    const observations = await query(
      `
        SELECT *
        FROM safety_observations
        WHERE interaction_id = $1 AND organization_id = $2
        ORDER BY is_serious DESC, ai_confidence DESC NULLS LAST
      `,
      [interaction.id, req.orgId],
    );

    res.json({ interaction, observations: observations.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const result = await withTransaction(async (client) => {
      const { rows: projectRows } = await client.query(
        'SELECT * FROM pv_projects WHERE id = $1 AND organization_id = $2',
        [req.body.project_id, req.orgId],
      );
      const project = projectRows[0];
      if (!project) {
        const error = new Error('Project not found.');
        error.status = 404;
        throw error;
      }

      const { rows: inserted } = await client.query(
        `
          INSERT INTO interactions
            (organization_id, project_id, patient_id, reporter_id, channel,
             transcript_text, audio_reference, language, duration_seconds, interaction_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10::TIMESTAMPTZ,NOW()))
          RETURNING *
        `,
        [
          req.orgId,
          project.id,
          req.body.patient_id || null,
          req.body.reporter_id || null,
          req.body.channel,
          req.body.transcript_text || '',
          req.body.audio_reference || null,
          req.body.language || 'en',
          req.body.duration_seconds || null,
          req.body.interaction_at || null,
        ],
      );

      const processing = await processInteraction(inserted[0], project, client);

      for (const observation of processing.observations) {
        await logAudit({
          client,
          userId: req.user.id,
          orgId: req.orgId,
          projectId: project.id,
          action: 'observation.created',
          entityType: 'safety_observation',
          entityId: observation.id,
          next: observation,
          ip: req.ip,
        });
      }

      return { interaction: inserted[0], observations: processing.observations };
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
