import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

router.get('/kpis', async (req, res, next) => {
  try {
    const projectId = req.query.project_id || null;
    const params = [req.orgId, projectId];
    const projectFilter = projectId ? 'AND project_id = $2' : '';
    const interactionProjectFilter = projectId ? 'AND i.project_id = $2' : '';

    const [
      activePatients,
      interactionsToday,
      newLeadsToday,
      urgentLeads,
      avgCompleteness,
      pipelineCounts,
      medianReviewHours,
      signalCounts,
    ] = await Promise.all([
      query(
        `SELECT COUNT(*)::INT AS count FROM patients WHERE organization_id = $1 ${projectFilter} AND status = 'active'`,
        params,
      ),
      query(
        `SELECT COUNT(*)::INT AS count FROM interactions i WHERE i.organization_id = $1 ${interactionProjectFilter} AND i.interaction_at::DATE = CURRENT_DATE`,
        params,
      ),
      query(
        `SELECT COUNT(*)::INT AS count FROM safety_leads WHERE organization_id = $1 ${projectFilter} AND received_at::DATE = CURRENT_DATE`,
        params,
      ),
      query(
        `SELECT COUNT(*)::INT AS count FROM safety_leads WHERE organization_id = $1 ${projectFilter} AND urgency IN ('urgent','critical') AND status NOT LIKE 'closed_%' AND status <> 'exported'`,
        params,
      ),
      query(
        `SELECT COALESCE(ROUND(AVG(completeness_score)),0)::INT AS value FROM safety_leads WHERE organization_id = $1 ${projectFilter}`,
        params,
      ),
      query(
        `
          SELECT status, COUNT(*)::INT AS count
          FROM safety_leads
          WHERE organization_id = $1 ${projectFilter}
          GROUP BY status
          ORDER BY status
        `,
        params,
      ),
      query(
        `
          SELECT COALESCE(
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (
              ORDER BY EXTRACT(EPOCH FROM (first_reviewed_at - received_at))/3600
            )::NUMERIC, 1),
            0
          ) AS value
          FROM safety_leads
          WHERE organization_id = $1 ${projectFilter}
            AND first_reviewed_at IS NOT NULL
        `,
        params,
      ),
      query(
        `
          SELECT signal_status, COUNT(*)::INT AS count
          FROM signals
          WHERE organization_id = $1 ${projectId ? 'AND project_id = $2' : ''}
          GROUP BY signal_status
        `,
        params,
      ),
    ]);

    res.json({
      active_patients: activePatients.rows[0].count,
      interactions_today: interactionsToday.rows[0].count,
      new_leads_today: newLeadsToday.rows[0].count,
      urgent_leads: urgentLeads.rows[0].count,
      median_review_hours: Number(medianReviewHours.rows[0].value),
      avg_completeness: avgCompleteness.rows[0].value,
      pipeline_counts: pipelineCounts.rows,
      signal_counts: signalCounts.rows,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
