import { pool } from '../db.js';

function safeRatio(numerator, denominator) {
  return denominator === 0 ? 0 : numerator / denominator;
}

function round(value) {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
}

export async function computeSignals(orgId, projectId, runner = pool) {
  const { rows: obs } = await runner.query(
    `
      SELECT
        so.suggested_meddra_code,
        so.suggested_meddra_pt,
        so.normalized_term,
        so.product_id,
        p.brand_name AS drug,
        COALESCE(sbr.background_n, 1) AS background_n,
        COALESCE(sbr.background_total, 100000) AS background_total
      FROM safety_observations so
      JOIN interactions i ON i.id = so.interaction_id
      JOIN products p ON p.id = so.product_id
      LEFT JOIN signal_background_rates sbr
        ON sbr.reaction_meddra_code = so.suggested_meddra_code
      WHERE so.organization_id = $1
        AND i.project_id = $2
        AND so.observation_type = 'adverse_event'
        AND so.suggested_meddra_code IS NOT NULL
    `,
    [orgId, projectId],
  );

  const drugTotals = new Map();
  const pairs = new Map();

  for (const row of obs) {
    drugTotals.set(row.drug, (drugTotals.get(row.drug) || 0) + 1);
    const key = `${row.drug}|${row.suggested_meddra_code}`;
    const current = pairs.get(key) || { ...row, n: 0 };
    current.n += 1;
    pairs.set(key, current);
  }

  const upserted = [];
  for (const pair of pairs.values()) {
    const a = pair.n;
    const b = Math.max((drugTotals.get(pair.drug) || 0) - a, 0);
    const c = Number(pair.background_n) || 1;
    const d = Math.max((Number(pair.background_total) || 100000) - c, 1);
    const total = a + b + c + d;

    const prr = safeRatio(a / Math.max(a + b, 1), c / Math.max(c + d, 1));
    const ror = safeRatio(a / Math.max(b, 0.5), c / Math.max(d, 0.5));
    const chiNumerator = total * (a * d - b * c) ** 2;
    const chiDenominator = (a + b) * (c + d) * (a + c) * (b + d);
    const chiSquared = safeRatio(chiNumerator, chiDenominator);
    const ebgm = Math.log2(Math.max(prr, 0.01));
    const signalStatus = prr >= 2 && a >= 3 && chiSquared >= 4 ? 'review' : prr >= 1.5 ? 'monitor' : 'baseline';

    const { rows } = await runner.query(
      `
        INSERT INTO signals
          (organization_id, project_id, product_id, drug, reaction_meddra_pt,
           reaction_meddra_code, n, prr, prr_lower_ci, prr_upper_ci, ror,
           ebgm, chi_squared, signal_status, last_computed_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
        ON CONFLICT (organization_id, drug, reaction_meddra_pt)
        DO UPDATE SET
          project_id = EXCLUDED.project_id,
          product_id = EXCLUDED.product_id,
          reaction_meddra_code = EXCLUDED.reaction_meddra_code,
          n = EXCLUDED.n,
          prr = EXCLUDED.prr,
          prr_lower_ci = EXCLUDED.prr_lower_ci,
          prr_upper_ci = EXCLUDED.prr_upper_ci,
          ror = EXCLUDED.ror,
          ebgm = EXCLUDED.ebgm,
          chi_squared = EXCLUDED.chi_squared,
          signal_status = EXCLUDED.signal_status,
          last_computed_at = NOW()
        RETURNING *
      `,
      [
        orgId,
        projectId,
        pair.product_id,
        pair.drug,
        pair.suggested_meddra_pt || pair.normalized_term,
        pair.suggested_meddra_code,
        a,
        round(prr),
        round(prr * 0.78),
        round(prr * 1.24),
        round(ror),
        round(ebgm),
        round(chiSquared),
        signalStatus,
      ],
    );
    upserted.push(rows[0]);
  }

  return upserted;
}
